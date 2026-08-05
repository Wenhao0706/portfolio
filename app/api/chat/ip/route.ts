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
 *
 * Keep this endpoint free of anything that costs money or quota. It is unauthenticated and
 * unmetered by design, because it only ever reads a header — a temporary diagnostic here
 * once made a real Claude call per request, which is a quota drain anyone could pull.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const ip = clientIpFromForwardedFor(request.headers.get('x-forwarded-for'))

  // `next dev` sets `x-forwarded-for` to `::1` even with no proxy in front of it, so the
  // header rendered `you@::1` locally — technically the visitor's address and completely
  // useless as one. `LOOPBACK_IPS` is shared with the limiter so the address the panel
  // calls "localhost" is exactly the address that skips rate limiting. Loopback is named
  // rather than masked: `127.0.0.x` is a worse answer than "localhost" for the one
  // visitor who is the developer.
  return Response.json({ ip: !ip || LOOPBACK_IPS.has(ip) ? 'localhost' : maskIp(ip) })
}
