# Contact Form Anti-Spam Trio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the shipped `/contact` form against spam and Gmail-quota waste by adding three independent gates (honeypot, per-IP rate limit, DNS email deliverability) to the existing Server Action.

**Architecture:** Three new modules under `lib/contact/`, each independently unit-testable, wired into `submitContactForm` as ordered guard clauses. Follows the established 4-layer split (client → action orchestrator → lib modules). No changes to `mailer.ts` or `recaptcha.ts`.

**Tech Stack:** Next.js 16.2.10 Server Actions, TypeScript, vitest (jsdom env, globals enabled), `@upstash/ratelimit` + `@upstash/redis`, `node-email-verifier` v4.

## Global Constraints

- **A `'use server'` file may only export async functions.** Non-exported module-level consts are fine; exported consts and even `export type { X }` re-exports crash at runtime under SWC. This bit the project twice (bugs B5 and B6). Keep shared types/constants in plain modules under `lib/contact/`.
- **Both new network-dependent gates fail open.** `checkRateLimit` and `verifyEmailDeliverability` return an "allow" result when their infrastructure is missing, throws, or times out. A Redis or DNS outage must never block a real visitor.
- **Fail-open must be observable.** A gate that degrades returns `degraded: true` alongside `ok: true`, and the action logs it. Silent fail-open is indistinguishable from a working gate, which would let a misconfigured Upstash token disable the rate limit permanently with no symptom. Every gate outcome that is not "clean pass" gets a log line.
- **The honeypot returns a fake `success`**, byte-identical to the real success state. Any divergence teaches bots the trap exists.
- Guard order in `submitContactForm` is fixed: honeypot → validate → **reCAPTCHA token presence** → rate limit → email deliverability → reCAPTCHA verify → send.
  > **Amended after the final review.** This plan originally put the token-presence check *after* both network gates. That let an ad-blocked visitor (whose `getRecaptchaToken()` returns `''` — a known open bug) burn a rate-limit slot and fire a live DNS lookup on every attempt, then be told "you've sent a few messages already" having sent zero. The check is free and local, so it now runs ahead of both.
- Rate limit: **3 submissions per 10 minutes per IP**, sliding window.
- Email verifier options: `{ checkMx: true, checkDisposable: true, detailed: true, timeout: 3000 }`.
- Tests mock Upstash and `node-email-verifier`. **No network calls in tests.**
- Existing suite is 31 passing across 10 files. Every task must leave the full suite green.
- Test file convention: `lib/contact/__tests__/<module>.test.ts`, importing the module under test via relative path (`../honeypot`) and everything else via the `@/` alias.

---

### Task 1: Gate logging and honeypot

**Files:**
- Create: `lib/contact/gate-log.ts`
- Create: `lib/contact/__tests__/gate-log.test.ts`
- Create: `lib/contact/honeypot.ts`
- Create: `lib/contact/__tests__/honeypot.test.ts`
- Modify: `components/ContactForm.tsx` (add hidden input inside `<form>`, after the message `<div>`, before the submit `<button>`)
- Modify: `app/contact/actions.ts` (add guard clause 1)
- Modify: `app/contact/__tests__/actions.test.ts` (add honeypot mock + short-circuit test)

**Interfaces:**
- Consumes: `ContactFormState` from `@/lib/contact/state` (existing: `{ status: 'idle' | 'success' | 'error'; message: string }`)
- Produces:
  - `HONEYPOT_FIELD: string` (value `'company'`) and `isBot(formData: FormData): boolean`, both imported by `ContactForm.tsx` and `actions.ts`
  - `logGate(gate: string, outcome: 'blocked' | 'degraded', detail?: string): void` — used by every gate in Tasks 2 and 3

- [ ] **Step 0a: Write the failing logger test**

Create `lib/contact/__tests__/gate-log.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { logGate } from '../gate-log'

describe('logGate', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('prefixes every line so logs can be filtered in Vercel', () => {
    logGate('honeypot', 'blocked')
    expect(console.warn).toHaveBeenCalledWith('[contact-gate] honeypot blocked')
  })

  it('appends the detail when one is given', () => {
    logGate('ratelimit', 'degraded', 'redis unreachable')
    expect(console.warn).toHaveBeenCalledWith('[contact-gate] ratelimit degraded (redis unreachable)')
  })

  it('distinguishes a blocked outcome from a degraded one', () => {
    logGate('email-verify', 'blocked', 'mx')
    logGate('email-verify', 'degraded', 'dns timeout')
    expect(console.warn).toHaveBeenNthCalledWith(1, '[contact-gate] email-verify blocked (mx)')
    expect(console.warn).toHaveBeenNthCalledWith(2, '[contact-gate] email-verify degraded (dns timeout)')
  })
})
```

- [ ] **Step 0b: Run test to verify it fails**

Run: `npx vitest run lib/contact/__tests__/gate-log.test.ts`
Expected: FAIL — cannot resolve `../gate-log`.

