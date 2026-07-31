import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/contact/validate', () => ({
  validateContactInput: vi.fn(),
  // Real behaviour, not a pass-through stub: the point of the test below is that the value
  // reaching the mailer went THROUGH the sanitiser, which an identity mock cannot show.
  sanitizeName: vi.fn((name: string) =>
    name.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim()
  ),
}))
vi.mock('@/lib/contact/recaptcha', () => ({
  verifyRecaptcha: vi.fn(),
}))
vi.mock('@/lib/contact/mailer', () => ({
  sendContactEmail: vi.fn(),
}))
vi.mock('@/lib/contact/honeypot', () => ({
  HONEYPOT_FIELD: 'ref-token',
  isBot: vi.fn(),
}))
vi.mock('next/headers', () => ({
  headers: vi.fn(),
}))
vi.mock('@/lib/contact/ratelimit', () => ({
  checkRateLimit: vi.fn(),
  clientIpFromForwardedFor: vi.fn(),
  // Sentinel rather than a re-implementation: this file asserts that the action asks the
  // formatter and puts its answer in the message, not how the formatter words things —
  // that is ratelimit.test.ts's job.
  formatRetryAfter: vi.fn(() => 'about 7 minutes'),
}))
vi.mock('@/lib/contact/gate-log', () => ({
  logGate: vi.fn(),
  logHoneypot: vi.fn(),
}))
vi.mock('@/lib/contact/email-verify', () => ({
  verifyEmailDeliverability: vi.fn(),
}))

import { validateContactInput } from '@/lib/contact/validate'
import { verifyRecaptcha } from '@/lib/contact/recaptcha'
import { sendContactEmail } from '@/lib/contact/mailer'
import { isBot } from '@/lib/contact/honeypot'
import { headers } from 'next/headers'
import { checkRateLimit, clientIpFromForwardedFor, formatRetryAfter } from '@/lib/contact/ratelimit'
import { logGate, logHoneypot } from '@/lib/contact/gate-log'
import { verifyEmailDeliverability } from '@/lib/contact/email-verify'
import { submitContactForm } from '../actions'
import { initialContactFormState } from '@/lib/contact/state'

function formDataWith(fields: Record<string, string>) {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) fd.set(key, value)
  return fd
}

// Baseline of fields that clear every gate. Individual tests override only the field(s)
// under test, so a passing submission always reads the same everywhere else in this file.
function validFormData(overrides: Record<string, string> = {}) {
  return formDataWith({
    name: 'Jane',
    email: 'jane@example.com',
    message: 'hi',
    recaptchaToken: 'tok',
    ...overrides,
  })
}

