import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const submitContactForm = vi.fn()

vi.mock('@/app/contact/actions', () => ({
  submitContactForm: (...args: unknown[]) => submitContactForm(...args),
  initialContactFormState: { status: 'idle', message: '' },
}))

import { ContactForm } from '../ContactForm'
import { HONEYPOT_FIELD } from '@/lib/contact/honeypot'

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

  // Without these, deleting the honeypot <div> leaves the whole suite green while the gate
  // goes dead — isBot() would read an absent field and return false for every bot forever.
  // Keyed off HONEYPOT_FIELD, not the literal 'company', so renaming the constant can't
  // leave the form and the Server Action reading different names.
  describe('honeypot field', () => {
    it('renders an input under the shared HONEYPOT_FIELD name', () => {
      const { container } = render(<ContactForm />)
      expect(container.querySelector(`input[name="${HONEYPOT_FIELD}"]`)).toBeInTheDocument()
    })

    it('submits the honeypot field so the Server Action can read it', async () => {
      submitContactForm.mockResolvedValue({ status: 'success', message: 'Thanks' })

      render(<ContactForm />)
      fireEvent.click(screen.getByRole('button', { name: /send/i }))

      await waitFor(() => expect(submitContactForm).toHaveBeenCalled())
      const formData = submitContactForm.mock.calls[0].find(
        (arg: unknown): arg is FormData => arg instanceof FormData
      )
      expect(formData?.has(HONEYPOT_FIELD)).toBe(true)
    })

    it('hides the honeypot from assistive tech', () => {
      const { container } = render(<ContactForm />)
      const honeypot = container.querySelector(`input[name="${HONEYPOT_FIELD}"]`)
      expect(honeypot).not.toBeNull()
      // aria-hidden on the wrapper keeps it out of the accessibility tree entirely.
      expect(honeypot?.closest('[aria-hidden="true"]')).not.toBeNull()
      // Assert the honeypot is absent from the accessibility tree directly, rather than by
      // counting textboxes — name, email and message are all role=textbox, so a count is
      // both brittle and easy to get wrong.
      const exposed = screen.queryAllByRole('textbox')
      expect(exposed.some((el) => el.getAttribute('name') === HONEYPOT_FIELD)).toBe(false)
    })

    // Regression guard for the autofill trap: a real person's password manager filling
    // this field trips isBot, which returns a success state identical to a real send, so
    // their message is discarded silently. Field names in the autofill vocabulary are the
    // whole risk — see HONEYPOT_FIELD's docblock.
    it('uses a field name and markup that autofill will not target', () => {
      const { container } = render(<ContactForm />)
      expect(HONEYPOT_FIELD).not.toMatch(
        /^(company|organization|address|phone|tel|url|title|name|email|username)$/i
      )
      const honeypot = container.querySelector<HTMLInputElement>(
        `input[name="${HONEYPOT_FIELD}"]`
      )
      // No <label> anywhere in the honeypot wrapper — a label is what heuristic fillers read.
      expect(honeypot?.closest('div')?.querySelector('label')).toBeNull()
      expect(honeypot?.getAttribute('autocomplete')).toBe('off')
      expect(honeypot?.hasAttribute('data-1p-ignore')).toBe(true)
      expect(honeypot?.getAttribute('data-lpignore')).toBe('true')
    })

    it('keeps the honeypot out of the keyboard tab order', () => {
      const { container } = render(<ContactForm />)
      const honeypot = container.querySelector<HTMLInputElement>(
        `input[name="${HONEYPOT_FIELD}"]`
      )
      expect(honeypot?.tabIndex).toBe(-1)
    })
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

    const call = submitContactForm.mock.calls[0]
    const formData = call.find((arg): arg is FormData => arg instanceof FormData)
    expect(formData).toBeInstanceOf(FormData)
    expect(formData?.get('recaptchaToken')).toBe('mock-token')
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

// Regression guard: the badge lives outside React's tree, so a hiding rule scoped to
// ContactForm unmounts with the form and the badge reappears on other pages. See app/globals.css.
describe('reCAPTCHA badge hiding', () => {
  const projectRoot = resolve(__dirname, '../..')
  const readSource = (relativePath: string) => readFileSync(resolve(projectRoot, relativePath), 'utf8')

  it('is declared in globals.css, not scoped to the ContactForm subtree', () => {
    expect(readSource('app/globals.css')).toMatch(/\.grecaptcha-badge\s*\{[^}]*visibility:\s*hidden/)
  })

  it('is not re-declared inside ContactForm, where it would unmount on navigation', () => {
    expect(readSource('components/ContactForm.tsx')).not.toMatch(/grecaptcha-badge/)
  })
})