- [ ] **Step 0c: Write the logger**

Create `lib/contact/gate-log.ts`:

```ts
/**
 * One-line structured log for any gate outcome that is not a clean pass.
 *
 * 'blocked'  — the gate did its job and rejected the submission.
 * 'degraded' — the gate let the submission through because its own infrastructure
 *              failed. This is the important one: without it, a broken Redis or a
 *              dead DNS resolver is indistinguishable from a healthy gate.
 *
 * console.warn lands in Vercel's runtime logs, filterable on the [contact-gate] prefix.
 */
export function logGate(gate: string, outcome: 'blocked' | 'degraded', detail?: string): void {
  console.warn(`[contact-gate] ${gate} ${outcome}${detail ? ` (${detail})` : ''}`)
}
```

> **Amended after implementation.** Honeypot hits were moved off this function onto a
> second emitter, `logHoneypot()`, with its own `[contact-honeypot]` prefix. The honeypot
> is the only gate a bot can trigger without limit (it runs before the rate limit by
> design), so on a shared prefix a flood would bury the `degraded` lines that are the sole
> signal a gate has silently stopped working. Every hit carries identical information, so
> nothing diagnostic is lost — only volume matters, and volume is still countable by
> grepping the honeypot prefix. The Task 1 test above therefore asserts against a real
> gate name rather than `'honeypot'`.

- [ ] **Step 0d: Run test to verify it passes**

Run: `npx vitest run lib/contact/__tests__/gate-log.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 1: Write the failing test**

Create `lib/contact/__tests__/honeypot.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { HONEYPOT_FIELD, isBot } from '../honeypot'

function formDataWith(fields: Record<string, string>) {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) fd.set(key, value)
  return fd
}

