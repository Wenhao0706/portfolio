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
 * Fails OPEN on infrastructure failure. node-email-verifier@4.0.0's `checkMxRecords`
 * catches resolver-level failures itself and RETURNS a result (errorCode
 * DNS_LOOKUP_FAILED / MX_LOOKUP_FAILED) rather than throwing — only the library's own
 * 3s internal race throws (DNS_LOOKUP_TIMEOUT). Both paths must fail open: a flaky or
 * outage-mode resolver must never cost a real visitor their message. NO_MX_RECORDS is
 * the one genuine block signal — that's the actual typo-domain UX win (gmial.com).
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

    // Confirmed against node_modules/node-email-verifier/dist/errors.d.ts +
    // dist/index.js's checkMxRecords/classifyDnsError: these two ErrorCode values are
    // what a resolver-level failure (ECONNREFUSED, ENOTFOUND, ENODATA, ETIMEDOUT,
    // getaddrinfo failures) is folded into and RETURNED as — not thrown. NO_MX_RECORDS
    // is deliberately excluded: that's the genuine "domain has no mail server" signal.
    const infra = result.mx?.errorCode
    if (infra === 'DNS_LOOKUP_FAILED' || infra === 'MX_LOOKUP_FAILED') {
      return { ok: true, degraded: true }
    }

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
