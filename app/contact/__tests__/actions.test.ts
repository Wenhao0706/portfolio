import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/contact/validate', () => ({
  validateContactInput: vi.fn(),
}))
vi.mock('@/lib/contact/recaptcha', () => ({
  verifyRecaptcha: vi.fn(),
}))
vi.mock('@/lib/contact/mailer', () => ({
  sendContactEmail: vi.fn(),
}))
vi.mock('@/lib/contact/honeypot', () => ({
  HONEYPOT_FIELD: 'company',
  isBot: vi.fn(),
}))
vi.mock('next/headers', () => ({
  headers: vi.fn(),
}))
vi.mock('@/lib/contact/ratelimit', () => ({
  checkRateLimit: vi.fn(),
  clientIpFromForwardedFor: vi.fn(),
}))
vi.mock('@/lib/contact/gate-log', () => ({
  logGate: vi.fn(),
}))
vi.mock('@/lib/contact/email-verify', () => ({
  verifyEmailDeliverability: vi.fn(),
}))

import { validateContactInput } from '@/lib/contact/validate'
import { verifyRecaptcha } from '@/lib/contact/recaptcha'
import { sendContactEmail } from '@/lib/contact/mailer'
import { isBot } from '@/lib/contact/honeypot'
import { headers } from 'next/headers'
import { checkRateLimit, clientIpFromForwardedFor } from '@/lib/contact/ratelimit'
import { logGate } from '@/lib/contact/gate-log'
import { verifyEmailDeliverability } from '@/lib/contact/email-verify'
import { submitContactForm } from '../actions'
import { initialContactFormState } from '@/lib/contact/state'

