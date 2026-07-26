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

import { validateContactInput } from '@/lib/contact/validate'
import { verifyRecaptcha } from '@/lib/contact/recaptcha'
import { sendContactEmail } from '@/lib/contact/mailer'
import { isBot } from '@/lib/contact/honeypot'
import { submitContactForm } from '../actions'
import { initialContactFormState } from '@/lib/contact/state'

function formDataWith(fields: Record<string, string>) {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) fd.set(key, value)
  return fd
}

describe('submitContactForm', () => {
  beforeEach(() => {
    vi.mocked(validateContactInput).mockReturnValue(null)
    vi.mocked(verifyRecaptcha).mockResolvedValue(true)
    vi.mocked(sendContactEmail).mockResolvedValue(undefined)
    vi.mocked(isBot).mockReturnValue(false)
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
    // This file's beforeEach does not clear mock call history, so earlier tests in this
    // describe block leave stale calls on these mocks. Clear before measuring so the counts
    // below reflect only this test.
    vi.mocked(sendContactEmail).mockClear()

    // Capture the genuine success state FIRST, while isBot is still false. Comparing
    // two trapped calls would pass trivially and prove nothing.
    const realSuccess = await submitContactForm(
      initialContactFormState,
      formDataWith({ name: 'Jane', email: 'jane@example.com', message: 'hi', recaptchaToken: 'tok' })
    )
    expect(sendContactEmail).toHaveBeenCalledTimes(1)

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
    // Same stale-call-history caveat as above: clear before the short-circuit assertions.
    vi.mocked(validateContactInput).mockClear()
    vi.mocked(verifyRecaptcha).mockClear()
    vi.mocked(sendContactEmail).mockClear()
    vi.mocked(isBot).mockReturnValue(true)

    await submitContactForm(
      initialContactFormState,
      formDataWith({ name: 'Jane', email: 'jane@example.com', message: 'hi', company: 'Acme' })
    )

    expect(validateContactInput).not.toHaveBeenCalled()
    expect(verifyRecaptcha).not.toHaveBeenCalled()
    expect(sendContactEmail).not.toHaveBeenCalled()
  })
})
