# Contact Form Anti-Spam Trio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the shipped `/contact` form against spam and Gmail-quota waste by adding three independent gates (honeypot, per-IP rate limit, DNS email deliverability) to the existing Server Action.

**Architecture:** Three new modules under `lib/contact/`, each independently unit-testable, wired into `submitContactForm` as ordered guard clauses. Follows the established 4-layer split (client → action orchestrator → lib modules). No changes to `mailer.ts` or `recaptcha.ts`.

**Tech Stack:** Next.js 16.2.10 Server Actions, TypeScript, vitest (jsdom env, globals enabled), `@upstash/ratelimit` + `@upstash/redis`, `node-email-verifier` v4.

## Global Constraints

- **A `'use server'` file may only export async functions.** Non-exported module-level consts are fine; exported consts and even `export type { X }` re-exports crash at runtime under SWC. This bit the project twice (bugs B5 and B6). Keep shared types/constants in plain modules under `lib/contact/`.
- **Both new network-dependent gates fail open.** `checkRateLimit` and `verifyEmailDeliverability` return an "allow" result when their infrastructure is missing, throws, or times out. A Redis or DNS outage must never block a real visitor.
- **The honeypot returns a fake `success`**, byte-identical to the real success state. Any divergence teaches bots the trap exists.
- Guard order in `submitContactForm` is fixed: honeypot → validate → rate limit → email deliverability → reCAPTCHA → send.
- Rate limit: **3 submissions per 10 minutes per IP**, sliding window.
- Email verifier options: `{ checkMx: true, checkDisposable: true, detailed: true, timeout: 3000 }`.
- Tests mock Upstash and `node-email-verifier`. **No network calls in tests.**
- Existing suite is 31 passing across 10 files. Every task must leave the full suite green.
- Test file convention: `lib/contact/__tests__/<module>.test.ts`, importing the module under test via relative path (`../honeypot`) and everything else via the `@/` alias.

---

### Task 1: Honeypot

**Files:**
- Create: `lib/contact/honeypot.ts`
- Create: `lib/contact/__tests__/honeypot.test.ts`
- Modify: `components/ContactForm.tsx` (add hidden input inside `<form>`, after the message `<div>`, before the submit `<button>`)
- Modify: `app/contact/actions.ts` (add guard clause 1)
- Modify: `app/contact/__tests__/actions.test.ts` (add honeypot mock + short-circuit test)

**Interfaces:**
- Consumes: `ContactFormState` from `@/lib/contact/state` (existing: `{ status: 'idle' | 'success' | 'error'; message: string }`)
- Produces: `HONEYPOT_FIELD: string` (value `'company'`) and `isBot(formData: FormData): boolean`, both imported by `ContactForm.tsx` and `actions.ts`

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

In `app/contact/actions.ts`, add the import:

