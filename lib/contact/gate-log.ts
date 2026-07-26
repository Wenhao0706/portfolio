/**
 * One-line structured log for any gate outcome that is not a clean pass.
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
