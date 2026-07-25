# Contact Form: Anti-Spam Trio Design

Status: Approved — ready for implementation planning.

## Goal

Harden the shipped `/contact` form against spam and Gmail-quota waste. reCAPTCHA v3 is
currently the only gate. Add three independent layers: a per-IP rate limit, a honeypot
field, and DNS-based email deliverability checking.

The threat being defended against is **volume** — someone hammering the form to burn the
~500/day Gmail sending quota — not invalid addresses. Per-mailbox verification was
investigated and rejected earlier: Gmail/Yahoo/Mail.com return SMTP `250 OK` for every
address as an anti-harvesting defence, so no tool (free or paid) can distinguish a real
gmail from a fake one.

## Architecture

Three new lib modules under `lib/contact/`, each independently unit-testable, wired into
the existing `submitContactForm` action as ordered guard clauses. This follows the
established 4-layer split (client → action orchestrator → lib modules). No changes to
`mailer.ts` or `recaptcha.ts`.

```
components/ContactForm.tsx   + hidden honeypot input
app/contact/actions.ts       + 3 guard clauses (order below)
lib/contact/honeypot.ts      NEW  shared field name + isBot()
lib/contact/ratelimit.ts     NEW  Upstash sliding window, fail-open
lib/contact/email-verify.ts  NEW  node-email-verifier wrapper, fail-open
```

## Guard order in `submitContactForm`

Ordered cheapest-first, so expensive checks only run on plausibly-real submissions.

| # | Gate | Cost | On failure |
|---|------|------|------------|
| 1 | Honeypot | free | Return **fake `success`** — no email sent |
| 2 | Validate (existing) | free | `error` with field message |
| 3 | Rate limit | 1 Redis call | `error` — "sent a few messages already" |
| 4 | Email deliverability | DNS lookup | `error` — invalid/disposable address |
| 5 | reCAPTCHA (existing) | Google API | `error` — unchanged |
| 6 | Send (existing) | SMTP | `error` — unchanged |

Rate limit sits **after** validation so honest empty-field mistakes don't consume the
budget — only well-formed attempts count against it.

## 1. Honeypot (`lib/contact/honeypot.ts`)

Exports `HONEYPOT_FIELD = 'company'` as the single source of truth so the form and the
action cannot drift, plus `isBot(formData): boolean` (true when the field is non-empty).

The input renders off-screen with `aria-hidden="true"`, `tabIndex={-1}`, and
`autoComplete="off"` so neither sighted users, keyboard users, nor assistive tech reach
it. Positioned off-screen rather than `display: none` — some bots skip hidden inputs.

**A tripped honeypot returns a fake `success` state**, not an error. Bots that receive an
error learn the trap and adapt; bots that receive success move on. No email is sent.

## 2. Rate limit (`lib/contact/ratelimit.ts`)

`@upstash/ratelimit` + `@upstash/redis`, sliding window, **3 submissions per 10 minutes
per IP**. Chosen over in-memory because Vercel serverless gives each instance its own
memory and cold starts wipe it — an in-memory limit is evadable by forcing new instances.

Exports `checkRateLimit(ip: string): Promise<{ ok: boolean }>`.

**Fails open.** If Redis throws, times out, or the env vars are missing, it returns
`{ ok: true }`. A Redis outage must never block a real visitor — reCAPTCHA is still in
front, and losing a message costs more than admitting one spam.

IP comes from the `x-forwarded-for` header via `headers()` from `next/headers` (Server
Actions have no request object). First entry in the comma-separated list is the client on
Vercel. Missing header → fail open.

## 3. Email deliverability (`lib/contact/email-verify.ts`)

Wraps `node-email-verifier` v4 (MIT, Node 20+). Exports
`verifyEmailDeliverability(email): Promise<{ ok: boolean; reason?: string }>`.

Called with `{ checkMx: true, checkDisposable: true, detailed: true, timeout: 3000 }`.
The `detailed: true` result gives `{ valid, format, mx, disposable }` so the failure
reason can be distinguished for logging.

`checkMx` catches typo domains (`gmial.com`) — a genuine UX win, not only an anti-spam
measure. `checkDisposable` blocks throwaway providers (600+ domains in the OSS list).

**Hard-blocks rather than warns**: a disposable address is rarely someone worth replying
to, and MX failure usually means the visitor mistyped and would never receive the
confirmation email.

**Fails open.** The library *throws* on DNS timeout, so the call is wrapped in try/catch
returning `{ ok: true }`. A flaky DNS lookup must not cost a real message.

The library also does RFC 5322 format validation, overlapping `validate.ts`'s regex. The
regex stays as the fast first-pass with a friendly message; this module owns MX +
disposable only.

## Error handling

Every new gate returns the typed `ContactFormState` — no exception escapes the action,
matching the existing try/catch discipline. Both network-dependent gates fail open, so
infrastructure problems degrade to "slightly less spam protection", never to a broken
form.

## Testing

Extends the existing vitest suite (29 passing).

| File | Cases |
|------|-------|
| `honeypot.test.ts` | filled → bot, empty → human |
| `ratelimit.test.ts` | under limit, over limit, **fail-open when client throws**, missing env |
| `email-verify.test.ts` | valid MX passes, disposable blocked, bad domain blocked, **fail-open on timeout throw** |
| `actions.test.ts` | honeypot short-circuits to success with mailer NOT called; rate-limit block returns before reCAPTCHA runs |

Upstash client and `node-email-verifier` are mocked — no network in tests.

## Dependencies

| Package | Type | Notes |
|---------|------|-------|
| `@upstash/ratelimit` | prod | v2, MIT |
| `@upstash/redis` | prod | REST client, serverless-safe |
| `node-email-verifier` | prod | v4, MIT, Node 20+ |

## Env vars

Two new, taking prod from 5 → **7 total**. Both from the Upstash console (free tier:
10K commands/day, no credit card).

| Var | Where |
|-----|-------|
| `UPSTASH_REDIS_REST_URL` | `.env.local` + Vercel |
| `UPSTASH_REDIS_REST_TOKEN` | `.env.local` + Vercel |

`.env.local.example` gets both keys documented with no real values.

Because both new gates fail open, local development works with these unset — the rate
limit and email check simply pass through.

## Out of scope

Deliberately excluded to keep this focused (already tracked as optional hardening in the
task doc): server-side verification of reCAPTCHA's `action`/`hostname` fields, field
length caps, newline stripping in `name`, and clearing form fields after a successful
send.
