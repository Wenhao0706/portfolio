<!--LLM-CONTEXT
Status: 🚀 Real credentials configured, end-to-end send verified — pending merge to main
Domain: portfolio
Gotchas (critical — full list in ## Critical Gotchas below):
  - Gmail SMTP needs an App Password (requires 2FA), not the account login password
  - Sender/notify addresses are two different accounts by design — see Key Technical Decisions
Related: tasks/portfolio/content-pages/current.md
Last updated: 2026-07-24
-->

# Portfolio — Contact Form (reCAPTCHA v3 + Gmail SMTP) Summary

## Quick Start (read this first in next session)

**Where we are**: `/contact`'s old mailto placeholder is now a working Name/Email/Message form (`components/ContactForm.tsx`) backed by a Next.js Server Action (`app/contact/actions.ts`) that verifies an invisible reCAPTCHA v3 token, then sends mail via Gmail SMTP (`lib/contact/mailer.ts`). Real credentials are configured in `.env.local` and a real end-to-end send has been verified. Committed on `feature/local`, not yet merged to `main`.

**Immediate next actions (in order)**:
1. Add the same 5 env vars to Vercel's dashboard for prod, then merge `feature/local` → `main`.
2. Planned anti-spam hardening (not blocking, see Next Steps): free rate-limit + honeypot + `node-email-verifier` trio.

**Key facts for cold start**:
- `npx vitest run` — 29/29 passing. `npm run build` clean.
- 4-layer architecture: `ContactForm.tsx` (client) → `actions.ts` (`'use server'` orchestrator) → `lib/contact/{validate,recaptcha,mailer}.ts` (independently tested) + `lib/contact/state.ts` (shared `ContactFormState` type/initial value — kept out of `actions.ts` because a `'use server'` file may only export async functions).
- After any edit under `lib/contact/` or `app/contact/`, clear `.next/cache` before restarting `npm run dev` — Turbopack has repeatedly served stale bundles referencing removed exports mid-session.

**Gotchas that will trip you**:
- Gmail SMTP rejects the account's real login password — must be an App Password.
- `RECAPTCHA_SCORE_THRESHOLD` (0.5) lives in `lib/contact/recaptcha.ts` — reCAPTCHA is currently the only spam gate; rate limiting + honeypot are now planned (see Next Steps).
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
| 1 | Server Action + reCAPTCHA v3 verification + Gmail SMTP mailer + ContactForm built, unit-tested, reviewed, real credentials configured, real end-to-end send verified | ✅ |
| 2 | Merge `feature/local` → `main` | ⬜ Not started |

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

---

## Last Session

- Configured real reCAPTCHA v3 + Gmail App Password credentials, fixed B3–B6 to get a real end-to-end send working, then iterated the email design twice (owner-only → owner+cc visitor → visitor+cc owner) based on live UX feedback about thread-splitting — see the "one email only" decision above.
- Hid the reCAPTCHA badge, added the required Google disclosure text instead.
- Discussed Gmail SMTP spam-avoidance (no code change needed — current from/reply-to setup already follows best practice at this volume).
- Researched email-verification tools and reversed the earlier Abstract API plan: per-mailbox verification is impossible for Gmail (returns `250 OK` for all addresses), so the anti-spam plan is now a free rate-limit + honeypot + `node-email-verifier` trio — see Key Technical Decisions + Next Steps.

---

## Next Steps

- [ ] Add the 5 env vars to Vercel's dashboard, then merge `feature/local` → `main`
- [ ] Anti-spam trio (free, no external quota/key, all Vercel-compatible) — user's stated priority against form spam/quota-waste: (1) rate limit the server action per IP, (2) hidden honeypot field bots fill but humans don't, (3) `node-email-verifier` (MIT npm) for DNS-based MX check (catches typo/fake domains) + disposable-email block. Not started
- [ ] Optional hardening (not blocking): verify reCAPTCHA's `action`/`hostname` fields server-side, cap field lengths + strip newlines from `name`, clear form fields after a successful send, add one mocked end-to-end test exercising the real action → real lib wiring
