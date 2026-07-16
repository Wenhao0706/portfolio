import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const mockUsePathname = vi.fn()
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

import { NavTabs } from '../NavTabs'

describe('NavTabs', () => {
  it('renders all three nav tabs', () => {
    mockUsePathname.mockReturnValue('/')
    render(<NavTabs />)
    expect(screen.getByRole('link', { name: /about/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /projects/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /contact/i })).toBeInTheDocument()
  })

  it('marks the tab matching the current pathname as active', () => {
    mockUsePathname.mockReturnValue('/projects')
    render(<NavTabs />)
    const projectsLink = screen.getByRole('link', { name: /projects/i })
    expect(projectsLink).toHaveAttribute('aria-current', 'page')
    const aboutLink = screen.getByRole('link', { name: /about/i })
    expect(aboutLink).not.toHaveAttribute('aria-current')
  })
})