describe('isBot', () => {
  it('returns true when the honeypot field has a value', () => {
    expect(isBot(formDataWith({ [HONEYPOT_FIELD]: 'Acme Corp' }))).toBe(true)
  })

  it('returns false when the honeypot field is empty', () => {
    expect(isBot(formDataWith({ [HONEYPOT_FIELD]: '' }))).toBe(false)
  })

  it('returns false when the honeypot field is absent entirely', () => {
    expect(isBot(formDataWith({ name: 'Jane' }))).toBe(false)
  })

  it('returns false when the honeypot field holds only whitespace', () => {
    expect(isBot(formDataWith({ [HONEYPOT_FIELD]: '   ' }))).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/contact/__tests__/honeypot.test.ts`
Expected: FAIL — cannot resolve `../honeypot`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/contact/honeypot.ts`:

```ts
/**
 * Shared field name for the honeypot input. Exported as a single constant so the form
 * and the Server Action cannot drift apart — a mismatch would silently disable the trap
 * while every test still passed.
 */
export const HONEYPOT_FIELD = 'company'

export function isBot(formData: FormData): boolean {
  return String(formData.get(HONEYPOT_FIELD) ?? '').trim().length > 0
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/contact/__tests__/honeypot.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Add the hidden input to the form**

In `components/ContactForm.tsx`, add the import alongside the existing `state` import:

```tsx
import { HONEYPOT_FIELD } from '@/lib/contact/honeypot'
```

Then insert this block inside `<form>`, immediately after the message `<div>` and before the submit `<button>`:

```tsx
{/* Honeypot: positioned off-screen rather than display:none, because some bots skip
    display-hidden inputs. aria-hidden + tabIndex=-1 keep it away from screen readers
    and keyboard users. A filled value means a script filled it. */}
<div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
  <label htmlFor="contact-company">Company</label>
  <input
    id="contact-company"
    name={HONEYPOT_FIELD}
    type="text"
    tabIndex={-1}
    autoComplete="off"
  />
</div>
```

- [ ] **Step 6: Wire guard clause 1 into the action**

In `app/contact/actions.ts`, add the imports:

```ts
import { isBot } from '@/lib/contact/honeypot'
import { logGate } from '@/lib/contact/gate-log'
```

Add a non-exported module-level const (allowed in `'use server'`; only *exports* must be async functions):

```ts
const SUCCESS_STATE: ContactFormState = {
  status: 'success',
  message: "Thanks — I'll get back to you soon.",
}
```

Insert as the very first statement in the function body, above the `const name = ...` lines:

```ts
// Gate 1: honeypot. Returns a fake success — an error would teach the bot the trap exists.
// The log line is the ONLY way to know the trap ever fired, since the caller sees success.
if (isBot(formData)) {
  logGate('honeypot', 'blocked')
  return SUCCESS_STATE
}
```

Then change the final `return` of the function to use the same constant, so the fake and real success states cannot diverge:

```ts
return SUCCESS_STATE
```

- [ ] **Step 7: Write the failing action test**

In `app/contact/__tests__/actions.test.ts`, add this mock next to the existing `vi.mock` calls at the top of the file:

```ts
vi.mock('@/lib/contact/honeypot', () => ({
  HONEYPOT_FIELD: 'company',
  isBot: vi.fn(),
}))
```

Add to the imports below them:

```ts
import { isBot } from '@/lib/contact/honeypot'
```

Add to the existing `beforeEach` body:

```ts
vi.mocked(isBot).mockReturnValue(false)
```

Add this test inside the `describe('submitContactForm')` block:

```ts
it('returns a success state identical to a real send, and sends nothing, when the honeypot is tripped', async () => {
  // Capture the genuine success state FIRST, while isBot is still false. Comparing
  // two trapped calls would pass trivially and prove nothing.
  const realSuccess = await submitContactForm(
    initialContactFormState,
    formDataWith({ name: 'Jane', email: 'jane@example.com', message: 'hi', recaptchaToken: 'tok' })
  )
  expect(sendContactEmail).toHaveBeenCalledTimes(1)

  vi.mocked(sendContactEmail).mockClear()
  vi.mocked(isBot).mockReturnValue(true)

  const trapped = await submitContactForm(
    initialContactFormState,
    formDataWith({
      name: 'Jane',
      email: 'jane@example.com',
      message: 'hi',
      company: 'Acme Corp',
      recaptchaToken: 'tok',
    })
  )

  expect(trapped).toEqual(realSuccess)
  expect(trapped.status).toBe('success')
  expect(sendContactEmail).not.toHaveBeenCalled()
})

it('skips validation, recaptcha and the mailer entirely when the honeypot is tripped', async () => {
  vi.mocked(isBot).mockReturnValue(true)

  await submitContactForm(
    initialContactFormState,
    formDataWith({ name: 'Jane', email: 'jane@example.com', message: 'hi', company: 'Acme' })
  )

  expect(validateContactInput).not.toHaveBeenCalled()
  expect(verifyRecaptcha).not.toHaveBeenCalled()
  expect(sendContactEmail).not.toHaveBeenCalled()
})
```

- [ ] **Step 8: Run the full suite**

Run: `npx vitest run`
Expected: PASS. 31 existing + 3 gate-log + 4 honeypot + 2 action = 40 tests.

- [ ] **Step 9: Verify the honeypot is genuinely hidden from assistive tech**

Run: `npx vitest run components/__tests__/ContactForm.test.tsx`
Expected: PASS — the existing tests still find the real fields by accessible name. The honeypot's `aria-hidden` keeps it out of the accessibility tree, so it must not appear in any `getByRole` query.

- [ ] **Step 10: Build**

Run: `npm run build`
Expected: clean. In particular no "can only export async functions" error from `actions.ts` — that is the B5/B6 trap and `SUCCESS_STATE` must stay non-exported.

- [ ] **Step 11: Commit**

```bash
git add lib/contact/gate-log.ts lib/contact/__tests__/gate-log.test.ts lib/contact/honeypot.ts lib/contact/__tests__/honeypot.test.ts components/ContactForm.tsx app/contact/actions.ts app/contact/__tests__/actions.test.ts
git commit -m "feat(contact): add honeypot gate with observable outcome logging"
```

---

### Task 2: Per-IP rate limit

**Files:**
- Create: `lib/contact/ratelimit.ts`
- Create: `lib/contact/__tests__/ratelimit.test.ts`
- Modify: `app/contact/actions.ts` (add guard clause 3)
- Modify: `app/contact/__tests__/actions.test.ts` (mock `next/headers` + rate limit, add ordering test)
- Modify: `.env.local.example` (document the two new keys)
- Modify: `package.json` (two new prod deps)

**Interfaces:**
- Consumes: `HONEYPOT_FIELD`, `isBot` from Task 1
- Produces:
  - `clientIpFromForwardedFor(value: string | null): string` — returns `''` when the header is absent or empty
  - `checkRateLimit(ip: string): Promise<{ ok: boolean; degraded?: boolean }>` — `degraded: true` means the gate let the request through because its infrastructure failed, not because the request was under the limit
  - `RATE_LIMIT_MAX: number` (3), `RATE_LIMIT_WINDOW: string` (`'10 m'`)

- [ ] **Step 1: Install dependencies**

Run: `npm install @upstash/ratelimit @upstash/redis`
Expected: both added to `dependencies` in `package.json`.

- [ ] **Step 2: Write the failing test**

Create `lib/contact/__tests__/ratelimit.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const limitMock = vi.fn()
const fromEnvMock = vi.fn()

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: Object.assign(
    vi.fn(() => ({ limit: limitMock })),
    { slidingWindow: vi.fn(() => 'sliding-window-limiter') }
  ),
}))
vi.mock('@upstash/redis', () => ({
  Redis: { fromEnv: fromEnvMock },
}))

import { checkRateLimit, clientIpFromForwardedFor } from '../ratelimit'

describe('clientIpFromForwardedFor', () => {
  it('takes the first entry of a comma-separated chain', () => {
    expect(clientIpFromForwardedFor('203.0.113.1, 70.41.3.18')).toBe('203.0.113.1')
  })

  it('trims surrounding whitespace', () => {
    expect(clientIpFromForwardedFor('  203.0.113.1  ')).toBe('203.0.113.1')
  })

  it('returns an empty string when the header is missing', () => {
    expect(clientIpFromForwardedFor(null)).toBe('')
  })

  it('returns an empty string when the header is empty', () => {
    expect(clientIpFromForwardedFor('')).toBe('')
  })
})

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
    fromEnvMock.mockReturnValue({})
  })

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('allows a request under the limit, and does not mark it degraded', async () => {
    limitMock.mockResolvedValue({ success: true })
    await expect(checkRateLimit('203.0.113.1')).resolves.toEqual({ ok: true, degraded: false })
  })

  it('blocks a request over the limit', async () => {
    limitMock.mockResolvedValue({ success: false })
    await expect(checkRateLimit('203.0.113.1')).resolves.toEqual({ ok: false, degraded: false })
  })

  it('fails open AND flags degraded when the Redis client throws', async () => {
    limitMock.mockRejectedValue(new Error('Redis unreachable'))
    await expect(checkRateLimit('203.0.113.1')).resolves.toEqual({ ok: true, degraded: true })
  })

  it('fails open AND flags degraded when Redis.fromEnv throws because env vars are missing', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    fromEnvMock.mockImplementation(() => {
      throw new Error('missing env')
    })
    await expect(checkRateLimit('203.0.113.1')).resolves.toEqual({ ok: true, degraded: true })
  })

  it('fails open AND flags degraded when the IP is unknown', async () => {
    await expect(checkRateLimit('')).resolves.toEqual({ ok: true, degraded: true })
    expect(limitMock).not.toHaveBeenCalled()
  })

  it('keys the limit on the IP address', async () => {
    limitMock.mockResolvedValue({ success: true })
    await checkRateLimit('203.0.113.1')
    expect(limitMock).toHaveBeenCalledWith('203.0.113.1')
  })
})
```

The `degraded` flag is what makes a silently-broken Redis visible. Without it, a missing
Upstash token and a healthy under-limit request both return `{ ok: true }` and nothing
downstream can tell them apart.

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run lib/contact/__tests__/ratelimit.test.ts`
Expected: FAIL — cannot resolve `../ratelimit`.

