<!--LLM-CONTEXT
Status: 🚀 Base form live in production. Anti-spam trio (honeypot + rate limit + email deliverability) implemented and tested on feature/contact-anti-spam, NOT deployed.
Domain: portfolio
Gotchas (critical — full list in ## Critical Gotchas below):
  - Gmail SMTP needs an App Password (requires 2FA), not the account login password
  - Sender/notify addresses are two different accounts by design — see Key Technical Decisions
  - node-email-verifier's detailed result fields are nested objects (result.mx.valid), not flat booleans
  - Rate limit is inert until Upstash env vars are set in Vercel; logs `ratelimit degraded (not-configured)` until then
  - `@upstash/ratelimit` RESOLVES (never rejects) on its 5s default timeout — `reason: 'timeout'` must be read explicitly or fail-open is silent
Related: tasks/portfolio/content-pages/current.md, tasks/portfolio/deployment/current.md
Last updated: 2026-07-26
-->

# Portfolio — Contact Form (reCAPTCHA v3 + Gmail SMTP) Summary

## Quick Start (read this first in next session)

**Where we are**: `/contact` serves a working Name/Email/Message form (`components/ContactForm.tsx`) backed by a Next.js Server Action (`app/contact/actions.ts`) that runs honeypot → validation → reCAPTCHA token presence → rate limit → email deliverability → reCAPTCHA v3 verify → Gmail SMTP send. The base form (reCAPTCHA + SMTP) is live at `https://www.manhou.de/contact` with all 5 env vars set in Vercel. The anti-spam trio (honeypot, rate limit, email deliverability) is implemented and unit-tested on branch `feature/contact-anti-spam` but **has not been merged or deployed**, and its browser-probe verification steps were skipped (they need a human).

**Immediate next actions (in order)**:
1. Merge `feature/contact-anti-spam` and deploy once the user is ready — see Deferred to ship time below for the required Upstash setup first, or the rate limit will silently do nothing in production.
2. Decide on the reCAPTCHA-blocked fallback gap (see Next Steps) — the form is the site's only contact channel.

**Key facts for cold start**:
- `npx vitest run` — 83/83 passing across 14 files. `npm run build` clean.
- 7-layer guard chain in `actions.ts`: `isBot` (honeypot) → `validateContactInput` → token presence → `checkRateLimit` → `verifyEmailDeliverability` → `verifyRecaptcha` → `sendContactEmail`. Token presence is a free local check and must stay ahead of both network gates — see Bugs Fixed R4.
- `lib/contact/{validate,recaptcha,mailer,honeypot,ratelimit,email-verify,gate-log}.ts` (independently tested) + `lib/contact/state.ts` (shared `ContactFormState` type/initial value — kept out of `actions.ts` because a `'use server'` file may only export async functions).
- After any edit under `lib/contact/` or `app/contact/`, clear `.next/cache` before restarting `npm run dev` — Turbopack has repeatedly served stale bundles referencing removed exports mid-session.

**Gotchas that will trip you**:
- Gmail SMTP rejects the account's real login password — must be an App Password.
- `RECAPTCHA_SCORE_THRESHOLD` (0.5) lives in `lib/contact/recaptcha.ts` — reCAPTCHA is still the only live spam gate.
- A `'use server'` file can only export async functions — even a type-only re-export (`export type { X }`) trips Next 16's check under SWC. Keep shared types/constants in a plain module and import directly.

---

## Overview

Replaces the bracketed mailto placeholder on `/contact` with a working contact form. Built via `superpowers:subagent-driven-development` — 8 plan tasks, each independently implemented and reviewed, plus a final whole-branch review with two fixes applied before merge-readiness. Design spec: `docs/superpowers/specs/2026-07-20-contact-form-recaptcha-smtp-design.md`. Plan: `docs/superpowers/plans/2026-07-20-contact-form-recaptcha-smtp.md`.

---

## Files

**Frontend**
- `components/ContactForm.tsx` — Client component: form fields, fetches reCAPTCHA v3 token via `window.grecaptcha`, drives `submitContactForm` (wrapped in `startTransition`) through `useActionState`, renders an always-mounted `aria-live="polite"` status message, hides the floating reCAPTCHA badge via CSS and shows the required Google ToS disclosure text instead.
- `app/contact/page.tsx` — Renders `<ContactForm />` in place of the old mailto link.

**Backend**
- `app/contact/actions.ts` — `'use server'` orchestrator: honeypot → validate → reCAPTCHA token presence → rate limit → email deliverability → reCAPTCHA verify → send email (the token-presence check sits ahead of the network gates so an ad-blocked visitor doesn't burn rate-limit budget), returns typed `ContactFormState` (type imported from `lib/contact/state.ts`). Only export is the async `submitContactForm`; `SUCCESS_STATE` is a module-local, non-exported const.
- `lib/contact/state.ts` — `ContactFormState` type + `initialContactFormState`, kept separate from `actions.ts` (see Gotchas).
- `lib/contact/validate.ts` — `validateContactInput()`, plain regex email check, no external library.
- `lib/contact/recaptcha.ts` — `verifyRecaptcha()` against Google's `siteverify` endpoint, `RECAPTCHA_SCORE_THRESHOLD = 0.5`.
- `lib/contact/mailer.ts` — `sendContactEmail()` via `nodemailer` over Gmail SMTP (port 465). Sends one email `to` the visitor (the "thanks for reaching out" confirmation, with their message quoted back), `cc` + `replyTo` the site owner's notify address — see Key Technical Decisions for why this is one email, not two.
- `lib/contact/honeypot.ts` — `HONEYPOT_FIELD` ('company') + `isBot()`. Hidden input rendered in `ContactForm.tsx`, off-screen (not `display:none`) and `aria-hidden` + `tabIndex={-1}`.
- `lib/contact/ratelimit.ts` — `checkRateLimit()` via `@upstash/ratelimit` + `@upstash/redis`, sliding window, 3 submissions / 10 min per IP. Fails open with `degraded: true` plus a `reason` naming which mode fired: `'no-ip'`, `'not-configured'` (env vars absent — short-circuits before constructing the client), `'timeout'` (Upstash slow; see Critical Gotchas), `'unavailable'` (client threw). The action logs the `reason` verbatim.
- `lib/contact/email-verify.ts` — `verifyEmailDeliverability()` via `node-email-verifier` (`checkMx`, `checkDisposable`, `detailed: true`, 3s timeout). Fails open with `degraded: true` on the library's own timeout race; a returned `NO_MX_RECORDS` is a genuine hard block, not a failure — but `mx.valid: false` on its own is NOT, because `DNS_LOOKUP_FAILED`/`MX_LOOKUP_FAILED` carry it too and are correctly treated as degraded (see Critical Gotchas).
- `lib/contact/gate-log.ts` — `logGate(gate, outcome, detail?)`, single `console.warn` line prefixed `[contact-gate]` for every non-clean-pass outcome (`blocked` or `degraded`).
- `.env.local` — Real credentials configured (gitignored). `GMAIL_USER=manhou688@gmail.com` (SMTP login/sender), `CONTACT_TO_EMAIL=wenhaoyuan02@gmail.com` (owner's notify address, deliberately a different account — see Key Technical Decisions). `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` documented in `.env.local.example` but not yet set anywhere.

---

## Task Status

| # | Task | Status |
|---|------|--------|
| 1 | Server Action + reCAPTCHA v3 verification + Gmail SMTP mailer + ContactForm built, unit-tested, reviewed, real credentials configured, real end-to-end send verified, live in production | ✅ |
| 2 | All 5 env vars confirmed set in Vercel; site key verified present in the deployed client bundle | ✅ |
| 3 | reCAPTCHA badge hiding fixed to survive client-side navigation (B7) | ✅ Merged and verified live 2026-07-26 |
| 4 | Anti-spam trio (rate limit + honeypot + `node-email-verifier`) | ✅ Implemented, unit-tested (83/83), build clean, whole-branch review fixes applied (R1–R6) — on `feature/contact-anti-spam`, not merged, not deployed. Browser probes still unverified |

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Next.js Server Action, not a Route Handler | Next 16's idiomatic pattern for form mutations — single-roundtrip response, works with `useActionState`, no manual `fetch` |
| Split into `lib/contact/{validate,recaptcha,mailer}.ts` rather than inlining in `actions.ts` | Each layer independently unit-testable without invoking the Server Action itself — a deliberate improvement over the design spec's sketch, which had folded them together |
| reCAPTCHA v3 invisible, score threshold 0.5 — originally the *sole* spam gate (no rate limiting/honeypot) | User chose zero-friction UX. Being revisited: user later raised spam/quota-waste concern, so rate limiting + honeypot are now planned additions (see Next Steps) rather than deliberately excluded |
| Badge hidden via CSS, replaced with the required Google ToS disclosure text | User wanted the floating badge gone; Google's terms require the disclosure text stay visible somewhere on the page if the badge is hidden |
| `GMAIL_USER` (SMTP login) and `CONTACT_TO_EMAIL` (owner notify address) are deliberately different accounts | User wants one account dedicated to sending/replying and a separate personal inbox for notifications |
| One email only — `to` the visitor, `cc`/`replyTo` the owner — not two separate emails | Rejected: (1) notify-owner-only with no visitor confirmation — visitor has no record and may forget they contacted the site; (2) two separate emails (owner notification + visitor auto-confirmation) — the owner's manual reply threaded under the *notification* email, not the visitor's confirmation email, so the visitor saw two disconnected threads. A single email addressed to the visitor with the owner cc'd/reply-to'd gives the visitor a record and keeps the owner's reply in the same thread |
| Abandoned per-mailbox email verification (incl. the earlier Abstract API plan); against spam/quota-waste use a free anti-spam trio instead | Per-mailbox existence is unsolvable for Gmail/Yahoo/Mail.com by ANY tool free or paid — they return SMTP `250 OK` for every address as an anti-harvesting defense, so a probe can't tell a real gmail from a fake one. Abstract API would cost quota and still return "unknown". The real threat (someone spamming the form to waste the ~500/day Gmail quota) is a *volume* problem, not an invalid-address problem, so the fix is rate limiting + honeypot + free DNS-based MX/disposable checks — see Next Steps |
| Both `checkRateLimit` and `verifyEmailDeliverability` fail OPEN (return `ok: true, degraded: true`) on any infrastructure failure — Redis outage, missing Upstash env vars, DNS timeout | Losing a real message (a recruiter's contact attempt) costs more than admitting one piece of spam. reCAPTCHA still sits in front of the mailer as the load-bearing gate, so a network hiccup in either new gate should never block a genuine visitor |
| Honeypot returns a fake `SUCCESS_STATE`, byte-identical to a real send, instead of an error | Any divergence (different message, different status) would teach an automated script the trap exists, letting it adapt and skip the honeypot field on the next attempt. The log line, not the response, is the only signal that the trap fired |
| Both fail-open gates set `degraded: true` alongside `ok: true`, logged via `logGate` | Silent fail-open is indistinguishable from a working gate. Without the flag, a bad Upstash token or a broken DNS resolver would disable a gate permanently with zero visible symptom — the form would just keep "working" while doing nothing to stop spam |

---

## Critical Gotchas

### Backend
| Issue | Rule |
|-------|------|
| Gmail SMTP auth fails silently misleading errors with a normal password | Must be a Google App Password (`myaccount.google.com/apppasswords`), which requires 2FA enabled on the account first |
| `verifyRecaptcha`/`sendContactEmail` throw if their env vars are unset | Expected until real credentials are added — the action catches this and returns a user-facing error, doesn't crash |
| The rate limit is INERT until `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are set in Vercel | Until then every submission logs `[contact-gate] ratelimit degraded (not-configured)` and the gate lets every request through — the form still "works," which is exactly why this is easy to miss |
| `@upstash/ratelimit` defaults `timeout: 5000`, and its internal `applyTimeout` RESOLVES rather than rejects on expiry | It resolves `{ success: true, limit: 0, remaining: 0, reset: 0, reason: 'timeout' }`. Destructuring only `success` reads that as a healthy pass, so an Upstash slowdown silently disables rate limiting with logs identical to a working gate. `checkRateLimit` must branch on `reason === 'timeout'`. `'cacheBlock'`/`'denyList'` are the other two `RatelimitResponseType` values and arrive with `success: false` — they are genuine blocks and must not be folded into degraded |
| `Redis.fromEnv()` does NOT throw when the env vars are unset | It only `console.warn`s and returns a client with `url: undefined`. The first `.limit()` on that client then burns ~4.3s in fetch retries (6 attempts, `Math.exp(i) * 50` backoff) before failing — dead latency on every single submission, stacked on top of the 3s email-verify budget, reCAPTCHA and SMTP. `checkRateLimit` checks the env vars itself and short-circuits before constructing the client. `fromEnv` also accepts `KV_REST_API_URL`/`KV_REST_API_TOKEN` as fallbacks, so that check must accept both name pairs |
| A gate's `degraded` detail must come FROM the gate, not be re-derived at the call site | `actions.ts` used to guess it as `ip ? 'upstash unavailable' : 'no client ip'`, which silently mislabelled every cause beyond those two (`not-configured` is the actual production state). `checkRateLimit` returns a `reason` and the action logs it verbatim |
| `node-email-verifier` skips the MX check entirely when the disposable check already failed | It stamps `mx: { valid: false, errorCode: 'MX_SKIPPED_DISPOSABLE' }`. So the `disposable` branch MUST be evaluated before the `mx` branch, or every disposable address reports `reason: 'mx'` and gets the wrong user-facing message. A test fixture using `mx: { valid: true }` for a disposable address is fictional and pins nothing |
| `emailValidator`'s return type is `Promise<boolean \| ValidationResult>` with no `detailed`-discriminated overload | The `as ValidationResult` cast is unavoidable, so guard it: `if (typeof result !== 'object' \|\| result === null) return { ok: true, degraded: true }`. Without it, dropping `detailed: true` makes every `.valid` read `undefined` and hard-blocks every address as `reason: 'format'` |
| `node-email-verifier` v4 with `detailed: true` returns NESTED objects (`result.mx.valid`, `result.disposable.valid`, `result.format.valid`), not flat booleans | `result.disposable.valid === true` means the address is NOT disposable — the polarity is inverted from what the field name suggests. Reading it wrong blocks every legitimate address while waving through every throwaway one |
| `node-email-verifier` does NOT throw on most DNS failures | `checkMxRecords` catches ECONNREFUSED/ENOTFOUND/ENODATA/ETIMEDOUT internally and returns `mx.valid: false` with `errorCode: DNS_LOOKUP_FAILED`/`MX_LOOKUP_FAILED` instead of throwing. Only the library's own 3s internal race actually throws. Treating a returned `mx.valid: false` as a verdict (rather than an outage) hard-blocks legitimate senders during a resolver problem — `NO_MX_RECORDS` is the genuine typo-domain signal and must stay a hard block |
| vitest 4: a `vi.mock` factory that references a top-level `const` throws a temporal-dead-zone error | Use `vi.hoisted()` to define values a mock factory needs before the factory runs. Also: an arrow function cannot be used as a mock that gets called with `new` — use `vi.fn(function(){...})` or a class-shaped mock instead |

### Frontend
| Issue | Rule |
|-------|------|
| Async status text added to the DOM only after the action resolves is invisible to screen readers | Keep the status `<p>` unconditionally mounted with `role="status"`/`aria-live="polite"`, toggle only its text (see `ContactForm.tsx`) |
| CSS targeting an element a third-party script appends to `<body>` | Declare it in `app/globals.css`, never in a `<style>` tag inside the component — the badge outlives the component across client-side navigation, the component-scoped rule does not (see B7) |
| `getRecaptchaToken()` returns `''` when the Google script is blocked or still loading | The action cannot distinguish this from a real bot, so both surface the same generic "couldn't verify" error and retrying never succeeds — see Next Steps |

---

## Bugs Fixed

| ID | Severity | Issue | Fix |
|----|----------|-------|-----|
| B1 | Important | Status message `<p>` was conditionally mounted, so screen readers never announced the async success/error result | Made the element always render in the DOM with `role="status"`/`aria-live="polite"`, only text/color toggle |
| B2 | Important | `ContactForm` test only asserted the action was called, never that the reCAPTCHA token was actually attached to the submitted `FormData` — a regression dropping the token would still pass | Assert the real `FormData` argument's `recaptchaToken` equals the mocked token value |
| B3 | Important | reCAPTCHA rejected real submissions with "Localhost is not in the list of supported domains" | Added `localhost` to the site key's domain list in the reCAPTCHA admin console |
| B4 | Important | `formAction(formData)` called after an `await` threw "called outside of a transition" and `isPending` stopped updating | Wrapped the call in `startTransition(() => formAction(formData))` |
| B5 | Important | `initialContactFormState` (a plain object) exported from `'use server'` `actions.ts` crashed with "can only export async functions" | Moved it (+ the `ContactFormState` type) to `lib/contact/state.ts`; `actions.ts` only exports the async function |
| B6 | Important | `export type { ContactFormState }` re-export from `actions.ts` still threw `ReferenceError: ContactFormState is not defined` at runtime — SWC didn't fully elide the type-only re-export in a `'use server'` file | Removed the re-export; every consumer imports the type directly from `lib/contact/state.ts` |
| R1 | **Critical** | `checkRateLimit` destructured only `success`, so `@upstash/ratelimit`'s timeout path (which resolves `success: true, reason: 'timeout'`) returned `degraded: false` — an Upstash slowdown silently disabled the rate limit with logs identical to a healthy gate, the exact defect `degraded` exists to prevent | Branch on `reason === 'timeout'` → `{ ok: true, degraded: true, reason: 'timeout' }`. Added a timeout test plus a parameterised guard asserting `cacheBlock`/`denyList` stay genuine blocks |
| R2 | Important | `Redis.fromEnv()` was assumed to throw on missing env vars. It doesn't — it warns and returns a `url: undefined` client, costing a measured ~4.3s of dead fetch-retry latency on every submission in the current (unconfigured) production state. The test mocking `fromEnv` throwing validated an unreachable path | Short-circuit on env absence before constructing the client (accepting the `KV_REST_API_*` aliases). Replaced the unreachable test with one asserting neither `fromEnv` nor `limit` is called |
| R3 | Important | With three distinct degraded causes, the action's `ip ? 'upstash unavailable' : 'no client ip'` heuristic mislabelled them | `checkRateLimit` returns `reason: 'no-ip' \| 'not-configured' \| 'timeout' \| 'unavailable'`; the action logs it verbatim |
| R4 | Important | The token-presence check sat behind BOTH network gates, so an ad-blocked visitor (`getRecaptchaToken()` returns `''`) burned a rate-limit slot and fired a live MX lookup per attempt, and on the 4th was told "you've sent a few messages already" having sent zero | Moved `if (!token)` to immediately after validation, ahead of both gates. Added a test asserting neither `checkRateLimit` nor `verifyEmailDeliverability` is called |
| R5 | Important | Nothing tested that the honeypot input is actually rendered — deleting the `<div>` left the whole suite green while the gate went dead | Four tests in `ContactForm.test.tsx` keyed off `HONEYPOT_FIELD` (not the literal `'company'`): the input exists, it is submitted in the `FormData`, it is absent from the accessibility tree, and `tabIndex` is `-1` |
| R6 | Minor | The disposable test fixture used `mx: { valid: true }`, a shape the library never emits, so it passed regardless of whether `disposable` was checked before `mx` | Fixture now uses the real `mx: { valid: false, errorCode: 'MX_SKIPPED_DISPOSABLE' }`; verified it fails when the two branches are swapped. Also added the `typeof result !== 'object'` guard around the forced `as ValidationResult` cast, with a test |
| B7 | Important | The reCAPTCHA badge stayed hidden on `/contact` but reappeared on every other page once `/contact` had been visited, because the hiding rule was a `<style>` tag rendered inside `ContactForm` and unmounted with it | Moved `.grecaptcha-badge { visibility: hidden }` into `app/globals.css`; added two regression tests asserting it lives there and not in the component |

---

## Last Session

- Ran a final whole-branch review of `feature/contact-anti-spam` and applied the fix wave: R1 (critical silent fail-open on Upstash timeout), R2, R3, R4, R5, R6 — see Bugs Fixed. Every API claim was re-verified against `node_modules`; two of the branch's original assumptions about `@upstash/*` were wrong and are now recorded as Critical Gotchas. Suite went 67 → 83 across the same 14 files; each new guard was mutation-tested (reverted the fix, confirmed the test fails, restored). `npm run build` clean.
- Guard order in `actions.ts` is now `isBot` → `validateContactInput` → token presence → `checkRateLimit` → `verifyEmailDeliverability` → `verifyRecaptcha` → `sendContactEmail`. Token presence moved ahead of the network gates (R4).
- Deliberately NOT fixed, pending a decision from the user: honeypot log flooding (unbounded `console.warn` per bot hit), the blocked rate-limit log lacking an IP discriminator, `SUCCESS_STATE` being returned by reference, and the honeypot wrapper's `absolute` positioning with no `relative` ancestor.
- Implemented and unit-tested the full anti-spam trio (honeypot, per-IP rate limit, `node-email-verifier` MX/disposable check) on `feature/contact-anti-spam` across 3 plan tasks plus this verification/doc task.
- The trio's real-browser behavior (honeypot invisibility/tab order, fail-open with no Upstash creds, the log-line probes for each gate) still needs a human to verify at `npm run dev` — Server Action IDs are encrypted per build, so this cannot be curl'd or otherwise faked. See Next Steps.
- Corrected the plan doc's Task 3 claim that `node-email-verifier` "throws on DNS timeout" — it mostly does not; it returns `mx.valid: false` internally and only its own 3s race throws. This was an Important finding from an earlier review and is now recorded as a Critical Gotcha here too.
- This work is implemented and tested only — NOT merged, NOT deployed. Do not treat it as live until a human confirms the browser probes and it is actually shipped.
- Shipped B7, the reCAPTCHA badge reappearing on every page after visiting `/contact`. The fix had been written in a previous session but left uncommitted in the working tree, so the doc's ✅ was premature — the bug was still live until this session merged `feature/local` into `main`. Verified on `www.manhou.de` after deploy: the served CSS chunk changed hash and now carries `.grecaptcha-badge{visibility:hidden}`, and the old inline `<style>` no longer appears in the HTML.
- Confirmed all 5 env vars are set in Vercel and verified `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is baked into the deployed bundle at `www.manhou.de/contact`.
- Product review surfaced the reCAPTCHA-blocked dead end (no fallback contact channel) — captured in Next Steps, deferred by the user pending their decision.
- Session ended mid-planning: the user is travelling and asked that outstanding work be recorded rather than started.

---

## Next Steps

**Ship the anti-spam trio (implemented, awaiting deploy)**
- [ ] Create a free Upstash Redis database, add `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` to Vercel (prod goes from 5 to 7 env vars), merge `feature/contact-anti-spam`, redeploy. Until this happens the rate limit fails open silently — see Critical Gotchas

**Resilience**
- [ ] Decide on a fallback when the reCAPTCHA script is blocked — the form is the site's only contact channel, and a blocked script gives a recruiter a permanent retry loop with no alternative. Cheapest fix is a visible `mailto:` on `/contact`; optionally distinguish the "script never loaded" error from a genuine verification failure. **Awaiting the user's call on whether to build this**

**Optional hardening (not blocking)**
- [ ] Verify reCAPTCHA's `action`/`hostname` fields server-side
- [ ] Cap field lengths and strip newlines from `name`
- [ ] Clear form fields after a successful send
- [ ] Add one mocked end-to-end test exercising the real action → real lib wiring
