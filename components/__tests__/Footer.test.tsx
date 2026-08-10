import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Footer from '@/components/Footer'

describe('Footer', () => {
  it('leads with the call to action', () => {
    render(<Footer />)
    expect(screen.getByRole('heading', { name: /let's build something great/i })).toBeInTheDocument()
  })

  it('renders social tiles with accessible names', () => {
    render(<Footer />)
    expect(screen.getByRole('link', { name: /github/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /email/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /whatsapp/i })).toBeInTheDocument()
  })

  it('points nav links at on-page anchors', () => {
    render(<Footer />)
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '#about')
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '#projects')
  })

  it('renders no traffic numbers until real counters exist', () => {
    render(<Footer />)
    expect(screen.queryByText(/total visits/i)).toBeNull()
  })
})
