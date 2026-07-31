import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export const RATE_LIMIT_MAX = 3
export const RATE_LIMIT_WINDOW = '10 m'

/**
 * On Vercel `x-forwarded-for` is a comma-separated chain; the first entry is the client.
 * Returns '' when the header is absent, which callers treat as "fail open".
 */
export function clientIpFromForwardedFor(value: string | null): string {
  if (!value) return ''
  return value.split(',')[0]?.trim() ?? ''
}

/**
 * Verified against node_modules/@upstash/redis/nodejs.mjs: `Redis.fromEnv()` does NOT
 * throw when the env vars are unset — it only `console.warn`s and returns a client with
 * `url: undefined`. Calling `.limit()` on that client then burns ~4.3s in fetch retries
 * (6 attempts, `Math.exp(i) * 50` backoff) before failing. `isConfigured()` below
 * short-circuits that dead latency, so this constructor is only ever reached with real
 * credentials present. Still lazy so importing this module never touches env at build time.
 *
 * `fromEnv` accepts the Vercel KV aliases as fallbacks, so both name pairs count as configured.
 */
let limiter: Ratelimit | null = null

function isConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  return Boolean(url && token)
}

function getLimiter(): Ratelimit {
  if (!limiter) {
    limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(RATE_LIMIT_MAX, RATE_LIMIT_WINDOW),
    })
  }
  return limiter
}

/**
 * `reason` is only set when `degraded` is true, and names WHICH failure mode fired so the
 * caller's log line distinguishes "never configured" from "configured but broken".
 */
export type RateLimitDegradedReason = 'no-ip' | 'not-configured' | 'timeout' | 'unavailable'

export type RateLimitResult = {
  ok: boolean
  degraded: boolean
  reason?: RateLimitDegradedReason
  /**
   * Seconds until the window frees a slot. Only set on a genuine block, and only when
   * Upstash returned a `reset` in the future — a rejection that cannot name the wait is
   * worse UX than one that says "in a little while", but inventing a number is worse still.
   */
  retryAfterSeconds?: number
}

/**
 * Turns the raw seconds into something a person reads without doing arithmetic. Deliberately
 * vague at the top end ("about an hour") because the sliding window keeps moving, so a
 * precise "in 47 minutes" would be wrong by the time they read it.
 */
export function formatRetryAfter(seconds: number): string {
  if (seconds <= 90) return 'about a minute'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `about ${minutes} minutes`
  return 'about an hour'
}

/**
 * Sliding window, keyed by IP. Fails OPEN: a Redis outage, a timeout, missing env vars,
 * or an unknown IP all return ok:true. Losing a real message costs more than admitting
 * one spam, and reCAPTCHA is still in front of the mailer.
 *
 * `degraded: true` distinguishes "allowed because under the limit" from "allowed because
 * the gate is not working". Callers log the latter — otherwise a bad Upstash token
 * disables rate limiting permanently with no visible symptom.
 *
 * The `reason === 'timeout'` branch is load-bearing and NOT redundant with the catch:
 * `@upstash/ratelimit` defaults `timeout: 5000` and its `applyTimeout` RESOLVES (never
 * rejects) with `{ success: true, ..., reason: 'timeout' }`. Destructuring only `success`
 * would report a healthy pass on every Upstash slowdown — the exact silent fail-open
 * `degraded` exists to catch. `reason` is public API (`RatelimitResponseType` in
 * @upstash/ratelimit/dist/index.d.mts). The other two values, `'cacheBlock'` and
 * `'denyList'`, come with `success: false` and must stay genuine blocks.
 */
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  if (!ip) return { ok: true, degraded: true, reason: 'no-ip' }
  if (!isConfigured()) return { ok: true, degraded: true, reason: 'not-configured' }

  try {
    const { success, reason, reset } = await getLimiter().limit(ip)
    if (reason === 'timeout') return { ok: true, degraded: true, reason: 'timeout' }
    if (success) return { ok: true, degraded: false }

    // `reset` is an epoch in MILLISECONDS. A blocked response should always carry one, but
    // the timeout path resolves with `reset: 0`, so treat anything non-positive as absent
    // rather than telling the visitor to wait until 1970.
    const waitMs = typeof reset === 'number' ? reset - Date.now() : 0
    return waitMs > 0
      ? { ok: false, degraded: false, retryAfterSeconds: Math.ceil(waitMs / 1000) }
      : { ok: false, degraded: false }
  } catch (err) {
    // Keep the cause: bad credentials, a network partition and a quota breach all produce
    // reason 'unavailable' and are otherwise indistinguishable in the logs.
    console.warn(
      `[contact-gate] ratelimit error: ${err instanceof Error ? err.message : String(err)}`
    )
    return { ok: true, degraded: true, reason: 'unavailable' }
  }
}
