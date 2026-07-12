import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const mockUsePathname = vi.fn()
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

import { NavTabs } from '../NavTabs'

describe('NavTabs', () => {
  it('renders all three tabs with .tsx suffixes', () => {
    mockUsePathname.mockReturnValue('/')
    render(<NavTabs />)
    expect(screen.getByText('about')).toBeInTheDocument()
    expect(screen.getByText('projects')).toBeInTheDocument()
    expect(screen.getByText('contact')).toBeInTheDocument()
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