- [ ] **Step 4: Write minimal implementation**

Create `lib/contact/ratelimit.ts`:

```ts
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run lib/contact/__tests__/ratelimit.test.ts`
Expected: PASS, 10 tests (4 for clientIpFromForwardedFor, 6 for checkRateLimit).

- [ ] **Step 6: Wire guard clause 3 into the action**

In `app/contact/actions.ts`, add these imports:

```ts
import { headers } from 'next/headers'
import { checkRateLimit, clientIpFromForwardedFor } from '@/lib/contact/ratelimit'
```

Insert immediately **after** the existing `validateContactInput` block and **before** the `if (!token)` check:

```ts
// Gate 3: per-IP rate limit. After validation so honest empty-field mistakes don't
// consume the budget. A Server Action has no request object, so the IP comes from
// the async headers() store.
const headerList = await headers()
const ip = clientIpFromForwardedFor(headerList.get('x-forwarded-for'))
const rateLimit = await checkRateLimit(ip)
if (rateLimit.degraded) {
  logGate('ratelimit', 'degraded', ip ? 'upstash unavailable' : 'no client ip')
}
if (!rateLimit.ok) {
  logGate('ratelimit', 'blocked')
  return {
    status: 'error',
    message: "You've sent a few messages already. Please try again in a little while.",
  }
}
```

Note: `headers()` is async in Next 16 and must be awaited.

- [ ] **Step 7: Write the failing action test**

In `app/contact/__tests__/actions.test.ts`, add these mocks alongside the existing ones:

```ts
vi.mock('next/headers', () => ({
  headers: vi.fn(),
}))
vi.mock('@/lib/contact/ratelimit', () => ({
  checkRateLimit: vi.fn(),
  clientIpFromForwardedFor: vi.fn(),
}))
vi.mock('@/lib/contact/gate-log', () => ({
  logGate: vi.fn(),
}))
```

Add to the imports:

```ts
import { headers } from 'next/headers'
import { checkRateLimit, clientIpFromForwardedFor } from '@/lib/contact/ratelimit'
import { logGate } from '@/lib/contact/gate-log'
```

The existing `beforeEach` does **not** call `vi.clearAllMocks()`, so call-count assertions
on `logGate` would leak between tests. Add it as the FIRST line of the `beforeEach`, above
the existing `mockReturnValue` lines (clearing resets implementations set by
`mockReturnValue`, so order matters):

```ts
vi.clearAllMocks()
```

Then add to the same `beforeEach` body, after the existing lines:

```ts
vi.mocked(headers).mockResolvedValue({
  get: vi.fn(() => '203.0.113.1'),
} as unknown as Awaited<ReturnType<typeof headers>>)
vi.mocked(clientIpFromForwardedFor).mockReturnValue('203.0.113.1')
vi.mocked(checkRateLimit).mockResolvedValue({ ok: true, degraded: false })
```

