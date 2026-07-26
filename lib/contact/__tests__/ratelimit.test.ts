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
    await expect(checkRateLimit('203.0.113.1')).resolves.toEqual({ ok: true, degraded: true })
  })

  it('fails open AND flags degraded when Redis.fromEnv throws because env vars are missing', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    fromEnvMock.mockImplementation(() => {
      throw new Error('missing env')
    })
    await expect(checkRateLimit('203.0.113.1')).resolves.toEqual({ ok: true, degraded: true })
  })

  it('fails open AND flags degraded when the IP is unknown', async () => {
    await expect(checkRateLimit('')).resolves.toEqual({ ok: true, degraded: true })
    expect(limitMock).not.toHaveBeenCalled()
  })

  it('keys the limit on the IP address', async () => {
    limitMock.mockResolvedValue({ success: true })
    await checkRateLimit('203.0.113.1')
    expect(limitMock).toHaveBeenCalledWith('203.0.113.1')
  })
})
