/**
 * One-line structured log for a non-clean-pass outcome of a CHAT gate.
 *
 * Its own `[chat-gate]` prefix rather than reusing `logGate` from `lib/contact/gate-log.ts`:
 * the two features fail in opposite directions (contact fails open, chat fails closed), so
 * a shared prefix would mix a line meaning "let it through anyway" with one meaning "turned
 * the visitor away" and make either filter useless.
 *
 * 'blocked'  — the gate rejected the request and the visitor was told so.
 * 'degraded' — the gate's own infrastructure failed. The important one: without it a dead
 *              Upstash and a healthy under-limit pass are indistinguishable.
 */
export function logChatGate(gate: string, outcome: 'blocked' | 'degraded', detail?: string): void {
  console.warn(`[chat-gate] ${gate} ${outcome}${detail ? ` (${detail})` : ''}`)
}
