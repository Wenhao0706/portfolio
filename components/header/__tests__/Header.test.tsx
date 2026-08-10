import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import Header from '../Header'

/* ThemeProvider lives in app/layout.tsx now, wrapping the whole tree rather than
   just the header, so the terminal's `theme` command shares the header button's
   context. Rendering Header alone therefore has to supply it. */
const renderHeader = () =>
  render(
    <ThemeProvider>
      <Header />
    </ThemeProvider>
  )

describe('Header', () => {
  it('renders the logo, nav tabs, and resume CTA', () => {
    renderHeader()
    expect(screen.getByRole('link', { name: /yoonmanhou/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /about/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /resume/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dark|light/i })).toBeInTheDocument()
  })
})
