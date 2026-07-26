<!--LLM-CONTEXT
Status: 🚀 Live in production — anti-spam trio designed and approved, not yet built
Domain: portfolio
Gotchas (critical — full list in ## Critical Gotchas below):
  - Gmail SMTP needs an App Password (requires 2FA), not the account login password
  - Sender/notify addresses are two different accounts by design — see Key Technical Decisions
Related: tasks/portfolio/content-pages/current.md, tasks/portfolio/deployment/current.md
Last updated: 2026-07-26
-->

# Portfolio — Contact Form (reCAPTCHA v3 + Gmail SMTP) Summary

## Quick Start (read this first in next session)

**Where we are**: `/contact` serves a working Name/Email/Message form (`components/ContactForm.tsx`) backed by a Next.js Server Action (`app/contact/actions.ts`) that verifies an invisible reCAPTCHA v3 token, then sends mail via Gmail SMTP (`lib/contact/mailer.ts`). Live at `https://www.manhou.de/contact` with all 5 env vars set in Vercel and the site key verified present in the deployed bundle.

**Immediate next actions (in order)**:
1. Build the anti-spam trio — design spec is **approved and ready to implement** at `docs/superpowers/specs/2026-07-25-contact-form-anti-spam-trio-design.md`. Start by writing the implementation plan from that spec.
2. Decide on the reCAPTCHA-blocked fallback gap (see Next Steps) — the form is the site's only contact channel.

**Key facts for cold start**:
- `npx vitest run` — 31/31 passing. `npm run build` clean.
- 4-layer architecture: `ContactForm.tsx` (client) → `actions.ts` (`'use server'` orchestrator) → `lib/contact/{validate,recaptcha,mailer}.ts` (independently tested) + `lib/contact/state.ts` (shared `ContactFormState` type/initial value — kept out of `actions.ts` because a `'use server'` file may only export async functions).
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
- `app/contact/actions.ts` — `'use server'` orchestrator: validate → verify reCAPTCHA → send email, returns typed `ContactFormState` (type imported from `lib/contact/state.ts`).
- `lib/contact/state.ts` — `ContactFormState` type + `initialContactFormState`, kept separate from `actions.ts` (see Gotchas).
- `lib/contact/validate.ts` — `validateContactInput()`, plain regex email check, no external library.
- `lib/contact/recaptcha.ts` — `verifyRecaptcha()` against Google's `siteverify` endpoint, `RECAPTCHA_SCORE_THRESHOLD = 0.5`.
- `lib/contact/mailer.ts` — `sendContactEmail()` via `nodemailer` over Gmail SMTP (port 465). Sends one email `to` the visitor (the "thanks for reaching out" confirmation, with their message quoted back), `cc` + `replyTo` the site owner's notify address — see Key Technical Decisions for why this is one email, not two.
- `.env.local` — Real credentials configured (gitignored). `GMAIL_USER=manhou688@gmail.com` (SMTP login/sender), `CONTACT_TO_EMAIL=wenhaoyuan02@gmail.com` (owner's notify address, deliberately a different account — see Key Technical Decisions).

---

## Task Status

| # | Task | Status |
|---|------|--------|
| 1 | Server Action + reCAPTCHA v3 verification + Gmail SMTP mailer + ContactForm built, unit-tested, reviewed, real credentials configured, real end-to-end send verified, live in production | ✅ |
| 2 | All 5 env vars confirmed set in Vercel; site key verified present in the deployed client bundle | ✅ |
| 3 | reCAPTCHA badge hiding fixed to survive client-side navigation (B7) | ✅ Merged and verified live 2026-07-26 |
| 4 | Anti-spam trio (rate limit + honeypot + `node-email-verifier`) | 📋 Design approved, not built |

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

---

## Critical Gotchas

### Backend
| Issue | Rule |
|-------|------|
| Gmail SMTP auth fails silently misleading errors with a normal password | Must be a Google App Password (`myaccount.google.com/apppasswords`), which requires 2FA enabled on the account first |
| `verifyRecaptcha`/`sendContactEmail` throw if their env vars are unset | Expected until real credentials are added — the action catches this and returns a user-facing error, doesn't crash |

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
| B7 | Important | The reCAPTCHA badge stayed hidden on `/contact` but reappeared on every other page once `/contact` had been visited, because the hiding rule was a `<style>` tag rendered inside `ContactForm` and unmounted with it | Moved `.grecaptcha-badge { visibility: hidden }` into `app/globals.css`; added two regression tests asserting it lives there and not in the component |

---

## Last Session

- Shipped B7, the reCAPTCHA badge reappearing on every page after visiting `/contact`. The fix had been written in a previous session but left uncommitted in the working tree, so the doc's ✅ was premature — the bug was still live until this session merged `feature/local` into `main`. Verified on `www.manhou.de` after deploy: the served CSS chunk changed hash and now carries `.grecaptcha-badge{visibility:hidden}`, and the old inline `<style>` no longer appears in the HTML.
- Confirmed all 5 env vars are set in Vercel and verified `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is baked into the deployed bundle at `www.manhou.de/contact`.
- Product review surfaced the reCAPTCHA-blocked dead end (no fallback contact channel) — captured in Next Steps, deferred by the user pending their decision.
- Session ended mid-planning: the user is travelling and asked that outstanding work be recorded rather than started.

---

## Next Steps

**Anti-spam (approved, ready to build)**
- [ ] Implement the trio per `docs/superpowers/specs/2026-07-25-contact-form-anti-spam-trio-design.md`: per-IP rate limit, hidden honeypot field, `node-email-verifier` MX + disposable check. Adds 3 npm packages and 2 Upstash env vars, taking prod from 5 to 7

**Resilience**
- [ ] Decide on a fallback when the reCAPTCHA script is blocked — the form is the site's only contact channel, and a blocked script gives a recruiter a permanent retry loop with no alternative. Cheapest fix is a visible `mailto:` on `/contact`; optionally distinguish the "script never loaded" error from a genuine verification failure. **Awaiting the user's call on whether to build this**

**Optional hardening (not blocking)**
- [ ] Verify reCAPTCHA's `action`/`hostname` fields server-side
- [ ] Cap field lengths and strip newlines from `name`
- [ ] Clear form fields after a successful send
- [ ] Add one mocked end-to-end test exercising the real action → real lib wiring
