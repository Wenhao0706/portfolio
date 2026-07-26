import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { logGate, logHoneypot } from '../gate-log'

describe('logGate', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('prefixes every line so logs can be filtered in Vercel', () => {
    logGate('ratelimit', 'blocked')
    expect(console.warn).toHaveBeenCalledWith('[contact-gate] ratelimit blocked')
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

describe('logHoneypot', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs a honeypot hit', () => {
    logHoneypot()
    expect(console.warn).toHaveBeenCalledWith('[contact-honeypot] blocked')
  })

  // This is the whole point of the separate function: bots can trigger the honeypot
  // without limit, so its output must never land on the prefix you grep to find a
  // silently-broken gate.
  it('does NOT use the [contact-gate] prefix, so unlimited bot volume cannot bury degraded lines', () => {
    logHoneypot()
    const line = vi.mocked(console.warn).mock.calls[0][0] as string
    expect(line).not.toContain('[contact-gate]')
  })
})
