/**
 * Shared field name for the honeypot input. Exported as a single constant so the form
 * and the Server Action cannot drift apart — a mismatch would silently disable the trap
 * while every test still passed.
 *
 * ⚠️ NEVER name this after a real autofill category. It was `company` until a review
 * caught that `company`/`organization` is a standard autofill token: Chrome ignores
 * `autocomplete="off"` for address-type fields, and password managers fill by label
 * heuristics regardless. A real person's manager filling this field trips `isBot`, which
 * returns a success state byte-identical to a real send — so the visitor is told their
 * message went through and it is silently discarded. On a portfolio whose contact form is
 * the only channel to a recruiter, that is the worst outcome the feature can produce, and
 * it is the ONE failure here that no log line can distinguish from a genuine bot.
 *
 * Safe: a meaningless token no filler recognises. Unsafe: company, organization, address,
 * phone, url, title, name, email — anything in the autofill vocabulary.
 */
export const HONEYPOT_FIELD = 'ref-token'

export function isBot(formData: FormData): boolean {
  return String(formData.get(HONEYPOT_FIELD) ?? '').trim().length > 0
}
