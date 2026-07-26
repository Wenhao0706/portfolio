'use server'

import { validateContactInput } from '@/lib/contact/validate'
import { verifyRecaptcha } from '@/lib/contact/recaptcha'
import { sendContactEmail } from '@/lib/contact/mailer'
import { isBot } from '@/lib/contact/honeypot'
import { logGate } from '@/lib/contact/gate-log'
import { headers } from 'next/headers'
import { checkRateLimit, clientIpFromForwardedFor } from '@/lib/contact/ratelimit'
import { verifyEmailDeliverability } from '@/lib/contact/email-verify'
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

  // Gate 3: token presence. A free local check, so it must stay AHEAD of both network
  // gates. Behind them, a visitor whose ad blocker kills the reCAPTCHA script (token is
  // '' — see the known gap in tasks/portfolio/contact-form/current.md) would burn a
  // rate-limit slot and fire a live MX lookup per attempt, then be told "you've sent a
  // few messages already" having sent none. A token-less bot is rejected either way.
  if (!token) {
    return { status: 'error', message: "Couldn't verify you're not a bot. Please try again." }
  }

  // Gate 4: per-IP rate limit. After validation so honest empty-field mistakes don't
  // consume the budget. A Server Action has no request object, so the IP comes from
  // the async headers() store.
  const headerList = await headers()
  const ip = clientIpFromForwardedFor(headerList.get('x-forwarded-for'))
  const rateLimit = await checkRateLimit(ip)
  if (rateLimit.degraded) {
    // The reason comes from the gate itself. Deriving it here from `ip` was wrong once a
    // third cause (never configured) existed, and would silently mislabel the next one.
    logGate('ratelimit', 'degraded', rateLimit.reason ?? 'unknown')
  }
  if (!rateLimit.ok) {
    logGate('ratelimit', 'blocked')
    return {
      status: 'error',
      message: "You've sent a few messages already. Please try again in a little while.",
    }
  }

  // Gate 5: MX + disposable check. Catches typo domains (gmial.com) as much as throwaway
  // providers — a mistyped address would never receive the confirmation email anyway.
  const deliverability = await verifyEmailDeliverability(email)
  if (deliverability.degraded) {
    logGate('email-verify', 'degraded', 'deliverability check unavailable')
  }
  if (!deliverability.ok) {
    logGate('email-verify', 'blocked', deliverability.reason)
    return {
      status: 'error',
      message:
        deliverability.reason === 'disposable'
          ? 'Please use a permanent email address so I can reply.'
          : "That email address doesn't look reachable. Please check it and try again.",
    }
  }

  // Gate 6: reCAPTCHA score verification.
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
