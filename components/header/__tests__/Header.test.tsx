import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

import Header from '../Header'

describe('Header', () => {
  it('renders the logo, nav tabs, and resume CTA', () => {
    render(<Header />)
    expect(
      screen.getByRole('link', { name: /yoonmanhou/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /about/i })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /resume/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dark|light/i })).toBeInTheDocument()
  })
})
