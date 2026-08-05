import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
// D3 keeps the two limiters separate; this is only the shared env-var read, which both
// modules need for the same reason and neither owns. See its docblock in the contact module.
import { isUpstashConfigured } from '@/lib/contact/ratelimit'

/**
 * The chat gate's own limiters, deliberately separate from `lib/contact/ratelimit.ts`
 * (D3 in the task doc). Same Upstash database, so every key here carries a `chat:` prefix
 * — without it a visitor who used the contact form would arrive already rate-limited.
 *
 * Three tiers, because they defend against three different things:
 *
 *   BURST   20 / 10 min per IP  — one impatient or rude visitor hammering the box.
 *   DAILY   40 / day per IP     — the same visitor grinding away patiently all day.
 *                                 Without it, the burst window alone still permits
 *                                 ~2,880 messages a day from one address.
 *   GLOBAL  400 / day, everyone — the only limit that cannot be defeated by switching
 *                                 IP. VPN hopping, incognito and a botnet all still
 *                                 land inside this one number.
 *
 * The per-IP tiers are about fairness. The GLOBAL tier is the one that actually bounds
 * how much of the owner's weekly Claude allowance a bad day can cost, and it is the
 * reason none of the above needs to identify a *person*. Trying to fingerprint a device
 * is a losing game; capping the total is not.
 *
 * All three fail OPEN. See `checkChatRateLimit` for why that is not a contradiction of
 * the chat gate's fail-closed rule.
 */

/** One impatient visitor. Generous — a real conversation never approaches it. */
export const CHAT_BURST_MAX = 20
export const CHAT_BURST_WINDOW = '10 m'

/** The same visitor, all day. About two long conversations. */
export const CHAT_DAILY_MAX = 40
export const CHAT_DAILY_WINDOW = '1 d'

/**
 * Everybody combined. The hard ceiling on a day's quota burn, and the number to raise if
 * the site ever gets genuinely popular. Prefer raising this to removing it.
 */
export const CHAT_GLOBAL_DAILY_MAX = 400
export const CHAT_GLOBAL_WINDOW = '1 d'

/** Fixed, deliberately — the global tier counts every visitor into one bucket. */
const GLOBAL_KEY = 'chat:global:day'

/**
 * Built lazily and cached per tier, so importing this module never touches env at build
 * time and a warm serverless instance reuses its connections.
 */
const limiters = new Map<string, Ratelimit>()

function getLimiter(tier: string, max: number, window: string): Ratelimit {
  let limiter = limiters.get(tier)
  if (!limiter) {
    limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(max, window as Parameters<typeof Ratelimit.slidingWindow>[1]),
    })
    limiters.set(tier, limiter)
  }
  return limiter
}

/**
 * Loopback in every form it arrives in.
 *
 * `next dev` DOES set `x-forwarded-for` despite there being no proxy in front of it — it
 * sets `::1`, the IPv6 loopback. `::ffff:127.0.0.1` is the same address again, IPv4 mapped
 * into IPv6, which is how some Node versions report it.
 */
export const LOOPBACK_IPS = new Set(['::1', '127.0.0.1', '::ffff:127.0.0.1'])

/**
 * Whether this address should skip the limiter entirely.
 *
 * Gated on NOT being production, which is the important half. Loopback alone would be
 * *probably* safe — Vercel overwrites `x-forwarded-for` at its edge, so a visitor cannot
 * present themselves as `::1` — but "probably safe" is a poor foundation for a check whose
 * failure mode is unlimited access for everyone. A reverse proxy misconfigured to forward
 * a loopback address is an ordinary mistake, and this way it stays a mistake instead of
 * becoming a site-wide bypass.
 *
 * Nothing is lost locally by the extra condition: a production BUILD run on this machine
 * has no Upstash credentials either, so `isConfigured()` already fails it open.
 */
function isExempt(ip: string): boolean {
  return process.env.NODE_ENV !== 'production' && LOOPBACK_IPS.has(ip)
}

/**
 * Drops the identifying tail of an address so it can be shown to the visitor.
 *
 * The panel prints this back at whoever got rate limited, which is a joke about being
 * watched rather than an accusation. Masked because the full address does not make the
 * joke any better and a portfolio site has no reason to render one: an IP is personal data
 * under Malaysia's PDPA and the GDPR, and `203.0.113.x` still says "yes, I know who you
 * are" without writing it down in full.
 */
export function maskIp(ip: string): string {
  if (!ip) return 'unknown'
  // IPv6 is any address containing a colon. Keep the routing prefix, drop the interface
  // half, which is the part that identifies one machine.
  if (ip.includes(':')) {
    const groups = ip.split(':').filter(Boolean).slice(0, 3)
    return groups.length ? `${groups.join(':')}::x` : 'unknown'
  }
  const octets = ip.split('.')
  if (octets.length !== 4) return 'unknown'
  return `${octets[0]}.${octets[1]}.${octets[2]}.x`
}