Add these tests inside the `describe('submitContactForm')` block:

```ts
it('returns an error and never reaches recaptcha or the mailer when rate limited', async () => {
  vi.mocked(checkRateLimit).mockResolvedValue({ ok: false, degraded: false })

  const result = await submitContactForm(
    initialContactFormState,
    formDataWith({ name: 'Jane', email: 'jane@example.com', message: 'hi', recaptchaToken: 'tok' })
  )

  expect(result.status).toBe('error')
  expect(verifyRecaptcha).not.toHaveBeenCalled()
  expect(sendContactEmail).not.toHaveBeenCalled()
})

it('checks the rate limit only after validation passes', async () => {
  vi.mocked(validateContactInput).mockReturnValue('Please enter your name.')

  await submitContactForm(
    initialContactFormState,
    formDataWith({ name: '', email: 'jane@example.com', message: 'hi', recaptchaToken: 'tok' })
  )

  expect(checkRateLimit).not.toHaveBeenCalled()
})

it('logs a degraded warning when the rate limit let the request through on a failure', async () => {
  vi.mocked(checkRateLimit).mockResolvedValue({ ok: true, degraded: true })

  const result = await submitContactForm(
    initialContactFormState,
    formDataWith({ name: 'Jane', email: 'jane@example.com', message: 'hi', recaptchaToken: 'tok' })
  )

  // Degraded must NOT block the visitor, but must leave a trace.
  expect(result.status).toBe('success')
  expect(logGate).toHaveBeenCalledWith('ratelimit', 'degraded', expect.any(String))
})

it('logs nothing for the rate limit on a clean pass', async () => {
  await submitContactForm(
    initialContactFormState,
    formDataWith({ name: 'Jane', email: 'jane@example.com', message: 'hi', recaptchaToken: 'tok' })
  )

  // A fully clean submission passes every gate, so nothing should be logged at all.
  // Asserting on argument shapes here would silently miss a single-argument call.
  expect(logGate).not.toHaveBeenCalled()
})
```

- [ ] **Step 8: Run the full suite**

Run: `npx vitest run`
Expected: PASS. 40 from Task 1 + 10 ratelimit + 4 action = 54 tests.

- [ ] **Step 9: Document the env vars**

Append to `.env.local.example`:

```
# Upstash Redis — backs the contact form's per-IP rate limit (3 submissions / 10 min).
# Free tier, no credit card: https://console.upstash.com/redis
# Both gates fail open, so local development works with these unset.
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

- [ ] **Step 10: Build**

Run: `npm run build`
Expected: clean. The lazy `getLimiter()` means the missing env vars must NOT break the build.

- [ ] **Step 11: Commit**

```bash
git add lib/contact/ratelimit.ts lib/contact/__tests__/ratelimit.test.ts app/contact/actions.ts app/contact/__tests__/actions.test.ts .env.local.example package.json package-lock.json
git commit -m "feat(contact): add per-IP sliding-window rate limit that fails open"
```

---

### Task 3: Email deliverability

**Files:**
- Create: `lib/contact/email-verify.ts`
- Create: `lib/contact/__tests__/email-verify.test.ts`
- Modify: `app/contact/actions.ts` (add guard clause 4)
- Modify: `app/contact/__tests__/actions.test.ts` (mock + ordering test)
- Modify: `package.json` (one new prod dep)

**Interfaces:**
- Consumes: everything from Tasks 1 and 2
- Produces: `verifyEmailDeliverability(email: string): Promise<{ ok: boolean; reason?: 'mx' | 'disposable' | 'format'; degraded: boolean }>` — `degraded: true` means the DNS lookup failed and the address was allowed through unchecked

- [ ] **Step 1: Install the dependency**

Run: `npm install node-email-verifier`
Expected: added to `dependencies`.

- [ ] **Step 2: Confirm the library's actual result shape before writing code**

Run: `cat node_modules/node-email-verifier/dist/index.d.ts`

The spec states that `detailed: true` yields `{ valid, format, mx, disposable }`. **Read the installed type definitions and confirm this**, including whether the default export is the validator function and whether the sub-results are booleans or objects carrying their own `valid` field. If the real shape differs, adapt Steps 3 and 5 to match the installed version and note the deviation in the commit message. Do not guess.

- [ ] **Step 3: Write the failing test**

Create `lib/contact/__tests__/email-verify.test.ts`. Adjust the mocked resolve values if Step 2 showed a different shape:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

const validatorMock = vi.fn()

vi.mock('node-email-verifier', () => ({
  default: validatorMock,
}))

import { verifyEmailDeliverability } from '../email-verify'

describe('verifyEmailDeliverability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes an address whose domain has MX records and is not disposable', async () => {
    validatorMock.mockResolvedValue({ valid: true, format: true, mx: true, disposable: false })
    await expect(verifyEmailDeliverability('jane@gmail.com')).resolves.toEqual({
      ok: true,
      degraded: false,
    })
  })

  it('blocks an address whose domain has no MX records', async () => {
    validatorMock.mockResolvedValue({ valid: false, format: true, mx: false, disposable: false })
    const result = await verifyEmailDeliverability('jane@gmial.com')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('mx')
    expect(result.degraded).toBe(false)
  })

  it('blocks a disposable address', async () => {
    validatorMock.mockResolvedValue({ valid: false, format: true, mx: true, disposable: true })
    const result = await verifyEmailDeliverability('jane@mailinator.com')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('disposable')
    expect(result.degraded).toBe(false)
  })

  it('fails open AND flags degraded when the library throws on DNS timeout', async () => {
    validatorMock.mockRejectedValue(new Error('DNS lookup timed out'))
    await expect(verifyEmailDeliverability('jane@gmail.com')).resolves.toEqual({
      ok: true,
      degraded: true,
    })
  })

  it('calls the library with MX, disposable, detailed and a 3s timeout', async () => {
    validatorMock.mockResolvedValue({ valid: true, format: true, mx: true, disposable: false })
    await verifyEmailDeliverability('jane@gmail.com')
    expect(validatorMock).toHaveBeenCalledWith('jane@gmail.com', {
      checkMx: true,
      checkDisposable: true,
      detailed: true,
      timeout: 3000,
    })
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run lib/contact/__tests__/email-verify.test.ts`
Expected: FAIL — cannot resolve `../email-verify`.

