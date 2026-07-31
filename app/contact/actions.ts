'use server'

import { sanitizeName, validateContactInput } from '@/lib/contact/validate'
import { verifyRecaptcha } from '@/lib/contact/recaptcha'
import { sendContactEmail } from '@/lib/contact/mailer'
import { isBot } from '@/lib/contact/honeypot'
import { logGate, logHoneypot } from '@/lib/contact/gate-log'
import { headers } from 'next/headers'
import { checkRateLimit, clientIpFromForwardedFor, formatRetryAfter } from '@/lib/contact/ratelimit'
import { verifyEmailDeliverability } from '@/lib/contact/email-verify'
import type { ContactFormState } from '@/lib/contact/state'

/**
 * Frozen because it is module-scoped and returned BY REFERENCE from both the honeypot's
 * fake-success path and the real terminal path. Module scope is shared across requests on
 * a warm serverless instance, so a future `SUCCESS_STATE.message = ...` would leak across
 * every visitor on that instance. Freezing turns that silent cross-request bug into an
 * immediate error. The shared reference itself is deliberate — it is what makes the fake
 * and real success states byte-identical by construction rather than by convention.
 */
const SUCCESS_STATE: ContactFormState = Object.freeze({
  status: 'success',
  // "Should arrive", not "is on its way": the mailer's own failures are currently the one
  // step in the chain that logs nothing, so this promise cannot be verified. Naming spam
  // costs one clause and saves the visitor assuming the form silently failed.
  message:
    "Thanks, I'll get back to you soon. A copy should arrive in your inbox shortly — check spam if you don't see it.",
})

/**
 * Shared by the missing-token and failed-score paths on purpose: a bot must not be able to
 * tell from the copy which of the two checks caught it. Same reasoning as SUCCESS_STATE —
 * identical by construction rather than by two strings staying in sync.
 */
const BOT_CHECK_FAILED = "Couldn't verify you're not a bot. Please try again."

/**
 * Appended to every rejection a REAL person can hit. `/contact` and the footer already
 * carry a mailto and a WhatsApp link, but a visitor who has just been refused does not
 * necessarily connect the error they are reading to the static links further down the
 * page. Deliberately NOT appended to BOT_CHECK_FAILED: that one is shared with a path a
 * bot reaches, and the two must stay byte-identical.
 */
const FALLBACK_HINT = 'You can also email or WhatsApp me using the links below.'

export async function submitContactForm(
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  // Gate 1: honeypot. Returns a fake success — an error would teach the bot the trap exists.
  // The log line is the ONLY way to know the trap ever fired, since the caller sees success.
  // It uses its own prefix so unlimited bot volume can't bury the [contact-gate] degraded
  // lines — see logHoneypot's docblock.
  if (isBot(formData)) {
    logHoneypot()
    return SUCCESS_STATE
  }

  // Sanitised BEFORE validation, so a name made only of control characters collapses to ''
  // and gets the ordinary "please enter your name" error rather than passing the non-empty
  // check and reaching the subject header as invisible bytes.
  const name = sanitizeName(String(formData.get('name') ?? ''))
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
    return { status: 'error', message: BOT_CHECK_FAILED }
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
    // Phrased as the NETWORK, not the person. The window is keyed on IP, so colleagues
    // behind one office NAT share a budget and the second of them to write has sent
    // nothing at all — "you've sent a few messages already" accuses them of it.
    const wait = rateLimit.retryAfterSeconds
      ? `Please try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`
      : 'Please try again in a little while.'
    return {
      status: 'error',
      message: `Too many messages have come from your network recently. ${wait} ${FALLBACK_HINT}`,
    }
  }

  // Gate 5: MX + disposable check. Catches typo domains (gmial.com) as much as throwaway
  // providers — a mistyped address would never receive the confirmation email anyway.
  const deliverability = await verifyEmailDeliverability(email)
  if (deliverability.degraded) {
    logGate('email-verify', 'degraded', deliverability.degradedReason ?? 'unknown')
  }
  if (!deliverability.ok) {
    logGate('email-verify', 'blocked', deliverability.reason)
    return {
      status: 'error',
      message:
        deliverability.reason === 'disposable'
          ? // Apple Hide My Email, SimpleLogin and friends land here, and they are normal
            // privacy tools rather than bad faith. Ask for a reachable address, don't imply
            // the sender was hiding something.
            `That looks like a temporary inbox, so my reply probably wouldn't reach you. Could you use an address you check? ${FALLBACK_HINT}`
          : // This gate started blocking for real on 2026-08-01 (see R9 in the task doc), so
            // a false positive now costs a real message. Telling someone whose address IS
            // correct to "check it and try again" is a loop with no exit — name the other
            // channels, which sit on this same page.
            `I couldn't reach that email domain, so a reply would probably bounce. Please double-check the address. ${FALLBACK_HINT}`,
    }
  }

  // Gate 6: reCAPTCHA score verification.
  let recaptchaOk: boolean
  try {
    recaptchaOk = await verifyRecaptcha(token)
  } catch {
    return {
      status: 'error',
      message: "Could not verify you're not a bot right now. Please try again shortly.",
    }
  }
  if (!recaptchaOk) {
    return { status: 'error', message: BOT_CHECK_FAILED }
  }

  try {
    await sendContactEmail({ name, email, message })
  } catch {
    return { status: 'error', message: 'Could not send your message right now. Please try again later.' }
  }

  return SUCCESS_STATE
}