/** Which tier turned the request away. The route picks its wording from this. */
export type ChatLimitScope = 'burst' | 'daily' | 'global'

export type ChatRateLimitDegradedReason = 'no-ip' | 'not-configured' | 'timeout' | 'unavailable'

export type ChatRateLimitResult = {
  ok: boolean
  degraded: boolean
  reason?: ChatRateLimitDegradedReason
  scope?: ChatLimitScope
  retryAfterSeconds?: number
}

type TierOutcome =
  | { kind: 'pass' }
  | { kind: 'degraded'; reason: ChatRateLimitDegradedReason }
  | { kind: 'block'; retryAfterSeconds?: number }

async function checkTier(
  tier: ChatLimitScope,
  key: string,
  max: number,
  window: string
): Promise<TierOutcome> {
  try {
    const { success, reason, reset } = await getLimiter(tier, max, window).limit(key)
    // `applyTimeout` RESOLVES with `success: true, reason: 'timeout'` rather than
    // rejecting, so reading only `success` would report a healthy pass on every Upstash
    // slowdown. See the full note in lib/contact/ratelimit.ts.
    if (reason === 'timeout') return { kind: 'degraded', reason: 'timeout' }
    if (success) return { kind: 'pass' }

    // `reset` is an epoch in MILLISECONDS, and the timeout path resolves with `reset: 0`.
    const waitMs = typeof reset === 'number' ? reset - Date.now() : 0
    return waitMs > 0 ? { kind: 'block', retryAfterSeconds: Math.ceil(waitMs / 1000) } : { kind: 'block' }
  } catch (err) {
    console.warn(
      `[chat-gate] ratelimit ${tier} error: ${err instanceof Error ? err.message : String(err)}`
    )
    return { kind: 'degraded', reason: 'unavailable' }
  }
}

/**
 * Fails OPEN, unlike the rest of the chat chain.
 *
 * This looks like it contradicts the "chat fails closed" rule, and it is worth being
 * explicit about why it does not. Failing CLOSED protects the visitor from a silent
 * non-answer: if the agent is down, say so. This gate is the opposite direction — a
 * broken Upstash would turn every visitor away from a chatbot that works fine.
 *
 * The exposure is bounded by the box itself: EC2 serialises to one `claude` process, so
 * a Redis outage cannot produce runaway parallel spend, only a queue. `degraded: true`
 * is what makes that outage visible instead of silent.
 *
 * TIER ORDER IS LOAD-BEARING. Each `.limit()` call CONSUMES a slot, so checking burst
 * first means a visitor being blocked for hammering never spends the global budget on
 * their way to being refused. Reversing it would let one abuser drain the day's ceiling
 * with requests that were all going to be rejected anyway.
 */
export async function checkChatRateLimit(ip: string): Promise<ChatRateLimitResult> {
  if (!ip) return { ok: true, degraded: true, reason: 'no-ip' }

  // Local development. Checked BEFORE `isConfigured` so the exemption holds even with real
  // Upstash credentials in `.env.local` — otherwise testing against production-like
  // config would silently start counting the developer's own messages against the same
  // global daily budget that real visitors share.
  //
  // Not `degraded`: nothing is broken and there is nothing to alert on.
  if (isExempt(ip)) return { ok: true, degraded: false }

  // `Redis.fromEnv()` does not throw on missing env vars — it warns and returns a client
  // that burns ~4.3s in fetch retries before failing. This short-circuit exists to avoid
  // paying that on every request; see the long note in `lib/contact/ratelimit.ts`.
  if (!isUpstashConfigured()) return { ok: true, degraded: true, reason: 'not-configured' }

  const tiers: Array<[ChatLimitScope, string, number, string]> = [
    ['burst', `chat:burst:${ip}`, CHAT_BURST_MAX, CHAT_BURST_WINDOW],
    ['daily', `chat:day:${ip}`, CHAT_DAILY_MAX, CHAT_DAILY_WINDOW],
    ['global', GLOBAL_KEY, CHAT_GLOBAL_DAILY_MAX, CHAT_GLOBAL_WINDOW],
  ]

  for (const [scope, key, max, window] of tiers) {
    const outcome = await checkTier(scope, key, max, window)

    // A degraded tier stops the walk and lets the request through. Continuing would spend
    // the later tiers' budgets on a decision already made, and a Redis that just failed
    // for one key is not about to answer reliably for the next two.
    if (outcome.kind === 'degraded') {
      return { ok: true, degraded: true, reason: outcome.reason, scope }
    }
    if (outcome.kind === 'block') {
      return {
        ok: false,
        degraded: false,
        scope,
        retryAfterSeconds: outcome.retryAfterSeconds,
      }
    }
  }

  return { ok: true, degraded: false }
}
