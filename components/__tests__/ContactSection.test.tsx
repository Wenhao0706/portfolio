import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/ContactForm', () => ({
  ContactForm: () => <form data-testid="contact-form" />,
}))

import { Contact } from '@/components/sections/Contact'

describe('Contact section', () => {
  it('renders an anchor target and the reveal hook', () => {
    const { container } = render(<Contact />)
    expect(container.querySelector('#contact')).not.toBeNull()
    expect(container.querySelector('[data-reveal="contact"]')).not.toBeNull()
  })

  it('mounts the real contact form', () => {
    render(<Contact />)
    expect(screen.getByTestId('contact-form')).toBeInTheDocument()
  })

  it('keeps the email and WhatsApp fallbacks', () => {
    render(<Contact />)
    expect(screen.getByRole('link', { name: /manhou688@gmail\.com/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /whatsapp/i })).toBeInTheDocument()
  })
})
