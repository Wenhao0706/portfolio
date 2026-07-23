import nodemailer from 'nodemailer'
import type { ContactInput } from './validate'

export async function sendContactEmail(input: ContactInput): Promise<void> {
  const { GMAIL_USER, GMAIL_APP_PASSWORD, CONTACT_TO_EMAIL } = process.env
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD || !CONTACT_TO_EMAIL) {
    throw new Error(
      'Email is not configured (missing GMAIL_USER, GMAIL_APP_PASSWORD, or CONTACT_TO_EMAIL)'
    )
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  })

  await transporter.sendMail({
    from: `"Man Hou" <${GMAIL_USER}>`,
    to: input.email,
    cc: CONTACT_TO_EMAIL,
    replyTo: input.email,
    subject: `Thanks for reaching out, ${input.name} — Man Hou's Portfolio`,
    text: `Hi ${input.name},\n\nThanks for reaching out through my portfolio! I've received your message and will get back to you soon.\n\nFor your records, here's what you sent:\n\n"${input.message}"\n\nBest,\nMan Hou`,
  })
}
