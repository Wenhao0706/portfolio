import { clientIpFromForwardedFor } from '@/lib/contact/ratelimit'
import { LOOPBACK_IPS, maskIp } from '@/lib/chat/ratelimit'

/**
 * Tells the visitor their own address, so the chat panel can display it.
 *
 * This exists as its own endpoint for a rendering reason, not an architectural one. The
 * widget mounts from `app/layout.tsx`, and reading request headers there would opt EVERY
 * page on the site out of static prerendering — the whole site would become dynamic to
 * decorate one header. A client-side fetch keeps that cost contained to visitors who
 * actually open the chat.
 *
 * The address is MASKED before it leaves, with the same `maskIp` the rate-limit message
 * uses. Showing someone their own address is not a disclosure, so the reason is not
 * secrecy — it is that the panel greets a stranger with it, and `203.0.113.x` makes the
 * "yes, I can see you" point without printing a full address at a recruiter who is still
 * deciding whether to trust the site. Masking in one place and not the other would also
 * read as an oversight rather than a choice.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // TEMPORARY DIAGNOSTIC — remove once the env binding is understood.
  // Reports PRESENCE and LENGTH only, never a value, so nothing sensitive is exposed
  // while it is live. Exists because the deployed function reports not-configured while
  // the dashboard shows both vars set and Production-scoped, and nothing short of asking
  // the running function itself distinguishes the possible causes.
  if (new URL(request.url).searchParams.has('diag')) {
    const dynamicRead = (k: string) => process.env[k]
    return Response.json({
      staticUrl: Boolean(process.env.CHAT_AGENT_URL),
      staticSecret: Boolean(process.env.CHAT_AGENT_SECRET),
      dynamicUrl: Boolean(dynamicRead('CHAT_AGENT_URL')),
      dynamicSecret: Boolean(dynamicRead('CHAT_AGENT_SECRET')),
      urlLen: (dynamicRead('CHAT_AGENT_URL') ?? '').length,
      secretLen: (dynamicRead('CHAT_AGENT_SECRET') ?? '').length,
      upstash: Boolean(process.env.UPSTASH_REDIS_REST_URL),
      kvAlias: Boolean(process.env.KV_REST_API_URL),
      chatKeys: Object.keys(process.env).filter((k) => k.startsWith('CHAT_')).sort(),
    })
  }

  // TEMPORARY — makes the agent call from inside the Vercel function and reports what
  // came back. The request never reaches EC2 and fails fast, so the answer is in whatever
  // rejects it in between; only the caller can see that.
  if (new URL(request.url).searchParams.has('probe')) {
    const started = Date.now()
    try {
      const res = await fetch(process.env.CHAT_AGENT_URL as string, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${process.env.CHAT_AGENT_SECRET as string}`,
        },
        body: JSON.stringify({ system: 'Be terse.', prompt: 'Visitor: say OK\n\nAssistant:' }),
        signal: AbortSignal.timeout(30_000),
        cache: 'no-store',
      })
      const body = (await res.text()).slice(0, 400)
      return Response.json({ ms: Date.now() - started, status: res.status, body })
    } catch (err) {
      return Response.json({
        ms: Date.now() - started,
        threw: true,
        name: err instanceof Error ? err.name : 'unknown',
        message: err instanceof Error ? err.message : String(err),
        cause: err instanceof Error && err.cause ? String(err.cause) : undefined,
      })
    }
  }

  const ip = clientIpFromForwardedFor(request.headers.get('x-forwarded-for'))

  // `next dev` sets `x-forwarded-for` to `::1` even with no proxy in front of it, so the
  // header rendered `you@::1` locally — technically the visitor's address and completely
  // useless as one. `LOOPBACK_IPS` is shared with the limiter so the address the panel
  // calls "localhost" is exactly the address that skips rate limiting.
  // Loopback is named rather than masked — `127.0.0.x` would be a worse answer than
  // "localhost" for the one case where the visitor is the developer.
  return Response.json({ ip: !ip || LOOPBACK_IPS.has(ip) ? 'localhost' : maskIp(ip) })
}
