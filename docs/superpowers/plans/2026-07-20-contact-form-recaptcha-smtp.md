# Contact Form (reCAPTCHA v3 + Gmail SMTP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder mailto link on `/contact` with a working form that emails the site owner via Gmail SMTP, protected from bots by reCAPTCHA v3.

**Architecture:** A Next.js 16 Server Action (`app/contact/actions.ts`) orchestrates three small, independently-testable `lib/contact/*` modules (validation, reCAPTCHA verification, email sending). A client component (`components/ContactForm.tsx`) collects input, fetches an invisible reCAPTCHA token, and drives the action via `useActionState`.

**Tech Stack:** Next.js 16 Server Actions, React 19 `useActionState`, `nodemailer` (Gmail SMTP), Google reCAPTCHA v3, Vitest + Testing Library (existing project setup).

## Global Constraints

- Site's accent color is amber `#B5772E` (light) / `#D9A441` (dark) — do not introduce a second accent color (AGENTS.md).
- Text/background palette: foreground `#2B2A26`/`#EDEFF2`, muted `#7A7568`/`#8A9099`, background `#F7F4EE`/`#14171C`, border `#D8D3C6`/`#2A2F38`.
- `font-mono` is used for headings/labels/buttons throughout the site (see `ResumeDownload.tsx`, `app/contact/page.tsx`).
- No `.env*` files are committed (already gitignored) — only `.env.local.example` (no real values) is committed.
- No credentials exist yet — code must build and render correctly with the env vars unset; only actual form *submission* is expected to fail until the user adds real keys later. This is expected, not a bug.
- No rate limiting or honeypot fields — reCAPTCHA score is the sole spam gate (spec: out of scope).
- Keyboard-focus parity is a project convention for interactive elements (AGENTS.md header-conventions table) — apply the same principle here: the submit button needs a visible `focus-visible` state, not just hover.
- Package manager is npm (`package-lock.json` present).

---

### Task 1: Dependencies and env var scaffolding

**Files:**
- Modify: `package.json` (add `nodemailer`, `@types/nodemailer`)
- Create: `.env.local.example`

**Interfaces:**
- Produces: the env var names every later task reads via `process.env`: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `CONTACT_TO_EMAIL`.

- [ ] **Step 1: Install nodemailer**

Run: `npm install nodemailer && npm install -D @types/nodemailer`

- [ ] **Step 2: Create the env var template**

Create `.env.local.example`:

```bash
# Google reCAPTCHA v3 — https://www.google.com/recaptcha/admin/create (choose v3)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
RECAPTCHA_SECRET_KEY=

# Gmail SMTP — requires 2FA enabled on the account, then generate an App
# Password at https://myaccount.google.com/apppasswords (NOT your login password)
GMAIL_USER=
GMAIL_APP_PASSWORD=

# Where contact form submissions get sent
CONTACT_TO_EMAIL=
```

- [ ] **Step 3: Verify install**

