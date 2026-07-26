/**
 * One-line structured log for a non-clean-pass outcome of the RATE-LIMIT and
 * EMAIL-DELIVERABILITY gates. The honeypot is deliberately excluded — it uses
 * `logHoneypot` below, on its own prefix; see that function for why.
 *
 * 'blocked'  — the gate did its job and rejected the submission.
 * 'degraded' — the gate let the submission through because its own infrastructure
 *              failed. This is the important one: without it, a broken Redis or a
 *              dead DNS resolver is indistinguishable from a healthy gate.
 *
 * console.warn lands in Vercel's runtime logs, filterable on the [contact-gate] prefix.
 */
export function logGate(gate: string, outcome: 'blocked' | 'degraded', detail?: string): void {
  console.warn(`[contact-gate] ${gate} ${outcome}${detail ? ` (${detail})` : ''}`)
}

/**
 * Honeypot hits get their OWN prefix, deliberately kept off [contact-gate].
 *
 * Every hit carries identical information — "a bot filled the hidden field" — so there is
 * no detail worth recording, only volume. And volume is the problem: the honeypot is the
 * one gate an attacker can trigger without limit (it runs before the rate limit, by
 * design, so bots cost nothing). On a shared prefix a sustained flood would bury the
 * `degraded` lines, which are the only signal that a gate has silently stopped working.
 *
 * Grep [contact-honeypot] to count bot hits. Grep [contact-gate] for anything actionable.
 */
export function logHoneypot(): void {
  console.warn('[contact-honeypot] blocked')
}
