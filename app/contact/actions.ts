'use server'

import { validateContactInput } from '@/lib/contact/validate'
import { verifyRecaptcha } from '@/lib/contact/recaptcha'
import { sendContactEmail } from '@/lib/contact/mailer'
import { isBot } from '@/lib/contact/honeypot'
import { logGate } from '@/lib/contact/gate-log'
import type { ContactFormState } from '@/lib/contact/state'

const SUCCESS_STATE: ContactFormState = {
  status: 'success',
  message: "Thanks — I'll get back to you soon.",
}

export async function submitContactForm(
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  // Gate 1: honeypot. Returns a fake success — an error would teach the bot the trap exists.
  // The log line is the ONLY way to know the trap ever fired, since the caller sees success.
  if (isBot(formData)) {
    logGate('honeypot', 'blocked')
    return SUCCESS_STATE
  }

  const name = String(formData.get('name') ?? '')
  const email = String(formData.get('email') ?? '')
  const message = String(formData.get('message') ?? '')
  const token = String(formData.get('recaptchaToken') ?? '')

  const validationError = validateContactInput({ name, email, message })
  if (validationError) {
    return { status: 'error', message: validationError }
  }

  if (!token) {
    return { status: 'error', message: "Couldn't verify you're not a bot. Please try again." }
  }

  let recaptchaOk: boolean
  try {
    recaptchaOk = await verifyRecaptcha(token)
  } catch {
    return { status: 'error', message: 'Could not verify you\'re not a bot right now. Please try again shortly.' }
  }
  if (!recaptchaOk) {
    return { status: 'error', message: "Couldn't verify you're not a bot. Please try again." }
  }

  try {
    await sendContactEmail({ name, email, message })
  } catch {
    return { status: 'error', message: 'Could not send your message right now. Please try again later.' }
  }

  return SUCCESS_STATE
}