- [ ] **Step 5: Write minimal implementation**

Create `lib/contact/email-verify.ts`:

```ts
import emailValidator from 'node-email-verifier'

export type DeliverabilityResult = {
  ok: boolean
  reason?: 'mx' | 'disposable' | 'format'
  degraded: boolean
}

/**
 * MX + disposable-domain check. Deliberately does NOT attempt per-mailbox verification:
 * Gmail/Yahoo/Mail.com return SMTP 250 OK for every address as an anti-harvesting
 * defence, so no tool can tell a real gmail from a fake one.
 *
 * Fails OPEN. The library does NOT throw on most DNS failures — checkMxRecords catches
 * ECONNREFUSED/ENOTFOUND/ENODATA/ETIMEDOUT internally and returns `mx.valid: false` with
 * an errorCode of DNS_LOOKUP_FAILED/MX_LOOKUP_FAILED instead. Only its own 3s internal
 * race actually throws. The try/catch here is still required for that race, but the
 * degraded/blocked distinction downstream must not assume a caught error is the only
 * failure path — a returned mx.valid:false has to be told apart from a genuine
 * NO_MX_RECORDS typo-domain verdict, which must stay a hard block.
 */
export async function verifyEmailDeliverability(email: string): Promise<DeliverabilityResult> {
  try {
    const result = await emailValidator(email, {
      checkMx: true,
      checkDisposable: true,
      detailed: true,
      timeout: 3000,
    })

    if (result.valid) return { ok: true, degraded: false }
    if (result.disposable) return { ok: false, reason: 'disposable', degraded: false }
    if (!result.mx) return { ok: false, reason: 'mx', degraded: false }
    return { ok: false, reason: 'format', degraded: false }
  } catch {
    return { ok: true, degraded: true }
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run lib/contact/__tests__/email-verify.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 7: Wire guard clause 4 into the action**

In `app/contact/actions.ts`, add the import:

```ts
import { verifyEmailDeliverability } from '@/lib/contact/email-verify'
```

Insert immediately **after** the rate limit block and **before** the `if (!token)` check:

```ts
// Gate 4: MX + disposable check. Catches typo domains (gmial.com) as much as throwaway
// providers — a mistyped address would never receive the confirmation email anyway.
const deliverability = await verifyEmailDeliverability(email)
if (deliverability.degraded) {
  logGate('email-verify', 'degraded', 'dns lookup failed')
}
if (!deliverability.ok) {
  logGate('email-verify', 'blocked', deliverability.reason)
  return {
    status: 'error',
    message:
      deliverability.reason === 'disposable'
        ? 'Please use a permanent email address so I can reply.'
        : "That email address doesn't look reachable. Please check it and try again.",
  }
}
```

- [ ] **Step 8: Write the failing action test**

In `app/contact/__tests__/actions.test.ts`, add the mock:

```ts
vi.mock('@/lib/contact/email-verify', () => ({
  verifyEmailDeliverability: vi.fn(),
}))
```

Add to the imports:

```ts
import { verifyEmailDeliverability } from '@/lib/contact/email-verify'
```

Add to the existing `beforeEach` body:

```ts
vi.mocked(verifyEmailDeliverability).mockResolvedValue({ ok: true, degraded: false })
```

Add these tests:

```ts
it('returns an error and never reaches recaptcha when the address is undeliverable', async () => {
  vi.mocked(verifyEmailDeliverability).mockResolvedValue({ ok: false, reason: 'mx', degraded: false })

  const result = await submitContactForm(
    initialContactFormState,
    formDataWith({ name: 'Jane', email: 'jane@gmial.com', message: 'hi', recaptchaToken: 'tok' })
  )

  expect(result.status).toBe('error')
  expect(verifyRecaptcha).not.toHaveBeenCalled()
  expect(sendContactEmail).not.toHaveBeenCalled()
})

