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
