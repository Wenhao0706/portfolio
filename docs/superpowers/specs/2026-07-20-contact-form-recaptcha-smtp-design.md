# Contact Form: reCAPTCHA + SMTP Email Design

Status: Approved — building template now; user will supply real API credentials later.

## Goal

Replace the bracketed placeholder in `app/contact/page.tsx` ("Let's talk") with a working
contact form that emails the user directly, protected from bot spam by reCAPTCHA v3.

## Architecture

Server Action, not a Route Handler — Next.js 16's idiomatic pattern for form mutations
(single-roundtrip response, no manual `fetch`, works with `useActionState`).

```
app/contact/page.tsx        server component, renders <ContactForm />
components/ContactForm.tsx  client component: form UI + reCAPTCHA v3 token + useActionState
app/contact/actions.ts      'use server': validate → verify reCAPTCHA → send via nodemailer
```

## Fields

Name, Email, Message. No subject line (YAGNI — user chose the minimal set).

## reCAPTCHA v3 flow

1. `ContactForm` loads Google's reCAPTCHA v3 script (site key from
   `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`).
2. On submit, calls `grecaptcha.execute(siteKey, { action: 'contact' })` to get a token,
   attaches it to the `FormData` before invoking the server action.
3. Server action POSTs the token to `https://www.google.com/recaptcha/api/siteverify`
   with `RECAPTCHA_SECRET_KEY`.
4. Reject if `success !== true` or `score < 0.5`. Threshold is a named constant
   (`RECAPTCHA_SCORE_THRESHOLD`) so it's easy to tune later without hunting for a magic number.
5. Google's required badge stays visible (default bottom-right placement — not hidden via CSS,
   per their ToS).

## Email sending (Gmail SMTP via nodemailer)

- `smtp.gmail.com:465`, secure (SSL).
- Auth: `GMAIL_USER` (the Gmail address) + `GMAIL_APP_PASSWORD` (a Google **App Password**,
  not the account password — requires 2FA enabled on the Gmail account first, generated at
  https://myaccount.google.com/apppasswords).
- Email `to: CONTACT_TO_EMAIL`, `replyTo:` set to the visitor's submitted email so the user
  can just hit reply.
- Subject: fixed string like `Portfolio contact from {name}`.

## Env vars (none committed — `.env*` already gitignored)

| Var | Where |
|-----|-------|
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | `.env.local` + Vercel |
| `RECAPTCHA_SECRET_KEY` | `.env.local` + Vercel |
| `GMAIL_USER` | `.env.local` + Vercel |
| `GMAIL_APP_PASSWORD` | `.env.local` + Vercel |
| `CONTACT_TO_EMAIL` | `.env.local` + Vercel |

`.env.local.example` (committed, no real values) documents the required keys so the user
knows what to fill in when they set up credentials later.

## Validation & error handling

- Server-side only (client input is untrusted per Next's own Server Actions security docs):
  non-empty name/message, basic email-shape regex check. No external validation library —
  three fields don't justify one.
- Server action returns a typed result consumed by `useActionState`:
  `{ status: 'idle' | 'success' | 'error', message: string }`.
- Distinct user-facing messages for: missing fields, invalid email, reCAPTCHA failure,
  SMTP send failure — so the user isn't stuck on a generic "something went wrong."
- No rate limiting beyond the reCAPTCHA score gate — proportionate for a low-traffic
  portfolio site; not adding infra for a problem that likely won't occur.

## What "template first" means for this pass

The user is setting up real reCAPTCHA/Gmail credentials later. This pass builds:
- All the code above, fully wired.
- `.env.local.example` with placeholder keys and comments on where to get each value.
- With no `.env.local` present, the form will build/render fine but submitting will fail
  at the reCAPTCHA-verify or SMTP-send step with a clear error — expected until credentials
  are added. This is not a bug to fix now.

## Testing

- Existing project uses Vitest + Testing Library (see `components/header/__tests__/`).
- Unit test the server action's validation branches (missing name, bad email format) with
  the network calls (`siteverify`, nodemailer transport) mocked.
- No test requires real credentials.

## Out of scope (explicitly not building)

- Rate limiting / honeypot fields (reCAPTCHA score is the sole spam gate for now).
- Subject line field.
- Keeping the old mailto link (form fully replaces it, per user's earlier answer).
