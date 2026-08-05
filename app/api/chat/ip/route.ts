import { clientIpFromForwardedFor } from '@/lib/contact/ratelimit'
import { LOOPBACK_IPS } from '@/lib/chat/ratelimit'

/**
 * Tells the visitor their own address, so the chat panel can display it.
 *
 * This exists as its own endpoint for a rendering reason, not an architectural one. The
 * widget mounts from `app/layout.tsx`, and reading request headers there would opt EVERY
 * page on the site out of static prerendering — the whole site would become dynamic to
 * decorate one header. A client-side fetch keeps that cost contained to visitors who
 * actually open the chat.
 *
 * Nothing here is sensitive: the only address this can ever return is the caller's own,
 * which their browser and every site they visit already knows.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const ip = clientIpFromForwardedFor(request.headers.get('x-forwarded-for'))

  // `next dev` sets `x-forwarded-for` to `::1` even with no proxy in front of it, so the
  // header rendered `you@::1` locally — technically the visitor's address and completely
  // useless as one. `LOOPBACK_IPS` is shared with the limiter so the address the panel
  // calls "localhost" is exactly the address that skips rate limiting.
  return Response.json({ ip: !ip || LOOPBACK_IPS.has(ip) ? 'localhost' : ip })
}
