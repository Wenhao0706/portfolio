import { buildSystemPrompt, buildTranscript } from './prompt'
import type { ChatMessage } from './validate'

/**
 * The client half of the Vercel to EC2 hop.
 *
 * Wire contract with `agent/server.mjs` — keep the two in step:
 *   POST <CHAT_AGENT_URL>
 *   Authorization: Bearer <CHAT_AGENT_SECRET>
 *   { "system": string, "prompt": string }
 *   200 { "reply": string }   | non-200 { "error": string }
 *
 * The box stays deliberately dumb: it holds no persona, no knowledge base and no history.
 * Everything that decides what the bot says is version-controlled in this repo, so
 * changing the bot's behaviour is a git push rather than an SSH session.
 */

/**
 * Below EC2's own ~45s cap, so a slow answer surfaces as OUR timeout rather than the
 * connection dying underneath us. Vercel's Node runtime allows more than this, but a
 * visitor staring at a spinner has given up well before 40s anyway.
 */
const REQUEST_TIMEOUT_MS = 40_000

export type AgentResult =
  | { ok: true; reply: string }
  | { ok: false; reason: 'not-configured' | 'timeout' | 'unavailable' | 'empty' }

function isConfigured(): boolean {
  return Boolean(process.env.CHAT_AGENT_URL && process.env.CHAT_AGENT_SECRET)
}

/**
 * Fails CLOSED. Every failure path returns `ok: false` and the route turns that into a
 * visible "I'm offline, use the contact form" — never a fabricated answer and never a
 * silent pass. This is the deliberate opposite of `lib/contact/*`, which fails open
 * because losing a real message costs more than admitting spam. A dead agent has no such
 * tradeoff: there is nothing to lose by admitting it is dead.
 */
export async function askAgent(messages: ChatMessage[]): Promise<AgentResult> {
  if (!isConfigured()) {
    // Expected state in local dev and until the Cloudflare Tunnel exists. Logged at warn
    // so it is visible in Vercel if the env vars are ever lost, but it is not an error.
    console.warn('[chat-gate] agent not-configured (CHAT_AGENT_URL / CHAT_AGENT_SECRET unset)')
    return { ok: false, reason: 'not-configured' }
  }

  // AbortSignal.timeout rather than a manual AbortController — it is available on the
  // Node runtime Vercel uses and cannot leak the timer the way a hand-rolled one can.
  let res: Response
  try {
    res = await fetch(process.env.CHAT_AGENT_URL as string, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.CHAT_AGENT_SECRET as string}`,
      },
      body: JSON.stringify({
        system: buildSystemPrompt(),
        prompt: buildTranscript(messages),
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: 'no-store',
    })
  } catch (err) {
    // A timeout arrives here as a DOMException named 'TimeoutError'; a dead tunnel or a
    // DNS failure arrives as a TypeError. Distinguished so the logs separate "the box is
    // thinking too long" from "the box is not there", which need different fixes.
    const timedOut = err instanceof Error && err.name === 'TimeoutError'
    console.warn(
      `[chat-gate] agent ${timedOut ? 'timeout' : 'unavailable'}: ${
        err instanceof Error ? err.message : String(err)
      }`
    )
    return { ok: false, reason: timedOut ? 'timeout' : 'unavailable' }
  }

  if (!res.ok) {
    console.warn(`[chat-gate] agent unavailable: HTTP ${res.status}`)
    return { ok: false, reason: 'unavailable' }
  }

  let reply: unknown
  try {
    reply = ((await res.json()) as { reply?: unknown }).reply
  } catch {
    console.warn('[chat-gate] agent unavailable: response was not JSON')
    return { ok: false, reason: 'unavailable' }
  }

  // A 200 carrying an empty reply is its own failure mode, not a valid answer: `claude -p`
  // exiting 0 with nothing on stdout (killed mid-run, quota exhausted) looks exactly like
  // this. Rendering it would show the visitor an empty assistant bubble.
  if (typeof reply !== 'string' || !reply.trim()) {
    console.warn('[chat-gate] agent empty reply')
    return { ok: false, reason: 'empty' }
  }

  return { ok: true, reply: reply.trim() }
}
