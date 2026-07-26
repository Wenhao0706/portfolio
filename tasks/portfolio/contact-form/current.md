<!--LLM-CONTEXT
Status: 🚀 Live in production. All three anti-spam gates deployed; rate limit verified enforcing in prod 2026-07-27.
Domain: portfolio
Gotchas (critical — full list in ## Critical Gotchas below):
  - Gmail SMTP needs an App Password (requires 2FA), not the account login password
  - Sender/notify addresses are two different accounts by design — see Key Technical Decisions
  - node-email-verifier's detailed result fields are nested objects (result.mx.valid), not flat booleans
  - Upstash arrives via Vercel Storage as KV_REST_API_* (not UPSTASH_*); env vars bind at DEPLOY time, so connecting the store needs a redeploy
  - `@upstash/ratelimit` RESOLVES (never rejects) on its 5s default timeout — `reason: 'timeout'` must be read explicitly or fail-open is silent
  - Never name a honeypot field after an autofill category — a false trip discards a real message invisibly
Related: tasks/portfolio/content-pages/current.md, tasks/portfolio/deployment/current.md
Last updated: 2026-07-27
-->

# Portfolio — Contact Form (reCAPTCHA v3 + Gmail SMTP) Summary

## Quick Start (read this first in next session)

**Where we are**: `/contact` serves a working Name/Email/Message form (`components/ContactForm.tsx`) backed by a Next.js Server Action (`app/contact/actions.ts`) that runs honeypot → validation → reCAPTCHA token presence → rate limit → email deliverability → reCAPTCHA v3 verify → Gmail SMTP send. All of it is live at `https://www.manhou.de/contact`. The anti-spam trio was merged to `main` and deployed on 2026-07-26; the served HTML was verified to carry the honeypot input with `aria-hidden="true"`, `tabindex="-1"` and the off-screen class, and `/contact` and `/` both return 200.

✅ **The rate limit is live and enforcing, verified end to end on 2026-07-27** at three independent levels: (1) no `ratelimit degraded` line in the Vercel logs, (2) the Upstash console's own command counter incremented and 54 B of window keys were stored, (3) a 4th submission inside 10 minutes was actually rejected with "You've sent a few messages already". Level 3 is the one that matters — a limiter that connects but never blocks passes levels 1 and 2 and is still useless.

Upstash is provisioned through Vercel's Storage integration, so the credentials arrive as `KV_REST_API_URL`/`KV_REST_API_TOKEN`, not the `UPSTASH_*` names. `isConfigured()` accepts either pair. Vercel function region and the Upstash primary region are both Singapore (`sin1`) so the rate-limit round trip stays in-region.

⚠️ **Two runtime log probes remain unrun**: `[contact-honeypot] blocked` and `[contact-gate] email-verify blocked (mx)`. Both gates are covered by unit tests and the honeypot's markup was verified in the served HTML, but neither log line has been observed in production. Probe steps are in the plan's "How to verify each gate is actually working" section.

**Immediate next actions (in order)**:
1. Decide on the reCAPTCHA-blocked fallback gap (see Next Steps) — the form is the site's only contact channel.
2. Bump Next.js 16.2.10 → 16.2.12: `npm audit` reports 3 high-severity advisories in `next` plus its bundled `postcss`/`sharp`. None of the anti-spam dependencies are implicated.

**Key facts for cold start**:
- `npx vitest run` — 86/86 passing across 14 files. `npm run build` clean.
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
- `lib/contact/gate-log.ts` — two `console.warn` emitters. `logGate(gate, outcome, detail?)` prefixes `[contact-gate]` and covers the rate-limit and email-deliverability gates (`blocked` or `degraded`). `logHoneypot()` prefixes `[contact-honeypot]` instead, deliberately kept off the shared channel: the honeypot is the one gate a bot can trigger without limit (it runs before the rate limit by design), so unbounded hits on `[contact-gate]` would bury the `degraded` lines that are the only signal a gate has silently stopped working. Grep `[contact-honeypot]` for bot volume, `[contact-gate]` for anything actionable. Note the other guard steps (missing token, validation failure, reCAPTCHA score failure, send failure) emit no line at all — see Next Steps.
- `.env.local` — Real credentials configured (gitignored). `GMAIL_USER=manhou688@gmail.com` (SMTP login/sender), `CONTACT_TO_EMAIL=wenhaoyuan02@gmail.com` (owner's notify address, deliberately a different account — see Key Technical Decisions). `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` documented in `.env.local.example` but not yet set anywhere.

---

## Task Status

| # | Task | Status |
|---|------|--------|
| 1 | Server Action + reCAPTCHA v3 verification + Gmail SMTP mailer + ContactForm built, unit-tested, reviewed, real credentials configured, real end-to-end send verified, live in production | ✅ |
| 2 | All 5 env vars confirmed set in Vercel; site key verified present in the deployed client bundle | ✅ |
| 3 | reCAPTCHA badge hiding fixed to survive client-side navigation (B7) | ✅ Merged and verified live 2026-07-26 |
| 4 | Anti-spam trio (honeypot + rate limit + `node-email-verifier`) | ✅ Live and verified. Rate limit confirmed enforcing in production 2026-07-27 — see Quick Start |
| 5 | Post-ship review pass (R1–R8): Upstash silent-timeout Critical, honeypot autofill defect, guard reorder, test gaps | ✅ |

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
| Connecting the Upstash store in Vercel does NOT activate the rate limit on its own | Env vars bind to a deployment at build time, so a store connected after the last deploy leaves the running function with no credentials. Symptom is `[contact-gate] ratelimit degraded (not-configured)` while the form keeps working normally. Fix is a redeploy — this actually happened on 2026-07-27 |
| `POST /contact` returning **200 does not mean the submission succeeded** | A Server Action returns 200 whenever it executes without crashing; every user-facing error state ("rate limited", "invalid email", "couldn't verify you're not a bot") is also a 200, because the failure lives in the response payload, not the status code. Only an unhandled throw gives 500. Judge success from the inbox and the `[contact-gate]` logs, never from the status code |
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
| Naming a honeypot field after anything in the autofill vocabulary | A tripped honeypot returns success by design, so an autofilled field means a real visitor's message is discarded while they are told it sent — and the log line is indistinguishable from a bot. Never use `company`, `organization`, `address`, `phone`, `url`, `title`. Render no `<label>`, and keep `data-1p-ignore` + `data-lpignore` on the input |
| Async status text added to the DOM only after the action resolves is invisible to screen readers | Keep the status `<p>` unconditionally mounted with `role="status"`/`aria-live="polite"`, toggle only its text (see `ContactForm.tsx`) |
| CSS targeting an element a third-party script appends to `<body>` | Declare it in `app/globals.css`, never in a `<style>` tag inside the component — the badge outlives the component across client-side navigation, the component-scoped rule does not (see B7) |
| `getRecaptchaToken()` returns `''` when the Google script is blocked or still loading | The action cannot distinguish this from a real bot, so both surface the same generic "couldn't verify" error and retrying never succeeds — see Next Steps |

---

## Bugs Fixed

| ID | Severity | Issue | Fix |
|----|----------|-------|-----|
| B1–B7 | Important | Seven build-phase bugs: unannounced async status text, a test that never asserted the reCAPTCHA token, localhost not whitelisted in the reCAPTCHA console, `formAction` called outside a transition, two `'use server'` export-shape crashes, and the reCAPTCHA badge reappearing after client-side navigation | All fixed; the two export-shape ones are the source of the `'use server'` gotcha below, and the badge fix is why `.grecaptcha-badge` lives in `app/globals.css` |
| R1 | **Critical** | `checkRateLimit` destructured only `success`, so `@upstash/ratelimit`'s timeout path (which resolves `success: true, reason: 'timeout'`) returned `degraded: false` — an Upstash slowdown silently disabled the rate limit with logs identical to a healthy gate, the exact defect `degraded` exists to prevent | Branch on `reason === 'timeout'` → `{ ok: true, degraded: true, reason: 'timeout' }`. Added a timeout test plus a parameterised guard asserting `cacheBlock`/`denyList` stay genuine blocks |
| R2 | Important | `Redis.fromEnv()` was assumed to throw on missing env vars. It doesn't — it warns and returns a `url: undefined` client, costing a measured ~4.3s of dead fetch-retry latency on every submission in the current (unconfigured) production state. The test mocking `fromEnv` throwing validated an unreachable path | Short-circuit on env absence before constructing the client (accepting the `KV_REST_API_*` aliases). Replaced the unreachable test with one asserting neither `fromEnv` nor `limit` is called |
| R3 | Important | With three distinct degraded causes, the action's `ip ? 'upstash unavailable' : 'no client ip'` heuristic mislabelled them | `checkRateLimit` returns `reason: 'no-ip' \| 'not-configured' \| 'timeout' \| 'unavailable'`; the action logs it verbatim |
| R4 | Important | The token-presence check sat behind BOTH network gates, so an ad-blocked visitor (`getRecaptchaToken()` returns `''`) burned a rate-limit slot and fired a live MX lookup per attempt, and on the 4th was told "you've sent a few messages already" having sent zero | Moved `if (!token)` to immediately after validation, ahead of both gates. Added a test asserting neither `checkRateLimit` nor `verifyEmailDeliverability` is called |
| R5 | Important | Nothing tested that the honeypot input is actually rendered — deleting the `<div>` left the whole suite green while the gate went dead | Four tests in `ContactForm.test.tsx` keyed off `HONEYPOT_FIELD` (not the literal `'company'`): the input exists, it is submitted in the `FormData`, it is absent from the accessibility tree, and `tabIndex` is `-1` |
| R6 | Minor | The disposable test fixture used `mx: { valid: true }`, a shape the library never emits, so it passed regardless of whether `disposable` was checked before `mx` | Fixture now uses the real `mx: { valid: false, errorCode: 'MX_SKIPPED_DISPOSABLE' }`; verified it fails when the two branches are swapped. Also added the `typeof result !== 'object'` guard around the forced `as ValidationResult` cast, with a test |
| R7 | **Critical** | `HONEYPOT_FIELD` was `'company'`, rendered with a `<label>Company</label>`. That is a standard autofill token — Chrome ignores `autocomplete="off"` for address-type fields and password managers fill by label heuristics — so a real visitor's manager could trip `isBot`, which returns a success state byte-identical to a real send. Their message would be discarded while they were told it sent, and `[contact-honeypot] blocked` is indistinguishable from a genuine bot | Renamed to `ref-token`, removed the label, added `data-1p-ignore` / `data-lpignore` / `data-form-type="other"`. Added a test asserting the name is outside the autofill vocabulary and no label exists — verified it fails when reverted to `company` |
| R8 | Important | `verifyEmailDeliverability` returned a bare `degraded: true` for all three causes while the action logged one hardcoded string, so a dropped `detailed: true` (gate bypassed for every address) looked identical to a DNS blip and would have sent the reader chasing DNS | Returns `degradedReason: 'not-detailed' \| 'dns' \| 'timeout'`, logged verbatim — mirroring R3's fix on the rate limiter |

---

## Last Session

- Shipped the anti-spam trio to production and verified the rate limit is genuinely enforcing, not merely connected — no `degraded` line, Upstash's own command counter incrementing, and a 4th submission actually rejected.
- Post-ship review found R7, a Critical: the honeypot field was named `company`, which autofill targets. A real visitor's password manager could have tripped it and had their message silently discarded. Fixed, with a test that fails if the name moves back into the autofill vocabulary.
- Product review found the `/contact` page still ships bracketed placeholder copy in production, and that the site carries no `mailto:`, LinkedIn or GitHub link anywhere — so every gate rejection is a dead end. Both are in Next Steps; the copy is owned by `tasks/portfolio/content-pages/current.md`.
- Traced two Vercel traps worth remembering: env vars bind at deploy time (connecting the Upstash store did nothing until a redeploy), and the default function region is `iad1` while the database was in Singapore.

## Next Steps

Ordered by what actually costs a job opportunity. The gates are done; everything below is
about the page around them.

**Contact reachability — the site has no fallback channel at all**
- [ ] Add real GitHub + LinkedIn links on `/contact`. A grep of `app/`, `components/` and `lib/` finds zero `mailto:`, `linkedin` or `github.com` anywhere on the site, so every rejection path is a dead end. The page already has a placeholder reserved for exactly this — see `tasks/portfolio/content-pages/current.md`
- [ ] Decide the reCAPTCHA-blocked fallback. An ad blocker makes `getRecaptchaToken()` return `''` forever, and the message ("Couldn't verify you're not a bot. Please try again.") is both unactionable and mildly accusatory toward a hiring manager. Cheapest fix is the links above; better is to poll ~3s for `window.grecaptcha` before giving up, then return a distinct "the spam-check script didn't load" message. **Still awaiting the user's call**

**Anti-spam — the original threat is still unguarded**
- [ ] Add a global daily cap (a second Upstash limiter on a fixed key, ~100/day). The per-IP limit does not stop the thing it was built for: a script rotating IPs gets a fresh 3-per-10-minutes each time and can still exhaust the ~500/day Gmail quota, after which every genuine sender is turned away for the rest of the day with no message stored anywhere
- [ ] Persist hard-blocked submissions so a false positive is recoverable. `LPUSH` `{ts, gate, reason, name, email, message}` to a capped Upstash list with a 30-day TTL — the instance is already provisioned and idle. Without it there is no way to learn whether a gate has already cost a real lead

**Post-send UX**
- [ ] Clear the form on success (`form.reset()`). Fields stay populated, so the state is visually identical to an unsubmitted form plus one line of text — people re-click, and three clicks spends their whole rate-limit budget
- [ ] Mention the confirmation email in the success copy. The mailer sends the visitor a copy with their message quoted back, and nothing tells them to expect it
- [ ] Reframe the rate-limit rejection from "you've sent" to "your network has", and name the wait. Colleagues behind one corporate IP share the budget, so it accuses people who sent nothing. `checkRateLimit` already receives `reset` from Upstash and discards it
- [ ] Soften the disposable-address rejection — Apple Hide My Email and SimpleLogin are normal privacy tools, not bad faith

**Verification still owed**
- [ ] Observe `[contact-honeypot] blocked` and `[contact-gate] email-verify blocked (mx)` in production. Neither log line has ever been seen; submitting with `test@mailinator.com` exercises the second in seconds

**Maintenance**
- [ ] Rotate the Upstash token — it was pasted into a chat transcript on 2026-07-27 and grants full read/write on the rate-limit database
- [ ] Bump Next.js 16.2.10 → 16.2.12. `npm audit` reports 3 high-severity advisories in `next` plus its bundled `postcss`/`sharp`; none of the anti-spam dependencies are implicated

**Optional hardening (not blocking)**
- [ ] Verify reCAPTCHA's `action`/`hostname` fields server-side
- [ ] Cap field lengths and strip newlines from `name`
- [ ] Log the mailer's own failures — it is the only step in the seven-gate chain that emits no line
- [ ] Add one mocked end-to-end test exercising the real action → real lib wiring
