import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Footer from '@/components/Footer'
import { SIGNOFF } from '@/lib/about'
import { NAV_SECTIONS } from '@/lib/sections'
import { LINKEDIN_URL } from '@/lib/site'

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

  it('sets his own sentence as the sign-off, not a slogan written for a footer', () => {
    render(<Footer />)
    expect(screen.getByText(SIGNOFF)).toBeInTheDocument()
  })

  it('states availability, which the contact form above does not', () => {
    render(<Footer />)
    expect(screen.getByText(/open to junior developer roles/i)).toBeInTheDocument()
  })

  it('renders social tiles with accessible names', () => {
    render(<Footer />)
    expect(screen.getByRole('link', { name: /github/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /email/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /whatsapp/i })).toBeInTheDocument()
  })

  /* simple-icons carries no LinkedIn mark, so the tile is a text glyph. The
     accessible name has to carry the meaning the missing icon would have. */
  it('links LinkedIn with a name a screen reader can use', () => {
    render(<Footer />)
    expect(screen.getByRole('link', { name: /linkedin/i })).toHaveAttribute('href', LINKEDIN_URL)
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