Run: `npm run build`
Expected: build succeeds (no code depends on nodemailer yet, this just confirms the install didn't break anything).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env.local.example
git commit -m "chore: add nodemailer dependency and env var template for contact form"
```

---

### Task 2: Input validation

**Files:**
- Create: `lib/contact/validate.ts`
- Test: `lib/contact/__tests__/validate.test.ts`

**Interfaces:**
- Produces: `ContactInput` type `{ name: string; email: string; message: string }`, `validateContactInput(input: ContactInput): string | null` (returns an error message, or `null` if valid).

- [ ] **Step 1: Write the failing tests**

Create `lib/contact/__tests__/validate.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { validateContactInput } from '../validate'

describe('validateContactInput', () => {
  it('returns null for valid input', () => {
    expect(
      validateContactInput({ name: 'Jane', email: 'jane@example.com', message: 'Hi there' })
    ).toBeNull()
  })

  it('rejects an empty name', () => {
    expect(
      validateContactInput({ name: '  ', email: 'jane@example.com', message: 'Hi there' })
    ).toBe('Please enter your name.')
  })

  it('rejects a missing @ in the email', () => {
    expect(
      validateContactInput({ name: 'Jane', email: 'jane.example.com', message: 'Hi there' })
    ).toBe('Please enter a valid email address.')
  })

  it('rejects an empty email', () => {
    expect(
      validateContactInput({ name: 'Jane', email: '  ', message: 'Hi there' })
    ).toBe('Please enter a valid email address.')
  })

  it('rejects an empty message', () => {
    expect(
      validateContactInput({ name: 'Jane', email: 'jane@example.com', message: '   ' })
    ).toBe('Please enter a message.')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- lib/contact/__tests__/validate.test.ts`
Expected: FAIL — `Cannot find module '../validate'`

- [ ] **Step 3: Implement**

Create `lib/contact/validate.ts`:

```ts
export type ContactInput = {
  name: string
  email: string
  message: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateContactInput(input: ContactInput): string | null {
  if (!input.name.trim()) {
    return 'Please enter your name.'
  }
  if (!input.email.trim() || !EMAIL_REGEX.test(input.email.trim())) {
    return 'Please enter a valid email address.'
  }
  if (!input.message.trim()) {
    return 'Please enter a message.'
  }
  return null
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/contact/__tests__/validate.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/contact/validate.ts lib/contact/__tests__/validate.test.ts
git commit -m "feat: add contact form input validation"
```

---

### Task 3: reCAPTCHA v3 verification

**Files:**
- Create: `lib/contact/recaptcha.ts`
- Test: `lib/contact/__tests__/recaptcha.test.ts`

**Interfaces:**
- Consumes: none from earlier tasks.
- Produces: `RECAPTCHA_SCORE_THRESHOLD` constant (`0.5`), `verifyRecaptcha(token: string): Promise<boolean>`. Reads `process.env.RECAPTCHA_SECRET_KEY`; throws if unset.

- [ ] **Step 1: Write the failing tests**

Create `lib/contact/__tests__/recaptcha.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { verifyRecaptcha, RECAPTCHA_SCORE_THRESHOLD } from '../recaptcha'

describe('verifyRecaptcha', () => {
  beforeEach(() => {
    process.env.RECAPTCHA_SECRET_KEY = 'test-secret'
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.RECAPTCHA_SECRET_KEY
  })

  it('returns true when Google reports success and a high score', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({ success: true, score: 0.9 }),
    } as Response)

    await expect(verifyRecaptcha('good-token')).resolves.toBe(true)
  })

  it('returns false when Google reports success false', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({ success: false }),
    } as Response)

    await expect(verifyRecaptcha('bad-token')).resolves.toBe(false)
  })

  it('returns false when the score is below the threshold', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({ success: true, score: RECAPTCHA_SCORE_THRESHOLD - 0.1 }),
    } as Response)

    await expect(verifyRecaptcha('low-score-token')).resolves.toBe(false)
  })

  it('throws when RECAPTCHA_SECRET_KEY is not set', async () => {
    delete process.env.RECAPTCHA_SECRET_KEY
    await expect(verifyRecaptcha('any-token')).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- lib/contact/__tests__/recaptcha.test.ts`
Expected: FAIL — `Cannot find module '../recaptcha'`

- [ ] **Step 3: Implement**

Create `lib/contact/recaptcha.ts`:

```ts
export const RECAPTCHA_SCORE_THRESHOLD = 0.5

export async function verifyRecaptcha(token: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY
  if (!secret) {
    throw new Error('RECAPTCHA_SECRET_KEY is not set')
  }

  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token }),
  })

  const data = (await response.json()) as { success: boolean; score?: number }
  return data.success === true && (data.score ?? 0) >= RECAPTCHA_SCORE_THRESHOLD
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/contact/__tests__/recaptcha.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/contact/recaptcha.ts lib/contact/__tests__/recaptcha.test.ts
git commit -m "feat: add reCAPTCHA v3 server-side verification"
```

---

### Task 4: Email sending via Gmail SMTP

**Files:**
- Create: `lib/contact/mailer.ts`
- Test: `lib/contact/__tests__/mailer.test.ts`

**Interfaces:**
- Consumes: `ContactInput` type from `lib/contact/validate.ts` (Task 2).
- Produces: `sendContactEmail(input: ContactInput): Promise<void>`. Reads `process.env.GMAIL_USER`, `GMAIL_APP_PASSWORD`, `CONTACT_TO_EMAIL`; throws if any are unset.

- [ ] **Step 1: Write the failing tests**

Create `lib/contact/__tests__/mailer.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import nodemailer from 'nodemailer'

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(),
  },
}))