function formDataWith(fields: Record<string, string>) {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) fd.set(key, value)
  return fd
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

    const result = await submitContactForm(
      initialContactFormState,
      formDataWith({ name: '', email: 'jane@example.com', message: 'hi', recaptchaToken: 'tok' })
    )

    expect(result).toEqual({ status: 'error', message: 'Please enter your name.' })
    expect(verifyRecaptcha).not.toHaveBeenCalled()
    expect(sendContactEmail).not.toHaveBeenCalled()
  })

  it('returns an error when the recaptcha token is missing', async () => {
    const result = await submitContactForm(
      initialContactFormState,
      formDataWith({ name: 'Jane', email: 'jane@example.com', message: 'hi', recaptchaToken: '' })
    )

    expect(result.status).toBe('error')
    expect(verifyRecaptcha).not.toHaveBeenCalled()
    expect(sendContactEmail).not.toHaveBeenCalled()
  })

  it('returns an error when recaptcha verification fails', async () => {
    vi.mocked(verifyRecaptcha).mockResolvedValue(false)

    const result = await submitContactForm(
      initialContactFormState,
      formDataWith({ name: 'Jane', email: 'jane@example.com', message: 'hi', recaptchaToken: 'tok' })
    )

    expect(result.status).toBe('error')
    expect(sendContactEmail).not.toHaveBeenCalled()
  })

  it('returns an error when sending the email throws', async () => {
    vi.mocked(sendContactEmail).mockRejectedValue(new Error('SMTP down'))

    const result = await submitContactForm(
      initialContactFormState,
      formDataWith({ name: 'Jane', email: 'jane@example.com', message: 'hi', recaptchaToken: 'tok' })
    )

    expect(result.status).toBe('error')
  })

  it('returns success when everything passes', async () => {
    const result = await submitContactForm(
      initialContactFormState,
      formDataWith({ name: 'Jane', email: 'jane@example.com', message: 'hi', recaptchaToken: 'tok' })
    )

    expect(result.status).toBe('success')
    expect(sendContactEmail).toHaveBeenCalledWith({
      name: 'Jane',
      email: 'jane@example.com',
      message: 'hi',
    })
  })

  it('returns a success state identical to a real send, and sends nothing, when the honeypot is tripped', async () => {
    // Capture the genuine success state FIRST, while isBot is still false. Comparing
    // two trapped calls would pass trivially and prove nothing.
    const realSuccess = await submitContactForm(
      initialContactFormState,
      formDataWith({ name: 'Jane', email: 'jane@example.com', message: 'hi', recaptchaToken: 'tok' })
    )
    expect(sendContactEmail).toHaveBeenCalledTimes(1)

    // Load-bearing: resets the call count recorded by the real send above so the
    // `not.toHaveBeenCalled()` check below measures only the trapped call, not both.
    // The shared beforeEach only runs once per test, not between these two calls.
    vi.mocked(sendContactEmail).mockClear()
    vi.mocked(isBot).mockReturnValue(true)

    const trapped = await submitContactForm(
      initialContactFormState,
      formDataWith({
        name: 'Jane',
        email: 'jane@example.com',
        message: 'hi',
        company: 'Acme Corp',
        recaptchaToken: 'tok',
      })
    )

    expect(trapped).toEqual(realSuccess)
    expect(trapped.status).toBe('success')
    expect(sendContactEmail).not.toHaveBeenCalled()
  })

  it('skips validation, recaptcha and the mailer entirely when the honeypot is tripped', async () => {
    vi.mocked(isBot).mockReturnValue(true)

    await submitContactForm(
      initialContactFormState,
      formDataWith({ name: 'Jane', email: 'jane@example.com', message: 'hi', company: 'Acme' })
    )

    expect(validateContactInput).not.toHaveBeenCalled()
    expect(verifyRecaptcha).not.toHaveBeenCalled()
    expect(sendContactEmail).not.toHaveBeenCalled()
  })

  it('returns an error and never reaches recaptcha or the mailer when rate limited', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ ok: false, degraded: false })

    const result = await submitContactForm(
      initialContactFormState,
      formDataWith({ name: 'Jane', email: 'jane@example.com', message: 'hi', recaptchaToken: 'tok' })
    )

    expect(result.status).toBe('error')
    expect(verifyRecaptcha).not.toHaveBeenCalled()
    expect(sendContactEmail).not.toHaveBeenCalled()
  })

  it('checks the rate limit only after validation passes', async () => {
    vi.mocked(validateContactInput).mockReturnValue('Please enter your name.')

    await submitContactForm(
      initialContactFormState,
      formDataWith({ name: '', email: 'jane@example.com', message: 'hi', recaptchaToken: 'tok' })
    )

    expect(checkRateLimit).not.toHaveBeenCalled()
  })

  it('logs a degraded warning when the rate limit let the request through on a failure', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ ok: true, degraded: true })

    const result = await submitContactForm(
      initialContactFormState,
      formDataWith({ name: 'Jane', email: 'jane@example.com', message: 'hi', recaptchaToken: 'tok' })
    )

    // Degraded must NOT block the visitor, but must leave a trace.
    expect(result.status).toBe('success')
    expect(logGate).toHaveBeenCalledWith('ratelimit', 'degraded', expect.any(String))
  })

  it('logs nothing for the rate limit on a clean pass', async () => {
    await submitContactForm(
      initialContactFormState,
      formDataWith({ name: 'Jane', email: 'jane@example.com', message: 'hi', recaptchaToken: 'tok' })
    )

    // A fully clean submission passes every gate, so nothing should be logged at all.
    // Asserting on argument shapes here would silently miss a single-argument call.
    expect(logGate).not.toHaveBeenCalled()
  })

  it('returns an error and never reaches recaptcha when the address is undeliverable', async () => {
    vi.mocked(verifyEmailDeliverability).mockResolvedValue({ ok: false, reason: 'mx', degraded: false })

    const result = await submitContactForm(
      initialContactFormState,
      formDataWith({ name: 'Jane', email: 'jane@gmial.com', message: 'hi', recaptchaToken: 'tok' })
    )

    expect(result.status).toBe('error')
    expect(verifyRecaptcha).not.toHaveBeenCalled()
    expect(sendContactEmail).not.toHaveBeenCalled()
  })

  it('gives a disposable address its own distinct message', async () => {
    vi.mocked(verifyEmailDeliverability).mockResolvedValue({ ok: false, reason: 'disposable', degraded: false })

    const result = await submitContactForm(
      initialContactFormState,
      formDataWith({ name: 'Jane', email: 'j@mailinator.com', message: 'hi', recaptchaToken: 'tok' })
    )

    expect(result.message).toMatch(/permanent email address/i)
  })

  it('checks deliverability only after the rate limit passes', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ ok: false, degraded: false })

    await submitContactForm(
      initialContactFormState,
      formDataWith({ name: 'Jane', email: 'jane@example.com', message: 'hi', recaptchaToken: 'tok' })
    )

    expect(verifyEmailDeliverability).not.toHaveBeenCalled()
  })

  it('logs degraded and still proceeds when the deliverability check is unavailable', async () => {
    vi.mocked(verifyEmailDeliverability).mockResolvedValue({ ok: true, degraded: true })

    const result = await submitContactForm(
      initialContactFormState,
      formDataWith({ name: 'Jane', email: 'jane@example.com', message: 'hi', recaptchaToken: 'tok' })
    )

    expect(logGate).toHaveBeenCalledWith('email-verify', 'degraded', 'deliverability check unavailable')
    expect(sendContactEmail).toHaveBeenCalled()
    expect(result.status).toBe('success')
  })
})
