import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Footer from '@/components/Footer'
import { NAV_SECTIONS } from '@/lib/sections'

describe('Footer', () => {
  it('closes the session rather than opening a second call to action', () => {
    render(<Footer />)
    /* Two matches by design: TypedLine keeps the real text in an sr-only span so
       the accessible content is complete from first paint, and animates a second
       aria-hidden copy. */
    expect(screen.getAllByText('exit')).toHaveLength(2)
    expect(screen.getByText(/process exited/i)).toBeInTheDocument()
  })

  /* The CTA lived here when contact was its own route. On one page it sits right
     under the contact form and asks for the same thing twice, which is what made
     the footer read as another section instead of the end. */
  it('no longer duplicates the contact call to action above it', () => {
    render(<Footer />)
    expect(screen.queryByText(/let's build something great/i)).toBeNull()
  })

  it('renders social tiles with accessible names', () => {
    render(<Footer />)
    expect(screen.getByRole('link', { name: /github/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /email/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /whatsapp/i })).toBeInTheDocument()
  })

  it('links every navigable section, matching the header', () => {
    render(<Footer />)
    for (const section of NAV_SECTIONS) {
      expect(screen.getByRole('link', { name: section.label })).toHaveAttribute(
        'href',
        `#${section.id}`
      )
    }
  })

  it('renders no traffic numbers until real counters exist', () => {
    render(<Footer />)
    expect(screen.queryByText(/total visits/i)).toBeNull()
  })
})
