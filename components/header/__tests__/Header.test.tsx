import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

import Header from '../Header'

describe('Header', () => {
  it('renders the logo, title bar text, nav tabs, and resume CTA', () => {
    render(<Header />)
    expect(screen.getByText('wenhao')).toBeInTheDocument()
    expect(screen.getByText(/wenhao\.dev/)).toBeInTheDocument()
    expect(screen.getByText('about')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /resume/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dark|light/i })).toBeInTheDocument()
  })
})
