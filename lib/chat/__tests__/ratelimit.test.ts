import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const { limitMock, fromEnvMock } = vi.hoisted(() => ({
  limitMock: vi.fn(),
  fromEnvMock: vi.fn(),
}))

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: Object.assign(
    // A `function` expression, not an arrow: this is called with `new`, and an arrow can
    // never be a constructor. See AGENTS.md.
    vi.fn(function () {
      return { limit: limitMock }
    }),
    { slidingWindow: vi.fn(() => 'sliding-window-limiter') }
  ),
}))
vi.mock('@upstash/redis', () => ({
  Redis: { fromEnv: fromEnvMock },
}))

import {
  checkChatRateLimit,
  maskIp,
  CHAT_BURST_MAX,
  CHAT_DAILY_MAX,
  CHAT_GLOBAL_DAILY_MAX,
} from '../ratelimit'

const pass = { success: true, reason: undefined, reset: 0 }
const block = (resetInMs: number) => ({
  success: false,
  reason: undefined,
  reset: Date.now() + resetInMs,
})

describe('checkChatRateLimit', () => {
  beforeEach(() => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.io')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token')
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    limitMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('passes when all three tiers pass', async () => {
    limitMock.mockResolvedValue(pass)
    await expect(checkChatRateLimit('203.0.113.1')).resolves.toEqual({ ok: true, degraded: false })
    expect(limitMock).toHaveBeenCalledTimes(3)
  })

  it('keys the three tiers separately, with the global one shared', async () => {
    limitMock.mockResolvedValue(pass)
    await checkChatRateLimit('203.0.113.1')

    expect(limitMock.mock.calls.map((c) => c[0])).toEqual([
      'chat:burst:203.0.113.1',
      'chat:day:203.0.113.1',
      'chat:global:day',
    ])
  })

  it('prefixes every per-IP key with chat:, so it cannot collide with the contact form', async () => {
    limitMock.mockResolvedValue(pass)
    await checkChatRateLimit('203.0.113.1')
    for (const [key] of limitMock.mock.calls) {
      expect(key).toMatch(/^chat:/)
    }
  })

  describe('tier order', () => {
    // Load-bearing: each .limit() call CONSUMES a slot, so a visitor being refused for
    // hammering must not spend the global budget on the way to being refused.
    it('does not touch the daily or global tiers when burst blocks', async () => {
      limitMock.mockResolvedValueOnce(block(60_000))
      const result = await checkChatRateLimit('203.0.113.1')

      expect(result.ok).toBe(false)
      expect(result.scope).toBe('burst')
      expect(limitMock).toHaveBeenCalledTimes(1)
    })

    it('does not touch the global tier when the per-IP daily blocks', async () => {
      limitMock.mockResolvedValueOnce(pass).mockResolvedValueOnce(block(3_600_000))
      const result = await checkChatRateLimit('203.0.113.1')

      expect(result.ok).toBe(false)
      expect(result.scope).toBe('daily')
      expect(limitMock).toHaveBeenCalledTimes(2)
    })

    it('blocks on the global tier after both per-IP tiers pass', async () => {
      limitMock
        .mockResolvedValueOnce(pass)
        .mockResolvedValueOnce(pass)
        .mockResolvedValueOnce(block(7_200_000))
      const result = await checkChatRateLimit('203.0.113.1')

      expect(result.ok).toBe(false)
      expect(result.scope).toBe('global')
      expect(limitMock).toHaveBeenCalledTimes(3)
    })
  })

  it('reports the seconds until a slot frees on a genuine block', async () => {
    limitMock.mockResolvedValueOnce(block(120_000))
    const result = await checkChatRateLimit('203.0.113.1')
    expect(result.retryAfterSeconds).toBeGreaterThan(110)
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(120)
  })

  it('omits the wait when reset is in the past rather than reporting 1970', async () => {
    limitMock.mockResolvedValueOnce({ success: false, reason: undefined, reset: 0 })
    const result = await checkChatRateLimit('203.0.113.1')
    expect(result.ok).toBe(false)
    expect(result.retryAfterSeconds).toBeUndefined()
  })

  describe('localhost exemption', () => {
    it.each(['::1', '127.0.0.1', '::ffff:127.0.0.1'])(
      'skips the limiter entirely for loopback %s',
      async (ip) => {
        await expect(checkChatRateLimit(ip)).resolves.toEqual({ ok: true, degraded: false })
        // Not merely allowed — no tier is consulted, so local testing never spends the
        // shared global budget that real visitors draw from.
        expect(limitMock).not.toHaveBeenCalled()
      }
    )

    it('is NOT degraded, since nothing is broken and there is nothing to alert on', async () => {
      const result = await checkChatRateLimit('::1')
      expect(result.degraded).toBe(false)
      expect(result.reason).toBeUndefined()
    })

    it('holds even when Upstash IS configured, so prod-like local config stays free', async () => {
      limitMock.mockResolvedValue(pass)
      await checkChatRateLimit('127.0.0.1')
      expect(limitMock).not.toHaveBeenCalled()
    })

    // The important half. A reverse proxy forwarding a loopback address is an ordinary
    // misconfiguration; it must stay a misconfiguration rather than a site-wide bypass.
    it('does NOT exempt loopback in production', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      limitMock.mockResolvedValue(pass)

      await checkChatRateLimit('127.0.0.1')
      expect(limitMock).toHaveBeenCalledTimes(3)
    })

    it('never exempts a real public address', async () => {
      limitMock.mockResolvedValue(pass)
      await checkChatRateLimit('203.0.113.1')
      expect(limitMock).toHaveBeenCalledTimes(3)
    })
  })

  describe('failing open', () => {
    it('passes without an IP', async () => {
      await expect(checkChatRateLimit('')).resolves.toEqual({
        ok: true,
        degraded: true,
        reason: 'no-ip',
      })
      expect(limitMock).not.toHaveBeenCalled()
    })

    it('passes when Upstash is not configured, without a dead round trip', async () => {
      vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
      vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
      vi.stubEnv('KV_REST_API_URL', '')
      vi.stubEnv('KV_REST_API_TOKEN', '')

      await expect(checkChatRateLimit('203.0.113.1')).resolves.toEqual({
        ok: true,
        degraded: true,
        reason: 'not-configured',
      })
      expect(limitMock).not.toHaveBeenCalled()
    })

    // The silent fail-open `degraded` exists to catch: applyTimeout RESOLVES with
    // success:true rather than rejecting, so reading only `success` reports a healthy pass.
    it('marks an Upstash timeout as degraded rather than a clean pass', async () => {
      limitMock.mockResolvedValueOnce({ success: true, reason: 'timeout', reset: 0 })
      const result = await checkChatRateLimit('203.0.113.1')

      expect(result).toEqual({ ok: true, degraded: true, reason: 'timeout', scope: 'burst' })
    })

    it('marks a thrown Upstash error as degraded', async () => {
      limitMock.mockRejectedValueOnce(new Error('ECONNREFUSED'))
      const result = await checkChatRateLimit('203.0.113.1')

      expect(result).toEqual({ ok: true, degraded: true, reason: 'unavailable', scope: 'burst' })
    })

    it('stops the tier walk once one tier degrades', async () => {
      limitMock.mockRejectedValueOnce(new Error('ECONNREFUSED'))
      await checkChatRateLimit('203.0.113.1')
      expect(limitMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('configured ceilings', () => {
    it('caps one visitor well below what the burst window alone would allow', () => {
      // The whole reason the daily tier exists: 20 per 10 min is ~2,880/day unchecked.
      const burstOnlyPerDay = CHAT_BURST_MAX * 6 * 24
      expect(CHAT_DAILY_MAX).toBeLessThan(burstOnlyPerDay)
    })

    it('bounds total daily spend above a single visitor but below runaway', () => {
      expect(CHAT_GLOBAL_DAILY_MAX).toBeGreaterThan(CHAT_DAILY_MAX)
    })
  })
})

describe('maskIp', () => {
  it('drops the final octet of an IPv4 address', () => {
    expect(maskIp('203.0.113.45')).toBe('203.0.113.x')
  })

  it('keeps the routing prefix of an IPv6 address and drops the interface half', () => {
    expect(maskIp('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe('2001:0db8:85a3::x')
  })

  it('handles IPv6 loopback without producing an empty label', () => {
    expect(maskIp('::1')).toBe('1::x')
  })

  it.each([[''], ['not-an-ip'], ['1.2.3'], ['1.2.3.4.5']])('returns unknown for %p', (value) => {
    expect(maskIp(value)).toBe('unknown')
  })

  // The whole point: what gets rendered must never be the full address.
  it('never returns the input unchanged for a valid address', () => {
    const ip = '203.0.113.45'
    expect(maskIp(ip)).not.toBe(ip)
    expect(maskIp(ip)).not.toContain('45')
  })
})