it('gives a disposable address its own distinct message', async () => {
  vi.mocked(verifyEmailDeliverability).mockResolvedValue({ ok: false, reason: 'disposable', degraded: false })

  const result = await submitContactForm(
    initialContactFormState,
    formDataWith({ name: 'Jane', email: 'j@mailinator.com', message: 'hi', recaptchaToken: 'tok' })
  )

  expect(result.message).toMatch(/permanent email address/i)
})

it('checks deliverability only after the rate limit passes', async () => {
  vi.mocked(checkRateLimit).mockResolvedValue({ ok: false, degraded: false })

  await submitContactForm(
    initialContactFormState,
    formDataWith({ name: 'Jane', email: 'jane@example.com', message: 'hi', recaptchaToken: 'tok' })
  )

  expect(verifyEmailDeliverability).not.toHaveBeenCalled()
})
```

- [ ] **Step 9: Run the full suite**

Run: `npx vitest run`
Expected: PASS. Actual final count after the whole-branch review's fix wave: 83 tests across 14 files.

- [ ] **Step 10: Build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 11: Commit**

```bash
git add lib/contact/email-verify.ts lib/contact/__tests__/email-verify.test.ts app/contact/actions.ts app/contact/__tests__/actions.test.ts package.json package-lock.json
git commit -m "feat(contact): block undeliverable and disposable addresses, failing open"
```

---

### Task 4: End-to-end verification and documentation

**Files:**
- Modify: `tasks/portfolio/contact-form/current.md`
- Modify: `AGENTS.md` (gotcha rows only if a new one was genuinely discovered)

**Interfaces:**
- Consumes: all three gates from Tasks 1 to 3
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Read the final action top to bottom and confirm guard order**

Run: `cat app/contact/actions.ts`

Confirm the order is exactly: `isBot` → `validateContactInput` → `checkRateLimit` → `verifyEmailDeliverability` → token presence → `verifyRecaptcha` → `sendContactEmail`. Confirm `SUCCESS_STATE` is **not** exported.

- [ ] **Step 2: Confirm the honeypot is invisible in a real browser**

Run: `npm run dev`, open `http://localhost:3000/contact`, and confirm by inspection that no "Company" field is visible, that Tab from the Message textarea lands on the Send button, and that submitting the form normally still works and produces a success message.

- [ ] **Step 3: Confirm the trio fails open with no Upstash credentials**

With `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` absent from `.env.local`, submit the form on localhost. Expected: the submission proceeds past both new network gates. This is the fail-open guarantee, and local dev is the only place it can be observed directly.

Note: if `.next/cache` serves a stale bundle after editing `lib/contact/` or `app/contact/`, clear it and restart `npm run dev`. This has bitten the project repeatedly.

- [ ] **Step 3b: Run every probe in the "How to verify each gate" section against localhost**

Work through the honeypot, rate limit, and email deliverability probes below, including
each one's control case. Record the actual log lines observed. A probe that produces no
log line is a failing gate and blocks this task.

- [ ] **Step 4: Run the full verification set**

```bash
npx vitest run
npm run build
```

Expected: 83 tests passing across 14 files, build clean.

- [ ] **Step 5: Update the task doc**

In `tasks/portfolio/contact-form/current.md`:
- Flip Task Status row 4 from `📋 Design approved, not built` to built.
- Update the `Status:` line in the LLM-CONTEXT header.
- Move the anti-spam item out of `## Next Steps` into the completed set.
- Add a Key Technical Decisions row recording the fail-open choice for both network gates, and the fake-success choice for the honeypot.
- Record in `## Critical Gotchas` that `node-email-verifier` throws rather than returning falsy on timeout.
- **Do not** mark anything as deployed. That happens at ship time, from the verified outcome.

Then grep the whole doc for stale restatements, with a control that must hit:

```bash
grep -n "not built\|Design approved\|📋" tasks/portfolio/contact-form/current.md
grep -c "contact" tasks/portfolio/contact-form/current.md
```

Expected: first command returns nothing, second returns a non-zero count proving the grep works.

- [ ] **Step 6: Re-index GitNexus**

Run: `node .gitnexus/run.cjs analyze`

- [ ] **Step 7: Commit**

```bash
git add tasks/portfolio/contact-form/current.md AGENTS.md CLAUDE.md .gitnexus
git commit -m "docs: record anti-spam trio implementation and fail-open decisions"
```

---

## Deferred to ship time

The rate limit does nothing in production until an Upstash account exists. After this plan is complete, the user must:

