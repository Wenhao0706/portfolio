/**
 * Shape and size checks on the chat request body.
 *
 * Everything here treats the ENTIRE body as hostile, including the history. The client
 * sends the transcript back each turn (the server keeps no session), so `messages` is
 * attacker-controlled in full — not just the last entry. An unbounded history would let
 * one request push an arbitrarily large prompt onto the box, which costs the owner's
 * Claude quota and can stall the single-slot queue on EC2 for its whole timeout.
 */

export type ChatRole = 'user' | 'assistant'

export type ChatMessage = {
  role: ChatRole
  content: string
}

/**
 * Long enough for a real recruiter question with context pasted in, short enough that
 * nobody pastes a CV in and burns a minute of the box's single queue slot on it.
 */
export const MESSAGE_MAX_LENGTH = 1000

/**
 * Messages, not turns — 12 is six exchanges. Past that the bot has plenty of context and
 * the marginal answer quality does not pay for the quota. The client trims to the same
 * number; this is the enforcement copy, since the client's is only a courtesy.
 */
export const MAX_HISTORY_MESSAGES = 12

export type ValidateChatResult =
  | { ok: true; messages: ChatMessage[] }
  | { ok: false; error: string }

function isRole(value: unknown): value is ChatRole {
  return value === 'user' || value === 'assistant'
}

/**
 * Flattens every control character and run of whitespace to a single space.
 *
 * Newlines go too, which is stricter than it first looks. `buildTranscript` joins turns
 * with `Visitor:` / `Assistant:` line prefixes, so content containing a real newline can
 * write a convincing forged turn into the middle of the transcript. Collapsing to one
 * line does not make that impossible, but it removes the shape that makes it work, and a
 * single-line chat input loses nothing by it.
 */
function sanitizeContent(content: string): string {
  return content.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function validateChatInput(body: unknown): ValidateChatResult {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Malformed request.' }
  }

  const raw = (body as { messages?: unknown }).messages
  if (!Array.isArray(raw)) {
    return { ok: false, error: 'Malformed request.' }
  }
  if (raw.length === 0) {
    return { ok: false, error: 'Please type a question first.' }
  }
  // Checked BEFORE the per-entry loop so a 10,000-entry array is rejected on its length
  // rather than after sanitising every entry in it.
  if (raw.length > MAX_HISTORY_MESSAGES) {
    return { ok: false, error: 'Malformed request.' }
  }

  const messages: ChatMessage[] = []
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) {
      return { ok: false, error: 'Malformed request.' }
    }
    const { role, content } = entry as { role?: unknown; content?: unknown }
    if (!isRole(role) || typeof content !== 'string') {
      return { ok: false, error: 'Malformed request.' }
    }
    if (content.length > MESSAGE_MAX_LENGTH) {
      return {
        ok: false,
        error: `Please keep your message under ${MESSAGE_MAX_LENGTH} characters.`,
      }
    }
    const clean = sanitizeContent(content)
    // An assistant turn that sanitises to nothing is dropped rather than rejected — it is
    // our own output coming back and an empty one is noise, not an attack. An empty USER
    // turn is the thing the visitor is waiting on an answer to, so it must be an error.
    if (!clean) {
      if (role === 'user') {
        return { ok: false, error: 'Please type a question first.' }
      }
      continue
    }
    messages.push({ role, content: clean })
  }

  // The transcript has to end on the question we are answering. Anything else means the
  // client is out of step with itself, and asking Claude to continue from its own last
  // reply produces a rambling non-answer rather than an error anyone would notice.
  if (messages.at(-1)?.role !== 'user') {
    return { ok: false, error: 'Malformed request.' }
  }

  return { ok: true, messages }
}
