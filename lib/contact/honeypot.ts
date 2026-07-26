/**
 * Shared field name for the honeypot input. Exported as a single constant so the form
 * and the Server Action cannot drift apart — a mismatch would silently disable the trap
 * while every test still passed.
 */
export const HONEYPOT_FIELD = 'company'

export function isBot(formData: FormData): boolean {
  return String(formData.get(HONEYPOT_FIELD) ?? '').trim().length > 0
}