1. Create a free Upstash Redis database at `https://console.upstash.com/redis`.
2. Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to `.env.local` and to Vercel, taking prod from 5 to 7 env vars.
3. Redeploy. Both are server-side vars, so they are read per request and no rebuild is strictly required, but a redeploy is the simplest way to be certain.

Until then the gate fails open on every request and the form behaves exactly as it does today.

## How to verify each gate is actually working

This is the answer to "how do I know it really succeeded?" Every gate is silent by design,
so each one needs a deliberate probe. Run these against localhost first, then production.

### Reading the logs

Gate activity uses two prefixes: `[contact-gate]` for the rate-limit and email gates, `[contact-honeypot]` for honeypot hits (kept separate so bot volume cannot bury a degraded line). Two places to look:

- **Local:** the `npm run dev` terminal.
- **Production:** Vercel dashboard → your project → **Logs** → filter on `contact-gate` and `contact-honeypot`.
  Or `npx vercel logs <deployment-url>` from the CLI.

**A completely quiet log is ambiguous**, and this matters. It means either "no spam
arrived" or "every gate is broken." Use the probes below to force a known-bad submission
and confirm the expected line appears. A probe that produces no log line is a failing gate,
not a quiet day.

### Gate 1 — Honeypot

The UI shows success either way, so the log line is the only signal.

1. Open `/contact`, open devtools, run in the console:
   `document.querySelector('input[name="company"]').value = 'bot'`
2. Fill the real fields normally and submit.
3. **Expect:** the success message appears, **no email arrives**, and the log shows
   `[contact-honeypot] blocked`.
4. **Control:** submit again without touching the hidden field. An email must arrive and
   no honeypot line must appear. Skipping this control means a gate that blocks
   *everything* would look identical to a gate that works.

### Gate 3 — Rate limit

1. Submit the form 4 times within 10 minutes with valid details.
2. **Expect:** submissions 1 to 3 succeed; the 4th returns "You've sent a few messages
   already" and logs `[contact-gate] ratelimit blocked`.
3. **Independent confirmation:** the Upstash console shows a daily command counter. If it
   reads 0 after your submissions, the gate never ran, regardless of what the form did.
4. **The failure you are actually hunting for:** `[contact-gate] ratelimit degraded`.
   Seeing this in production means the Upstash env vars are missing or wrong in Vercel and
   the rate limit is doing nothing. The form still works, which is why nothing else would
   have told you.

### Gate 4 — Email deliverability

1. Submit with `test@gmial.com` (deliberate typo, no MX record).
   **Expect:** "That email address doesn't look reachable" and
   `[contact-gate] email-verify blocked (mx)`.
2. Submit with `test@mailinator.com`.
   **Expect:** "Please use a permanent email address" and
   `[contact-gate] email-verify blocked (disposable)`.
3. Submit with your own real address.
   **Expect:** it goes through, with no `email-verify` line at all.
4. `[contact-gate] email-verify degraded` in production means DNS lookups are failing and
   every address is being waved through unchecked.

### Gate 5 — reCAPTCHA (already live)

Already verified in production. Its score threshold is 0.5 in `lib/contact/recaptcha.ts`.
There is no log line for it today; adding one is not in this plan's scope.

### Quick reference

Two prefixes, deliberately separate. `[contact-honeypot]` is bot volume you can ignore;
`[contact-gate]` is everything that might need you. Keeping them apart means a bot flood
cannot bury a `degraded` line.

| Log line | Meaning | Action needed |
|---|---|---|
| `[contact-honeypot] blocked` | A bot was trapped | None, working as designed |
| `[contact-gate] ratelimit blocked` | Someone hit 4 submissions in 10 min | None, unless it's you testing |
| `[contact-gate] ratelimit degraded (not-configured)` | **Upstash env vars are missing in Vercel** | Set them, or the rate limit does nothing |
| `[contact-gate] ratelimit degraded (timeout)` | **Upstash is slow; limit not enforced** | Check Upstash status |
| `[contact-gate] ratelimit degraded (unavailable)` | **Upstash threw; limit not enforced** | Check credentials and Upstash status |
| `[contact-gate] ratelimit degraded (no-ip)` | No `x-forwarded-for` on the request | Expected locally; investigate if seen in production |
| `[contact-gate] email-verify blocked (mx)` | Typo or dead domain rejected | None |
| `[contact-gate] email-verify blocked (disposable)` | Throwaway address rejected | None |
| `[contact-gate] email-verify degraded` | **Email checking is not running** | Check DNS reachability from Vercel |
| *nothing on either prefix, ever* | Either no spam, or everything is broken | Run the probes above to disambiguate |

## Out of scope

Tracked as optional hardening in `tasks/portfolio/contact-form/current.md`, deliberately excluded here: server-side verification of reCAPTCHA's `action`/`hostname` fields, field length caps, newline stripping in `name`, clearing form fields after a successful send, and the reCAPTCHA-blocked fallback contact channel (still awaiting the user's decision).
