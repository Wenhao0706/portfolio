import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { logGate } from '../gate-log'

describe('logGate', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('prefixes every line so logs can be filtered in Vercel', () => {
    logGate('honeypot', 'blocked')
    expect(console.warn).toHaveBeenCalledWith('[contact-gate] honeypot blocked')
  })

  it('appends the detail when one is given', () => {
    logGate('ratelimit', 'degraded', 'redis unreachable')
    expect(console.warn).toHaveBeenCalledWith('[contact-gate] ratelimit degraded (redis unreachable)')
  })

  it('distinguishes a blocked outcome from a degraded one', () => {
    logGate('email-verify', 'blocked', 'mx')
    logGate('email-verify', 'degraded', 'dns timeout')
    expect(console.warn).toHaveBeenNthCalledWith(1, '[contact-gate] email-verify blocked (mx)')
    expect(console.warn).toHaveBeenNthCalledWith(2, '[contact-gate] email-verify degraded (dns timeout)')
  })
})
