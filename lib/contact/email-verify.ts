import { promises as dns } from 'node:dns'
import emailValidator, { type ValidationResult } from 'node-email-verifier'

/** Why the gate let an address through unchecked. Mirrors `RateLimitResult`'s shape. */
export type DeliverabilityDegradedReason = 'not-detailed' | 'dns' | 'timeout'

export type DeliverabilityResult = {
  ok: boolean
  reason?: 'mx' | 'disposable' | 'format'
  degraded: boolean
  /**
   * Set only when `degraded` is true. The three causes need different responses and the
   * caller cannot tell them apart from the outside, so the gate names its own — same
   * lesson the rate limiter already learned. `not-detailed` in particular is not a DNS
   * problem at all: it means someone dropped `detailed: true` and the gate is now
   * bypassed for every address.
   */
  degradedReason?: DeliverabilityDegradedReason
}

const MX_TIMEOUT_MS = 3000

/** Our own code, so the timeout is never confused with a code the resolver actually emitted. */
const TIMEOUT_CODE = 'ETIMEOUT_LOCAL'

/**
 * MX resolution is done HERE rather than by node-email-verifier, because the library
 * destroys the one piece of information this gate depends on.
 *
 * `dns.resolveMx` THROWS `ENODATA` for a domain that exists with no mail server
 * (test.com) — it does not resolve to an empty array. The library catches that, and its
 * `classifyDnsError` (dist/index.js:47) lists ENODATA alongside ECONNREFUSED and
 * ETIMEDOUT as a "DNS lookup failure", returning `errorCode: 'DNS_LOOKUP_FAILED'`. That
 * code means "our resolver is broken", so this gate correctly failed open on it — and
 * therefore blocked NOTHING, ever. The library's one genuine block code, NO_MX_RECORDS,
 * requires resolveMx to SUCCEED while returning an empty list, which Node effectively
 * never does. Verified against the real resolver, not the library's tests.
 *
 * The distinction that matters is whose fault the failure is: a verdict about the DOMAIN
 * blocks, a verdict about OUR resolver fails open.
 */
type MxOutcome =
  | { kind: 'ok' }
  | { kind: 'no-mx' }
  | { kind: 'degraded'; reason: 'dns' | 'timeout' }

function errorCodeOf(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : ''
}

/** A lookup that completed answers for itself; one that failed hands back its code to classify. */
type MxLookup = MxOutcome | { kind: 'error'; code: string }

/**
 * `budgetMs` is what's LEFT of the whole gate's allowance, not a fresh timeout per call.
 * The ESERVFAIL retry would otherwise double the gate's worst case to 6s, stacked ahead of
 * reCAPTCHA and an SMTP round trip inside one serverless invocation.
 */
async function lookupMx(domain: string, budgetMs: number): Promise<MxLookup> {
  if (budgetMs <= 0) return { kind: 'error', code: TIMEOUT_CODE }

  let timer: NodeJS.Timeout | undefined
  try {
    const records = await Promise.race([
      dns.resolveMx(domain),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(Object.assign(new Error('mx timeout'), { code: TIMEOUT_CODE })),
          budgetMs
        )
      }),
    ])
    return records.length > 0 ? { kind: 'ok' } : { kind: 'no-mx' }
  } catch (error) {
    return { kind: 'error', code: errorCodeOf(error) }
  } finally {
    // Without this the timer keeps the serverless invocation alive for the full budget even
    // when DNS answered in 20ms.
    if (timer) clearTimeout(timer)
  }
}

/**
 * Verdicts about the DOMAIN. ENODATA: exists, no mail server. ENOTFOUND/NXDOMAIN: does not
 * exist at all, which is what most address typos resolve to. Anything else is a statement
 * about OUR resolver and must fail open.
 *
 * Applied to the retry as well as the first attempt: a nameserver that answers ESERVFAIL
 * then ENOTFOUND has told us the domain does not exist, and routing that through the
 * resolver-failure path would wave through an address the first branch would have blocked.
 */
function classifyMxError(code: string): MxOutcome {
  if (code === 'ENODATA' || code === 'ENOTFOUND' || code === 'NXDOMAIN') {
    return { kind: 'no-mx' }
  }
  return { kind: 'degraded', reason: code === TIMEOUT_CODE ? 'timeout' : 'dns' }
}

async function checkMx(domain: string): Promise<MxOutcome> {
  const startedAt = Date.now()
  const first = await lookupMx(domain, MX_TIMEOUT_MS)
  if (first.kind !== 'error') return first

  // ESERVFAIL is the one ambiguous code: the domain's own nameserver failed to answer,
  // often transiently, so one retry inside the REMAINING budget decides it. A domain whose
  // DNS is broken twice running cannot receive mail right now either way, so a reply would
  // bounce — that is what makes the block honest rather than a guess.
  if (first.code === 'ESERVFAIL') {
    const second = await lookupMx(domain, MX_TIMEOUT_MS - (Date.now() - startedAt))
    if (second.kind !== 'error') return second
    return second.code === 'ESERVFAIL' ? { kind: 'no-mx' } : classifyMxError(second.code)
  }

  return classifyMxError(first.code)
}

/**
 * MX + disposable-domain check. Deliberately does NOT attempt per-mailbox verification:
 * Gmail/Yahoo/Mail.com return SMTP 250 OK for every address as an anti-harvesting
 * defence, so no tool can tell a real gmail from a fake one.
 *
 * Fails OPEN whenever the failure is ours (resolver down, lookup timed out): losing a real
 * visitor's message costs more than admitting one piece of spam, and reCAPTCHA still sits
 * in front of the mailer. Fails CLOSED only on a verdict about the address itself.
 *
 * node-email-verifier is still used for format and its disposable-domain list, with
 * `checkMx: false` — see `checkMx()` above for why its MX path cannot be trusted.
 */
export async function verifyEmailDeliverability(email: string): Promise<DeliverabilityResult> {
  const domain = email.split('@')[1]?.trim().toLowerCase() ?? ''
  if (!domain) return { ok: false, reason: 'format', degraded: false }

  let result: ValidationResult
  try {
    result = (await emailValidator(email, {
      checkMx: false,
      checkDisposable: true,
      detailed: true,
      timeout: MX_TIMEOUT_MS,
    })) as ValidationResult
  } catch {
    return { ok: true, degraded: true, degradedReason: 'timeout' }
  }

  // The cast above is forced: the library types the return as `Promise<boolean | Validation-
  // Result>` with no `detailed`-discriminated overload, so TS cannot narrow it. This guard
  // makes the cast honest — if a future edit drops `detailed: true`, the library returns a
  // plain boolean and every `.valid` read below would be `undefined` (silently blocking every
  // address as `reason: 'format'`). Fail open and loud-in-the-logs instead.
  if (typeof result !== 'object' || result === null) {
    return { ok: true, degraded: true, degradedReason: 'not-detailed' }
  }

  // Disposable is evaluated before MX and before format's own verdict, preserving the
  // original ordering rule: a disposable address must report `reason: 'disposable'` so it
  // gets its own softer message rather than the generic unreachable one.
  if (result.disposable && !result.disposable.valid) {
    return { ok: false, reason: 'disposable', degraded: false }
  }
  if (result.format && !result.format.valid) {
    return { ok: false, reason: 'format', degraded: false }
  }

  const mx = await checkMx(domain)
  if (mx.kind === 'no-mx') return { ok: false, reason: 'mx', degraded: false }
  if (mx.kind === 'degraded') return { ok: true, degraded: true, degradedReason: mx.reason }

  return { ok: true, degraded: false }
}
