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
 * Lazily constructed so that importing this module never throws at build time.
 * `Redis.fromEnv()` throws when the env vars are unset, which is the normal state
 * in local development.
 */
let limiter: Ratelimit | null = null

function getLimiter(): Ratelimit {
  if (!limiter) {
    limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(RATE_LIMIT_MAX, RATE_LIMIT_WINDOW),
    })
  }
  return limiter
}

export type RateLimitResult = { ok: boolean; degraded: boolean }

/**
 * Sliding window, keyed by IP. Fails OPEN: a Redis outage, a timeout, missing env vars,
 * or an unknown IP all return ok:true. Losing a real message costs more than admitting
 * one spam, and reCAPTCHA is still in front of the mailer.
 *
 * `degraded: true` distinguishes "allowed because under the limit" from "allowed because
 * the gate is not working". Callers log the latter — otherwise a bad Upstash token
 * disables rate limiting permanently with no visible symptom.
 */
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  if (!ip) return { ok: true, degraded: true }

  try {
    const { success } = await getLimiter().limit(ip)
    return { ok: success, degraded: false }
  } catch {
    return { ok: true, degraded: true }
  }
}
