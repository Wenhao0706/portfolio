import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const { limitMock, fromEnvMock } = vi.hoisted(() => ({
  limitMock: vi.fn(),
  fromEnvMock: vi.fn(),
}))

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: Object.assign(
    vi.fn(function () {
      return { limit: limitMock }
    }),
    { slidingWindow: vi.fn(() => 'sliding-window-limiter') }
  ),
}))
vi.mock('@upstash/redis', () => ({
  Redis: { fromEnv: fromEnvMock },
}))

import { checkRateLimit, clientIpFromForwardedFor } from '../ratelimit'

describe('clientIpFromForwardedFor', () => {
  it('takes the first entry of a comma-separated chain', () => {
    expect(clientIpFromForwardedFor('203.0.113.1, 70.41.3.18')).toBe('203.0.113.1')
  })

  it('trims surrounding whitespace', () => {
    expect(clientIpFromForwardedFor('  203.0.113.1  ')).toBe('203.0.113.1')
  })

  it('returns an empty string when the header is missing', () => {
    expect(clientIpFromForwardedFor(null)).toBe('')
  })

  it('returns an empty string when the header is empty', () => {
    expect(clientIpFromForwardedFor('')).toBe('')
  })
})

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
    fromEnvMock.mockReturnValue({})
  })

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    delete process.env.KV_REST_API_URL
    delete process.env.KV_REST_API_TOKEN
  })

  it('allows a request under the limit, and does not mark it degraded', async () => {
    limitMock.mockResolvedValue({ success: true })
    await expect(checkRateLimit('203.0.113.1')).resolves.toEqual({ ok: true, degraded: false })
  })

  it('blocks a request over the limit', async () => {
    limitMock.mockResolvedValue({ success: false })
    await expect(checkRateLimit('203.0.113.1')).resolves.toEqual({ ok: false, degraded: false })
  })

  it('fails open AND flags degraded when the Redis client throws', async () => {
    limitMock.mockRejectedValue(new Error('Redis unreachable'))
    await expect(checkRateLimit('203.0.113.1')).resolves.toEqual({
      ok: true,
      degraded: true,
      reason: 'unavailable',
    })
  })

  // Regression guard for the silent fail-open. @upstash/ratelimit defaults timeout: 5000 and
  // its applyTimeout RESOLVES with { success: true, reason: 'timeout' } rather than rejecting,
  // so reading `success` alone reports a clean pass while the gate is doing nothing.
  it('fails open AND flags degraded when the Upstash call times out (success:true, reason:timeout)', async () => {
    limitMock.mockResolvedValue({
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
      reason: 'timeout',
    })
    await expect(checkRateLimit('203.0.113.1')).resolves.toEqual({
      ok: true,
      degraded: true,
      reason: 'timeout',
    })
  })

  // The timeout fix must not swallow the two other RatelimitResponseType values, which are
  // genuine blocks and arrive with success: false.
  it.each(['cacheBlock', 'denyList'] as const)(
    'still reports a genuine block, not degraded, when reason is %s',
    async (reason) => {
      limitMock.mockResolvedValue({ success: false, reason })
      await expect(checkRateLimit('203.0.113.1')).resolves.toEqual({ ok: false, degraded: false })
    }
  )

  // Redis.fromEnv() does NOT throw on missing env vars — it warns and returns a client with
  // url: undefined, whose first .limit() call burns ~4.3s in fetch retries before failing.
  // The gate must never construct it, so this asserts the short-circuit, not a thrown error.
  it('fails open with reason "not-configured" without touching Upstash when env vars are missing', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    await expect(checkRateLimit('203.0.113.1')).resolves.toEqual({
      ok: true,
      degraded: true,
      reason: 'not-configured',
    })
    expect(limitMock).not.toHaveBeenCalled()
    expect(fromEnvMock).not.toHaveBeenCalled()
  })

  it('treats a URL without a token as not configured', async () => {
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    await expect(checkRateLimit('203.0.113.1')).resolves.toEqual({
      ok: true,
      degraded: true,
      reason: 'not-configured',
    })
    expect(limitMock).not.toHaveBeenCalled()
  })

  // fromEnv falls back to the Vercel KV aliases, so those count as configured too.
  it('accepts the Vercel KV env var aliases as configured', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    process.env.KV_REST_API_URL = 'https://example.upstash.io'
    process.env.KV_REST_API_TOKEN = 'test-token'
    limitMock.mockResolvedValue({ success: true })
    await expect(checkRateLimit('203.0.113.1')).resolves.toEqual({ ok: true, degraded: false })
    expect(limitMock).toHaveBeenCalledWith('203.0.113.1')
  })

  it('fails open AND flags degraded when the IP is unknown', async () => {
    await expect(checkRateLimit('')).resolves.toEqual({
      ok: true,
      degraded: true,
      reason: 'no-ip',
    })
    expect(limitMock).not.toHaveBeenCalled()
  })

  it('keys the limit on the IP address', async () => {
    limitMock.mockResolvedValue({ success: true })
    await checkRateLimit('203.0.113.1')
    expect(limitMock).toHaveBeenCalledWith('203.0.113.1')
  })
})
