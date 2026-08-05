import { validateChatInput } from '@/lib/chat/validate'
import { checkChatRateLimit, maskIp } from '@/lib/chat/ratelimit'
import { logChatGate } from '@/lib/chat/gate-log'
import { askAgent } from '@/lib/chat/agent'
// D3: the chat limiter is its own module, but these two helpers are pure and already
// exported, so re-implementing them would be two copies of the same logic drifting apart.
import { clientIpFromForwardedFor, formatRetryAfter } from '@/lib/contact/ratelimit'

/**
 * Must exceed `askAgent`'s own 40s timeout, or Vercel kills the function first and the
 * visitor gets a platform 504 instead of our "I'm offline" message — the fail-closed
 * behaviour would still be correct but would stop being legible. 60 is the Hobby ceiling.
 */
export const maxDuration = 60

/** Upstash and the outbound fetch to EC2 both want the Node runtime, not Edge. */
export const runtime = 'nodejs'

/**
 * Every rejection a real person can hit names the way out. A visitor refused by a chatbot
 * has no reason to go hunting for the contact page on their own.
 */
const FALLBACK_HINT = 'You can reach Man Hou directly through the contact form.'

function reply(text: string) {
  return Response.json({ reply: text })
}

/**
 * A reply that also tells the widget to lock its input.
 *
 * Without the flag the visitor can keep typing into a form whose every submission is
 * already decided, which reads as the bot ignoring them. Purely a UX signal: the server
 * re-checks the limit on every request regardless, so a client that ignores `blocked`
 * gains nothing but a second identical refusal.
 */
function blockedReply(text: string) {
  return Response.json({ reply: text, blocked: true })
}

export async function POST(request: Request) {
  // Gate 1: parseable body. A malformed body is a broken client or a probe, never a
  // visitor, so it gets the generic error rather than anything explanatory.
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Malformed request.' }, { status: 400 })
  }

  // Gate 2: shape, size and history caps. Runs before the rate limit so an oversized
  // payload is rejected without spending a slot, and before the agent so it never
  // reaches the box at all.
  const validated = validateChatInput(body)
  if (!validated.ok) {
    return Response.json({ error: validated.error }, { status: 400 })
  }

  // Gate 3: per-IP rate limit. This one protects the OWNER's Claude quota as much as it
  // prevents abuse — see the note in lib/chat/ratelimit.ts.
  const ip = clientIpFromForwardedFor(request.headers.get('x-forwarded-for'))
  const rateLimit = await checkChatRateLimit(ip)
  if (rateLimit.degraded) {
    logChatGate('ratelimit', 'degraded', rateLimit.reason ?? 'unknown')
  }
  if (!rateLimit.ok) {
    // The scope is logged, not just the block: "global blocked" means the whole site is
    // capped for the day and is worth acting on, while "burst blocked" is one impatient
    // visitor and is worth nothing. Without the scope those are the same log line.
    logChatGate('ratelimit', 'blocked', rateLimit.scope ?? 'unknown')

    // 200, not 429. The message is the product here: the widget renders whatever comes
    // back as an assistant turn, and a visitor who has hit a ceiling should read a
    // sentence in the conversation rather than see a failed request. The `[chat-gate]`
    // line above is what makes this countable in the logs.
    // Opens with the gate's own log line, masked. The panel is dressed as a terminal, so
    // showing the visitor the exact line the server just wrote is both in character and a
    // small, honest wink that the request was counted and the address was seen.
    const gateLine = `[chat-gate] ratelimit blocked (${rateLimit.scope ?? 'unknown'}, ${maskIp(ip)})`

    if (rateLimit.scope === 'global') {
      // Deliberately says nothing about the visitor. They may be the first person to ask
      // anything today; the budget was spent by other people entirely, and blaming them
      // for it would be both wrong and baffling.
      return blockedReply(
        `${gateLine}\n\nI've answered as many questions as I can today — this runs on Man Hou's personal Claude allowance, not a company budget. Try again tomorrow. ${FALLBACK_HINT}`
      )
    }

    if (rateLimit.scope === 'daily') {
      return blockedReply(
        `${gateLine}\n\nThat's your questions for today. Every answer costs Man Hou real quota, so there's a daily ceiling per visitor. Try again tomorrow. ${FALLBACK_HINT}`
      )
    }

    // Burst. The only tier whose wait is short enough to be worth naming, since
    // `formatRetryAfter` tops out at "about an hour" and the daily tiers exceed that.
    const wait = rateLimit.retryAfterSeconds
      ? `Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`
      : 'Try again in a little while.'
    return blockedReply(
      `${gateLine}\n\nThat's a lot of questions in a short time, and answering them costs Man Hou real quota. ${wait} ${FALLBACK_HINT}`
    )
  }

  // Gate 4: the agent itself. Fails CLOSED — every failure below is spoken aloud rather
  // than passed off as an answer. `askAgent` has already logged which failure it was.
  const result = await askAgent(validated.messages)
  if (!result.ok) {
    return reply(
      result.reason === 'timeout'
        ? // Named specifically because it is the one failure a retry genuinely fixes: the
          // box serialises to one `claude` process, so a timeout usually means somebody
          // else was mid-answer rather than that anything is broken.
          `That took longer than I could wait for. Try asking again in a moment. ${FALLBACK_HINT}`
        : `I'm offline at the moment, so I can't answer that right now. ${FALLBACK_HINT}`
    )
  }

  return reply(result.reply)
}