describe('submitContactForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(validateContactInput).mockReturnValue(null)
    vi.mocked(verifyRecaptcha).mockResolvedValue(true)
    vi.mocked(sendContactEmail).mockResolvedValue(undefined)
    vi.mocked(isBot).mockReturnValue(false)
    vi.mocked(headers).mockResolvedValue({
      get: vi.fn(() => '203.0.113.1'),
    } as unknown as Awaited<ReturnType<typeof headers>>)
    vi.mocked(clientIpFromForwardedFor).mockReturnValue('203.0.113.1')
    vi.mocked(checkRateLimit).mockResolvedValue({ ok: true, degraded: false })
    vi.mocked(verifyEmailDeliverability).mockResolvedValue({ ok: true, degraded: false })
  })

  it('returns an error and skips recaptcha/email when validation fails', async () => {
    vi.mocked(validateContactInput).mockReturnValue('Please enter your name.')

    const result = await submitContactForm(initialContactFormState, validFormData({ name: '' }))

    expect(result).toEqual({ status: 'error', message: 'Please enter your name.' })
    expect(verifyRecaptcha).not.toHaveBeenCalled()
    expect(sendContactEmail).not.toHaveBeenCalled()
  })

  it('returns an error when the recaptcha token is missing', async () => {
    const result = await submitContactForm(initialContactFormState, validFormData({ recaptchaToken: '' }))

    expect(result.status).toBe('error')
    expect(verifyRecaptcha).not.toHaveBeenCalled()
    expect(sendContactEmail).not.toHaveBeenCalled()
  })

  // The token check is free and local, so it must short-circuit BEFORE both network gates.
  // Otherwise an ad-blocked visitor (token always '') burns a rate-limit slot and fires a
  // live MX lookup on every attempt, and is eventually rate-limited having sent nothing.
  it('rejects a missing token before spending the rate limit or the DNS lookup', async () => {
    await submitContactForm(initialContactFormState, validFormData({ recaptchaToken: '' }))

    expect(checkRateLimit).not.toHaveBeenCalled()
    expect(verifyEmailDeliverability).not.toHaveBeenCalled()
  })

  it('returns an error when recaptcha verification fails', async () => {
    vi.mocked(verifyRecaptcha).mockResolvedValue(false)

    const result = await submitContactForm(initialContactFormState, validFormData())

    expect(result.status).toBe('error')
    expect(sendContactEmail).not.toHaveBeenCalled()
  })

  it('returns an error when sending the email throws', async () => {
    vi.mocked(sendContactEmail).mockRejectedValue(new Error('SMTP down'))

    const result = await submitContactForm(initialContactFormState, validFormData())

    expect(result.status).toBe('error')
  })

  it('returns success when everything passes', async () => {
    const result = await submitContactForm(initialContactFormState, validFormData())

    expect(result.status).toBe('success')
    expect(sendContactEmail).toHaveBeenCalledWith({
      name: 'Jane',
      email: 'jane@example.com',
      message: 'hi',
    })
  })

  // The name reaches the SUBJECT header of the outgoing mail. Sanitising inside validate.ts
  // is worth nothing if the action then passes the RAW value to the mailer.
  it('sends the sanitised name, not the raw one', async () => {
    await submitContactForm(
      initialContactFormState,
      validFormData({ name: 'Jane\r\nBcc: attacker@evil.com' })
    )

    expect(sendContactEmail).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Jane Bcc: attacker@evil.com' })
    )
  })

  // Sanitising BEFORE validation is what makes a name of pure control characters collapse
  // to '' and fail the non-empty check, instead of passing it as invisible bytes.
  it('validates the sanitised name, so control characters cannot pass the non-empty check', async () => {
    await submitContactForm(initialContactFormState, validFormData({ name: '\u0000\u0007 ' }))

    expect(validateContactInput).toHaveBeenCalledWith(expect.objectContaining({ name: '' }))
  })

  it('returns a success state identical to a real send, and sends nothing, when the honeypot is tripped', async () => {
    // Capture the genuine success state FIRST, while isBot is still false. Comparing
    // two trapped calls would pass trivially and prove nothing.
    const realSuccess = await submitContactForm(initialContactFormState, validFormData())
    expect(sendContactEmail).toHaveBeenCalledTimes(1)

    // Load-bearing: resets the call count recorded by the real send above so the
    // `not.toHaveBeenCalled()` check below measures only the trapped call, not both.
    // The shared beforeEach only runs once per test, not between these two calls.
    vi.mocked(sendContactEmail).mockClear()
    vi.mocked(isBot).mockReturnValue(true)

    const trapped = await submitContactForm(
      initialContactFormState,
      validFormData({ 'ref-token': 'Acme Corp' })
    )

    expect(trapped).toEqual(realSuccess)
    expect(trapped.status).toBe('success')
    expect(sendContactEmail).not.toHaveBeenCalled()
  })

  it('skips validation, recaptcha and the mailer entirely when the honeypot is tripped', async () => {
    vi.mocked(isBot).mockReturnValue(true)

    await submitContactForm(
      initialContactFormState,
      formDataWith({ name: 'Jane', email: 'jane@example.com', message: 'hi', 'ref-token': 'Acme' })
    )

    expect(validateContactInput).not.toHaveBeenCalled()
    expect(verifyRecaptcha).not.toHaveBeenCalled()
    expect(sendContactEmail).not.toHaveBeenCalled()
  })

  it('logs a honeypot hit off the [contact-gate] channel, so bot volume cannot bury degraded lines', async () => {
    vi.mocked(isBot).mockReturnValue(true)

    await submitContactForm(
      initialContactFormState,
      formDataWith({ name: 'Jane', email: 'jane@example.com', message: 'hi', 'ref-token': 'Acme' })
    )

    expect(logHoneypot).toHaveBeenCalledTimes(1)
    expect(logGate).not.toHaveBeenCalled()
  })

  it('returns an error and never reaches recaptcha or the mailer when rate limited', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ ok: false, degraded: false })

    const result = await submitContactForm(initialContactFormState, validFormData())

    expect(result.status).toBe('error')
    expect(verifyRecaptcha).not.toHaveBeenCalled()
    expect(sendContactEmail).not.toHaveBeenCalled()
  })

  // The window is keyed on IP, so an office NAT shares one budget: the person being turned
  // away has usually sent nothing. Blaming "you" accuses them of someone else's traffic.
  it('blames the network rather than the sender, and names the wait', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      ok: false,
      degraded: false,
      retryAfterSeconds: 400,
    })

    const result = await submitContactForm(initialContactFormState, validFormData())

    expect(formatRetryAfter).toHaveBeenCalledWith(400)
    expect(result.message).toMatch(/your network/i)
    expect(result.message).toContain('about 7 minutes')
    expect(result.message).not.toMatch(/you've sent/i)
  })

  it('falls back to vague wording when the gate could not name a wait', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ ok: false, degraded: false })

    const result = await submitContactForm(initialContactFormState, validFormData())

    expect(formatRetryAfter).not.toHaveBeenCalled()
    expect(result.message).toMatch(/your network/i)
    expect(result.message).toMatch(/in a little while/i)
  })

  // The mailer sends the visitor a copy with their message quoted back, and nothing on the
  // page told them to expect it — so a confirmation email read as an unexplained bounce.
  it('tells the sender to expect the confirmation email', async () => {
    const result = await submitContactForm(initialContactFormState, validFormData())

    expect(result.status).toBe('success')
    expect(result.message).toMatch(/inbox/i)
  })

  it('checks the rate limit only after validation passes', async () => {
    vi.mocked(validateContactInput).mockReturnValue('Please enter your name.')

    await submitContactForm(initialContactFormState, validFormData({ name: '' }))

    expect(checkRateLimit).not.toHaveBeenCalled()
  })

  it('logs a degraded warning when the rate limit let the request through on a failure', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ ok: true, degraded: true, reason: 'unavailable' })

    const result = await submitContactForm(initialContactFormState, validFormData())

    // Degraded must NOT block the visitor, but must leave a trace.
    expect(result.status).toBe('success')
    expect(logGate).toHaveBeenCalledWith('ratelimit', 'degraded', expect.any(String))
  })

  // The detail used to be derived here as `ip ? 'upstash unavailable' : 'no client ip'`, which
  // could not express "never configured" — the actual production state. It now comes from the gate.
  it.each(['no-ip', 'not-configured', 'timeout', 'unavailable'] as const)(
    'logs the gate\'s own degraded reason verbatim (%s)',
    async (reason) => {
      vi.mocked(checkRateLimit).mockResolvedValue({ ok: true, degraded: true, reason })

      await submitContactForm(initialContactFormState, validFormData())

      expect(logGate).toHaveBeenCalledWith('ratelimit', 'degraded', reason)
    }
  )

  it('falls back to "unknown" rather than dropping the detail if degraded arrives with no reason', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ ok: true, degraded: true })

    await submitContactForm(initialContactFormState, validFormData())

    expect(logGate).toHaveBeenCalledWith('ratelimit', 'degraded', 'unknown')
  })

  it('logs nothing for the rate limit on a clean pass', async () => {
    await submitContactForm(initialContactFormState, validFormData())

    // A fully clean submission passes every gate, so nothing should be logged at all.
    // Asserting on argument shapes here would silently miss a single-argument call.
    expect(logGate).not.toHaveBeenCalled()
  })

  it('returns an error and never reaches recaptcha when the address is undeliverable', async () => {
    vi.mocked(verifyEmailDeliverability).mockResolvedValue({ ok: false, reason: 'mx', degraded: false })

    const result = await submitContactForm(
      initialContactFormState,
      validFormData({ email: 'jane@gmial.com' })
    )

    expect(result.status).toBe('error')
    expect(verifyRecaptcha).not.toHaveBeenCalled()
    expect(sendContactEmail).not.toHaveBeenCalled()
  })

  // Apple Hide My Email and SimpleLogin land in the disposable bucket too, so the copy has
  // to ask for a reachable address without implying the sender acted in bad faith.
  it('gives a disposable address its own distinct message, framed around reachability', async () => {
    vi.mocked(verifyEmailDeliverability).mockResolvedValue({ ok: false, reason: 'disposable', degraded: false })

    const result = await submitContactForm(
      initialContactFormState,
      validFormData({ email: 'j@mailinator.com' })
    )

    expect(result.message).toMatch(/temporary inbox/i)
    expect(result.message).not.toMatch(/mx|deliverable|reachable\./i)
  })

  it('checks deliverability only after the rate limit passes', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ ok: false, degraded: false })

    await submitContactForm(initialContactFormState, validFormData())

    expect(verifyEmailDeliverability).not.toHaveBeenCalled()
  })

  it('logs degraded and still proceeds when the deliverability check is unavailable', async () => {
    vi.mocked(verifyEmailDeliverability).mockResolvedValue({ ok: true, degraded: true, degradedReason: 'dns' })

    const result = await submitContactForm(initialContactFormState, validFormData())

    expect(logGate).toHaveBeenCalledWith('email-verify', 'degraded', 'dns')
    expect(sendContactEmail).toHaveBeenCalled()
    expect(result.status).toBe('success')
  })
})
