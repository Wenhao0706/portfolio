'use client'

import { startTransition, useActionState, useEffect, useRef } from 'react'
import Script from 'next/script'
import { submitContactForm } from '@/app/contact/actions'
import { initialContactFormState } from '@/lib/contact/state'
import { HONEYPOT_FIELD } from '@/lib/contact/honeypot'
import { ACCENT_BUTTON } from '@/lib/ui'

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
  const formRef = useRef<HTMLFormElement>(null)
  const wasPending = useRef(false)

  // Clear the fields once a send lands, otherwise the page is visually identical to an
  // unsubmitted form plus one line of text and people re-click, spending their whole
  // rate-limit budget on one message.
  //
  // Keyed on the pending edge (true -> false), NOT on `state`: the action returns the same
  // frozen SUCCESS_STATE object by reference every time, so an effect depending on `state`
  // never re-runs for a second message and the form would only ever clear once.
  useEffect(() => {
    if (wasPending.current && !isPending && state.status === 'success') {
      formRef.current?.reset()
    }
    wasPending.current = isPending
  }, [isPending, state.status])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    formData.set('recaptchaToken', await getRecaptchaToken())
    startTransition(() => {
      formAction(formData)
    })
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
      <form ref={formRef} onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
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

        {/* Honeypot: positioned off-screen rather than display:none, because some bots skip
            display-hidden inputs. aria-hidden + tabIndex=-1 keep it away from screen readers
            and keyboard users. A filled value means a script filled it.

            No <label> and a meaningless field name on purpose — a label is exactly what
            tells a password manager what to fill, and `autoComplete="off"` is not honoured
            by Chrome for address-type fields or by most managers. The wrapper is
            aria-hidden, so a label would serve no accessibility purpose anyway. The
            data-*-ignore attributes opt out of 1Password and LastPass explicitly.
            See HONEYPOT_FIELD's docblock for why a false trip is the worst case here. */}
        <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
          <input
            id="contact-ref-token"
            name={HONEYPOT_FIELD}
            type="text"
            tabIndex={-1}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className={`${ACCENT_BUTTON} disabled:opacity-50`}
        >
          {isPending ? 'Sending…' : 'Send'}
        </button>

        <p
          role="status"
          aria-live="polite"
          className={
            state.status === 'success'
              ? 'font-mono text-sm text-[#B5772E] dark:text-[#D9A441]'
              : state.status === 'error'
                ? 'font-mono text-sm text-red-600 dark:text-red-400'
                : 'font-mono text-sm'
          }
        >
          {state.message}
        </p>

        {RECAPTCHA_SITE_KEY && (
          <p className="font-mono text-[10px] text-[#7A7568] dark:text-[#8A9099]">
            This site is protected by reCAPTCHA and the Google{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Privacy Policy
            </a>{' '}
            and{' '}
            <a
              href="https://policies.google.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Terms of Service
            </a>{' '}
            apply.
          </p>
        )}
      </form>
    </>
  )
}
