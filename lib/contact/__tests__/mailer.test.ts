import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import nodemailer from 'nodemailer'

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(),
  },
}))

import { sendContactEmail } from '../mailer'

describe('sendContactEmail', () => {
  const sendMail = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    process.env.GMAIL_USER = 'me@gmail.com'
    process.env.GMAIL_APP_PASSWORD = 'app-password'
    process.env.CONTACT_TO_EMAIL = 'me@gmail.com'
    sendMail.mockClear()
    vi.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as never)
  })

  afterEach(() => {
    delete process.env.GMAIL_USER
    delete process.env.GMAIL_APP_PASSWORD
    delete process.env.CONTACT_TO_EMAIL
  })

  it('sends mail with the visitor set as replyTo', async () => {
    await sendContactEmail({ name: 'Jane', email: 'jane@example.com', message: 'Hi there' })

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'me@gmail.com',
        replyTo: 'jane@example.com',
        subject: 'Portfolio contact from Jane',
        text: 'Hi there',
      })
    )
  })

  it('throws when GMAIL_USER is not set', async () => {
    delete process.env.GMAIL_USER
    await expect(
      sendContactEmail({ name: 'Jane', email: 'jane@example.com', message: 'Hi there' })
    ).rejects.toThrow()
  })
})
