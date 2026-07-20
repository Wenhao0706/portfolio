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