import { sendContactEmail } from '../mailer'

describe('sendContactEmail', () => {
  const sendMail = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    process.env.GMAIL_USER = 'me@gmail.com'
    process.env.GMAIL_APP_PASSWORD = 'app-password'
    process.env.CONTACT_TO_EMAIL = 'me@gmail.com'
    sendMail.mockClear()
    vi.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as never)
  })

  afterEach(() => {
    delete process.env.GMAIL_USER
    delete process.env.GMAIL_APP_PASSWORD
    delete process.env.CONTACT_TO_EMAIL
  })

  it('sends mail with the visitor set as replyTo', async () => {
    await sendContactEmail({ name: 'Jane', email: 'jane@example.com', message: 'Hi there' })

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'me@gmail.com',
        replyTo: 'jane@example.com',
        subject: 'Portfolio contact from Jane',
        text: 'Hi there',
      })
    )
  })

  it('throws when GMAIL_USER is not set', async () => {
    delete process.env.GMAIL_USER
    await expect(
      sendContactEmail({ name: 'Jane', email: 'jane@example.com', message: 'Hi there' })
    ).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- lib/contact/__tests__/mailer.test.ts`
Expected: FAIL — `Cannot find module '../mailer'`

- [ ] **Step 3: Implement**

Create `lib/contact/mailer.ts`:

```ts
import nodemailer from 'nodemailer'
import type { ContactInput } from './validate'

export async function sendContactEmail(input: ContactInput): Promise<void> {
  const { GMAIL_USER, GMAIL_APP_PASSWORD, CONTACT_TO_EMAIL } = process.env
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD || !CONTACT_TO_EMAIL) {
    throw new Error(
      'Email is not configured (missing GMAIL_USER, GMAIL_APP_PASSWORD, or CONTACT_TO_EMAIL)'
    )
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  })

  await transporter.sendMail({
    from: GMAIL_USER,
    to: CONTACT_TO_EMAIL,
    replyTo: input.email,
    subject: `Portfolio contact from ${input.name}`,
    text: input.message,
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/contact/__tests__/mailer.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/contact/mailer.ts lib/contact/__tests__/mailer.test.ts
git commit -m "feat: add Gmail SMTP contact email sending"
```

---

### Task 5: Server Action orchestration

**Files:**
- Create: `app/contact/actions.ts`
- Test: `app/contact/__tests__/actions.test.ts`

**Interfaces:**
- Consumes: `validateContactInput` (Task 2), `verifyRecaptcha` (Task 3), `sendContactEmail` (Task 4).
- Produces: `ContactFormState` type `{ status: 'idle' | 'success' | 'error'; message: string }`, `initialContactFormState: ContactFormState`, `submitContactForm(prevState: ContactFormState, formData: FormData): Promise<ContactFormState>`. `formData` fields read: `name`, `email`, `message`, `recaptchaToken`.

- [ ] **Step 1: Write the failing tests**

Create `app/contact/__tests__/actions.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/contact/validate', () => ({
  validateContactInput: vi.fn(),
}))
vi.mock('@/lib/contact/recaptcha', () => ({
  verifyRecaptcha: vi.fn(),
}))
vi.mock('@/lib/contact/mailer', () => ({
  sendContactEmail: vi.fn(),
}))

import { validateContactInput } from '@/lib/contact/validate'
import { verifyRecaptcha } from '@/lib/contact/recaptcha'
import { sendContactEmail } from '@/lib/contact/mailer'
import { submitContactForm, initialContactFormState } from '../actions'

