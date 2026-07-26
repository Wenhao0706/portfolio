import emailValidator, { type ValidationResult } from 'node-email-verifier'

export type DeliverabilityResult = {
  ok: boolean
  reason?: 'mx' | 'disposable' | 'format'
  degraded: boolean
}

/**
 * MX + disposable-domain check. Deliberately does NOT attempt per-mailbox verification:
 * Gmail/Yahoo/Mail.com return SMTP 250 OK for every address as an anti-harvesting
 * defence, so no tool can tell a real gmail from a fake one.
 *
 * Fails OPEN. The library THROWS on DNS timeout rather than returning a falsy result,
 * so the call must stay wrapped — a flaky DNS lookup must not cost a real message.
 *
 * NOTE: the installed node-email-verifier@4.0.0 does NOT match the plain-boolean shape
 * `{ valid, format, mx, disposable }` originally assumed for this gate. With
 * `detailed: true` it returns a `ValidationResult` where `format`, `mx`, and `disposable`
 * are each objects carrying their own `valid` field (e.g. `result.mx.valid`), not
 * top-level booleans. The checks below read the nested `.valid` fields accordingly.
 */
export async function verifyEmailDeliverability(email: string): Promise<DeliverabilityResult> {
  try {
    const result = (await emailValidator(email, {
      checkMx: true,
      checkDisposable: true,
      detailed: true,
      timeout: 3000,
    })) as ValidationResult

    if (result.valid) return { ok: true, degraded: false }
    if (result.disposable && !result.disposable.valid) {
      return { ok: false, reason: 'disposable', degraded: false }
    }
    if (result.mx && !result.mx.valid) {
      return { ok: false, reason: 'mx', degraded: false }
    }
    return { ok: false, reason: 'format', degraded: false }
  } catch {
    return { ok: true, degraded: true }
  }
}