```ts
import { isBot } from '@/lib/contact/honeypot'
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
if (isBot(formData)) {
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
Expected: PASS. 31 existing + 4 honeypot + 2 action = 37 tests.

- [ ] **Step 9: Verify the honeypot is genuinely hidden from assistive tech**

Run: `npx vitest run components/__tests__/ContactForm.test.tsx`
Expected: PASS — the existing tests still find the real fields by accessible name. The honeypot's `aria-hidden` keeps it out of the accessibility tree, so it must not appear in any `getByRole` query.

- [ ] **Step 10: Build**

Run: `npm run build`
Expected: clean. In particular no "can only export async functions" error from `actions.ts` — that is the B5/B6 trap and `SUCCESS_STATE` must stay non-exported.

- [ ] **Step 11: Commit**

```bash
git add lib/contact/honeypot.ts lib/contact/__tests__/honeypot.test.ts components/ContactForm.tsx app/contact/actions.ts app/contact/__tests__/actions.test.ts
git commit -m "feat(contact): add honeypot gate returning fake success to bots"
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
  - `checkRateLimit(ip: string): Promise<{ ok: boolean }>`
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

  it('allows a request under the limit', async () => {
    limitMock.mockResolvedValue({ success: true })
    await expect(checkRateLimit('203.0.113.1')).resolves.toEqual({ ok: true })
  })

  it('blocks a request over the limit', async () => {
    limitMock.mockResolvedValue({ success: false })
    await expect(checkRateLimit('203.0.113.1')).resolves.toEqual({ ok: false })
  })

  it('fails open when the Redis client throws', async () => {
    limitMock.mockRejectedValue(new Error('Redis unreachable'))
    await expect(checkRateLimit('203.0.113.1')).resolves.toEqual({ ok: true })
  })

  it('fails open when Redis.fromEnv throws because env vars are missing', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    fromEnvMock.mockImplementation(() => {
      throw new Error('missing env')
    })
    await expect(checkRateLimit('203.0.113.1')).resolves.toEqual({ ok: true })
  })

  it('fails open when the IP is empty', async () => {
    await expect(checkRateLimit('')).resolves.toEqual({ ok: true })
    expect(limitMock).not.toHaveBeenCalled()
  })

  it('keys the limit on the IP address', async () => {
    limitMock.mockResolvedValue({ success: true })
    await checkRateLimit('203.0.113.1')
    expect(limitMock).toHaveBeenCalledWith('203.0.113.1')
  })
})
```

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

/**
 * Sliding window, keyed by IP. Fails OPEN: a Redis outage, a timeout, missing env vars,
 * or an unknown IP all return { ok: true }. Losing a real message costs more than
 * admitting one spam, and reCAPTCHA is still in front of the mailer.
 */
export async function checkRateLimit(ip: string): Promise<{ ok: boolean }> {
  if (!ip) return { ok: true }

  try {
    const { success } = await getLimiter().limit(ip)
    return { ok: success }
  } catch {
    return { ok: true }
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run lib/contact/__tests__/ratelimit.test.ts`
Expected: PASS, 11 tests.

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
const { ok: withinRateLimit } = await checkRateLimit(ip)
if (!withinRateLimit) {
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
```

Add to the imports:

```ts
import { headers } from 'next/headers'
import { checkRateLimit, clientIpFromForwardedFor } from '@/lib/contact/ratelimit'
```

Add to the existing `beforeEach` body:

```ts
vi.mocked(headers).mockResolvedValue({
  get: vi.fn(() => '203.0.113.1'),
} as unknown as Awaited<ReturnType<typeof headers>>)
vi.mocked(clientIpFromForwardedFor).mockReturnValue('203.0.113.1')
vi.mocked(checkRateLimit).mockResolvedValue({ ok: true })
```

Add these tests inside the `describe('submitContactForm')` block:

```ts
it('returns an error and never reaches recaptcha or the mailer when rate limited', async () => {
  vi.mocked(checkRateLimit).mockResolvedValue({ ok: false })

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
```

- [ ] **Step 8: Run the full suite**

Run: `npx vitest run`
Expected: PASS. 37 from Task 1 + 11 ratelimit + 2 action = 50 tests.

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
- Produces: `verifyEmailDeliverability(email: string): Promise<{ ok: boolean; reason?: string }>` where `reason` is one of `'mx'`, `'disposable'`, or `'format'`

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
    await expect(verifyEmailDeliverability('jane@gmail.com')).resolves.toEqual({ ok: true })
  })

  it('blocks an address whose domain has no MX records', async () => {
    validatorMock.mockResolvedValue({ valid: false, format: true, mx: false, disposable: false })
    const result = await verifyEmailDeliverability('jane@gmial.com')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('mx')
  })

  it('blocks a disposable address', async () => {
    validatorMock.mockResolvedValue({ valid: false, format: true, mx: true, disposable: true })
    const result = await verifyEmailDeliverability('jane@mailinator.com')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('disposable')
  })

  it('fails open when the library throws on DNS timeout', async () => {
    validatorMock.mockRejectedValue(new Error('DNS lookup timed out'))
    await expect(verifyEmailDeliverability('jane@gmail.com')).resolves.toEqual({ ok: true })
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

export type DeliverabilityResult = { ok: boolean; reason?: 'mx' | 'disposable' | 'format' }

/**
 * MX + disposable-domain check. Deliberately does NOT attempt per-mailbox verification:
 * Gmail/Yahoo/Mail.com return SMTP 250 OK for every address as an anti-harvesting
 * defence, so no tool can tell a real gmail from a fake one.
 *
 * Fails OPEN. The library THROWS on DNS timeout rather than returning a falsy result,
 * so the call must stay wrapped — a flaky DNS lookup must not cost a real message.
 */
export async function verifyEmailDeliverability(email: string): Promise<DeliverabilityResult> {
  try {
    const result = await emailValidator(email, {
      checkMx: true,
      checkDisposable: true,
      detailed: true,
      timeout: 3000,
    })

    if (result.valid) return { ok: true }
    if (result.disposable) return { ok: false, reason: 'disposable' }
    if (!result.mx) return { ok: false, reason: 'mx' }
    return { ok: false, reason: 'format' }
  } catch {
    return { ok: true }
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
if (!deliverability.ok) {
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
vi.mocked(verifyEmailDeliverability).mockResolvedValue({ ok: true })
```

Add these tests:

```ts
it('returns an error and never reaches recaptcha when the address is undeliverable', async () => {
  vi.mocked(verifyEmailDeliverability).mockResolvedValue({ ok: false, reason: 'mx' })

  const result = await submitContactForm(
    initialContactFormState,
    formDataWith({ name: 'Jane', email: 'jane@gmial.com', message: 'hi', recaptchaToken: 'tok' })
  )

  expect(result.status).toBe('error')
  expect(verifyRecaptcha).not.toHaveBeenCalled()
  expect(sendContactEmail).not.toHaveBeenCalled()
})

it('gives a disposable address its own distinct message', async () => {
  vi.mocked(verifyEmailDeliverability).mockResolvedValue({ ok: false, reason: 'disposable' })

  const result = await submitContactForm(
    initialContactFormState,
    formDataWith({ name: 'Jane', email: 'j@mailinator.com', message: 'hi', recaptchaToken: 'tok' })
  )

  expect(result.message).toMatch(/permanent email address/i)
})

it('checks deliverability only after the rate limit passes', async () => {
  vi.mocked(checkRateLimit).mockResolvedValue({ ok: false })

  await submitContactForm(
    initialContactFormState,
    formDataWith({ name: 'Jane', email: 'jane@example.com', message: 'hi', recaptchaToken: 'tok' })
  )

  expect(verifyEmailDeliverability).not.toHaveBeenCalled()
})
```

- [ ] **Step 9: Run the full suite**

Run: `npx vitest run`
Expected: PASS. 50 from Task 2 + 5 email-verify + 3 action = 58 tests.

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

- [ ] **Step 4: Run the full verification set**

```bash
npx vitest run
npm run build
```

Expected: 58 tests passing across 13 files, build clean.

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

## Out of scope

Tracked as optional hardening in `tasks/portfolio/contact-form/current.md`, deliberately excluded here: server-side verification of reCAPTCHA's `action`/`hostname` fields, field length caps, newline stripping in `name`, clearing form fields after a successful send, and the reCAPTCHA-blocked fallback contact channel (still awaiting the user's decision).