function formDataWith(fields: Record<string, string>) {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) fd.set(key, value)
  return fd
}

describe('submitContactForm', () => {
  beforeEach(() => {
    vi.mocked(validateContactInput).mockReturnValue(null)
    vi.mocked(verifyRecaptcha).mockResolvedValue(true)
    vi.mocked(sendContactEmail).mockResolvedValue(undefined)
  })

  it('returns an error and skips recaptcha/email when validation fails', async () => {
    vi.mocked(validateContactInput).mockReturnValue('Please enter your name.')

    const result = await submitContactForm(
      initialContactFormState,
      formDataWith({ name: '', email: 'jane@example.com', message: 'hi', recaptchaToken: 'tok' })
    )

    expect(result).toEqual({ status: 'error', message: 'Please enter your name.' })
    expect(verifyRecaptcha).not.toHaveBeenCalled()
    expect(sendContactEmail).not.toHaveBeenCalled()
  })

  it('returns an error when the recaptcha token is missing', async () => {
    const result = await submitContactForm(
      initialContactFormState,
      formDataWith({ name: 'Jane', email: 'jane@example.com', message: 'hi', recaptchaToken: '' })
    )

    expect(result.status).toBe('error')
    expect(verifyRecaptcha).not.toHaveBeenCalled()
    expect(sendContactEmail).not.toHaveBeenCalled()
  })

  it('returns an error when recaptcha verification fails', async () => {
    vi.mocked(verifyRecaptcha).mockResolvedValue(false)

    const result = await submitContactForm(
      initialContactFormState,
      formDataWith({ name: 'Jane', email: 'jane@example.com', message: 'hi', recaptchaToken: 'tok' })
    )

    expect(result.status).toBe('error')
    expect(sendContactEmail).not.toHaveBeenCalled()
  })

  it('returns an error when sending the email throws', async () => {
    vi.mocked(sendContactEmail).mockRejectedValue(new Error('SMTP down'))

    const result = await submitContactForm(
      initialContactFormState,
      formDataWith({ name: 'Jane', email: 'jane@example.com', message: 'hi', recaptchaToken: 'tok' })
    )

    expect(result.status).toBe('error')
  })

  it('returns success when everything passes', async () => {
    const result = await submitContactForm(
      initialContactFormState,
      formDataWith({ name: 'Jane', email: 'jane@example.com', message: 'hi', recaptchaToken: 'tok' })
    )

    expect(result.status).toBe('success')
    expect(sendContactEmail).toHaveBeenCalledWith({
      name: 'Jane',
      email: 'jane@example.com',
      message: 'hi',
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- app/contact/__tests__/actions.test.ts`
Expected: FAIL — `Cannot find module '../actions'`

- [ ] **Step 3: Implement**

Create `app/contact/actions.ts`:

```ts
'use server'

import { validateContactInput } from '@/lib/contact/validate'
import { verifyRecaptcha } from '@/lib/contact/recaptcha'
import { sendContactEmail } from '@/lib/contact/mailer'

export type ContactFormState = {
  status: 'idle' | 'success' | 'error'
  message: string
}

export const initialContactFormState: ContactFormState = { status: 'idle', message: '' }

export async function submitContactForm(
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const name = String(formData.get('name') ?? '')
  const email = String(formData.get('email') ?? '')
  const message = String(formData.get('message') ?? '')
  const token = String(formData.get('recaptchaToken') ?? '')

  const validationError = validateContactInput({ name, email, message })
  if (validationError) {
    return { status: 'error', message: validationError }
  }

  if (!token) {
    return { status: 'error', message: "Couldn't verify you're not a bot. Please try again." }
  }

  let recaptchaOk: boolean
  try {
    recaptchaOk = await verifyRecaptcha(token)
  } catch {
    return { status: 'error', message: 'Could not verify you\'re not a bot right now. Please try again shortly.' }
  }
  if (!recaptchaOk) {
    return { status: 'error', message: "Couldn't verify you're not a bot. Please try again." }
  }

  try {
    await sendContactEmail({ name, email, message })
  } catch {
    return { status: 'error', message: 'Could not send your message right now. Please try again later.' }
  }

  return { status: 'success', message: "Thanks — I'll get back to you soon." }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- app/contact/__tests__/actions.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add app/contact/actions.ts app/contact/__tests__/actions.test.ts
git commit -m "feat: add contact form server action orchestrating validation, recaptcha, email"
```

---

### Task 6: ContactForm client component

**Files:**
- Create: `components/ContactForm.tsx`
- Test: `components/__tests__/ContactForm.test.tsx`

**Interfaces:**
- Consumes: `submitContactForm`, `initialContactFormState`, `ContactFormState` from `app/contact/actions.ts` (Task 5).
- Produces: `ContactForm` React component (default export not used — named export, matching `ResumeDownload`/`ThemeToggle` convention). Reads `process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY` at module scope.

- [ ] **Step 1: Write the failing tests**

Create `components/__tests__/ContactForm.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const submitContactForm = vi.fn()

vi.mock('@/app/contact/actions', () => ({
  submitContactForm: (...args: unknown[]) => submitContactForm(...args),
  initialContactFormState: { status: 'idle', message: '' },
}))

import { ContactForm } from '../ContactForm'

describe('ContactForm', () => {
  beforeEach(() => {
    submitContactForm.mockReset()
    window.grecaptcha = {
      ready: (cb: () => void) => cb(),
      execute: vi.fn().mockResolvedValue('mock-token'),
    }
  })

  it('renders name, email, and message fields', () => {
    render(<ContactForm />)
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument()
  })

  it('submits the form and shows the success message', async () => {
    submitContactForm.mockResolvedValue({ status: 'success', message: "Thanks — I'll get back to you soon." })

    render(<ContactForm />)
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Jane' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } })
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'Hi there' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))

    await waitFor(() => {
      expect(screen.getByText(/thanks/i)).toBeInTheDocument()
    })
    expect(submitContactForm).toHaveBeenCalled()
  })

  it('shows the error message when the action reports an error', async () => {
    submitContactForm.mockResolvedValue({ status: 'error', message: 'Please enter your name.' })

    render(<ContactForm />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } })
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'Hi there' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))

    await waitFor(() => {
      expect(screen.getByText('Please enter your name.')).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- components/__tests__/ContactForm.test.tsx`
Expected: FAIL — `Cannot find module '../ContactForm'`

- [ ] **Step 3: Implement**

Create `components/ContactForm.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import Script from 'next/script'
import { submitContactForm, initialContactFormState } from '@/app/contact/actions'

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void
      execute: (siteKey: string, options: { action: string }) => Promise<string>
    }
  }
}

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? ''

async function getRecaptchaToken(): Promise<string> {
  if (!window.grecaptcha) return ''
  return new Promise((resolve) => {
    window.grecaptcha!.ready(() => {
      window
        .grecaptcha!.execute(RECAPTCHA_SITE_KEY, { action: 'contact' })
        .then(resolve)
        .catch(() => resolve(''))
    })
  })
}

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(submitContactForm, initialContactFormState)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    formData.set('recaptchaToken', await getRecaptchaToken())
    formAction(formData)
  }

  const inputClasses =
    'mt-1 w-full rounded-[5px] border border-[#D8D3C6] dark:border-[#2A2F38] bg-transparent px-3 py-2 font-mono text-sm text-[#2B2A26] dark:text-[#EDEFF2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B5772E] dark:focus-visible:outline-[#D9A441]'

  return (
    <>
      {RECAPTCHA_SITE_KEY && (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`}
          strategy="afterInteractive"
        />
      )}
      <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
        <div>
          <label htmlFor="contact-name" className="font-mono text-xs text-[#7A7568] dark:text-[#8A9099]">
            Name
          </label>
          <input id="contact-name" name="name" type="text" className={inputClasses} />
        </div>
        <div>
          <label htmlFor="contact-email" className="font-mono text-xs text-[#7A7568] dark:text-[#8A9099]">
            Email
          </label>
          <input id="contact-email" name="email" type="email" className={inputClasses} />
        </div>
        <div>
          <label htmlFor="contact-message" className="font-mono text-xs text-[#7A7568] dark:text-[#8A9099]">
            Message
          </label>
          <textarea id="contact-message" name="message" rows={5} className={inputClasses} />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-[6px] font-mono text-xs border border-[#B5772E] dark:border-[#D9A441] text-[#B5772E] dark:text-[#D9A441] px-3 py-2 rounded-[5px] transition-colors duration-200 hover:bg-[#B5772E] dark:hover:bg-[#D9A441] hover:text-[#F7F4EE] dark:hover:text-[#14171C] focus-visible:bg-[#B5772E] dark:focus-visible:bg-[#D9A441] focus-visible:text-[#F7F4EE] dark:focus-visible:text-[#14171C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B5772E] dark:focus-visible:outline-[#D9A441] disabled:opacity-50 cursor-pointer"
        >
          {isPending ? 'Sending…' : 'Send'}
        </button>

        {state.message && (
          <p
            className={
              state.status === 'success'
                ? 'font-mono text-sm text-[#B5772E] dark:text-[#D9A441]'
                : 'font-mono text-sm text-red-600 dark:text-red-400'
            }
          >
            {state.message}
          </p>
        )}
      </form>
    </>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- components/__tests__/ContactForm.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add components/ContactForm.tsx components/__tests__/ContactForm.test.tsx
git commit -m "feat: add ContactForm component with reCAPTCHA v3 token flow"
```

---

### Task 7: Wire ContactForm into the contact page

**Files:**
- Modify: `app/contact/page.tsx`

**Interfaces:**
- Consumes: `ContactForm` from `components/ContactForm.tsx` (Task 6).

- [ ] **Step 1: Replace the placeholder mailto link with the form**

Modify `app/contact/page.tsx` (full replacement):

```tsx
import { ContactForm } from '@/components/ContactForm'

export default function ContactPage() {
  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-[18px] py-16 sm:py-24">
      <h1 className="font-mono text-2xl font-bold text-[#2B2A26] dark:text-[#EDEFF2]">
        Let's talk
      </h1>
      <p className="mt-3 text-[#7A7568] dark:text-[#8A9099]">
        [One line — e.g. "Open to junior software / full-stack roles. Reach out if you're
        hiring, or just want to talk shop."]
      </p>

      <ContactForm />

      <p className="mt-10 text-sm text-[#7A7568] dark:text-[#8A9099]">
        [Optional: GitHub / LinkedIn links here, kept secondary — not the main call to action.]
      </p>
    </main>
  )
}
```

Note: the bracketed tagline and footer link are pre-existing placeholders tracked separately in
`tasks/portfolio/content-pages/current.md` (About/contact copywriting) — out of scope for this
feature, left untouched.

- [ ] **Step 2: Manual smoke check in the dev server**

Run: `npm run dev`, open `http://localhost:3000/contact`
Expected: page renders the heading, the Name/Email/Message form, and a "Send" button in place of the old mailto link. Submitting (with no env vars set) should show the "Could not verify..." or "Could not send..." error message — expected, since no credentials exist yet.

- [ ] **Step 3: Commit**

```bash
git add app/contact/page.tsx
git commit -m "feat: wire ContactForm into the /contact page"
```

---

### Task 8: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass, including the pre-existing header/theme tests and all new contact tests.

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: build succeeds. (`NEXT_PUBLIC_RECAPTCHA_SITE_KEY` being unset means the `<Script>` tag is simply skipped at runtime — this is intentional per Task 6's `RECAPTCHA_SITE_KEY &&` guard.)

- [ ] **Step 3: Run the linter**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Final commit if any fixups were needed**

If steps 1–3 required fixes, commit them:

```bash
git add -A
git commit -m "fix: address build/lint issues from contact form verification pass"
```
