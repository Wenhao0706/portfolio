import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Projects } from '@/components/sections/Projects'
import { PROJECTS } from '@/lib/projects'

describe('Projects', () => {
  it('renders one card per project, strongest first', () => {
    const { container } = render(<Projects />)
    const cards = container.querySelectorAll('[data-reveal="project-card"]')
    expect(cards).toHaveLength(PROJECTS.length)
    expect(cards[0].textContent).toContain('Cleaning Service Booking App')
  })

  it('links only the projects that have a repo', () => {
    render(<Projects />)
    const links = screen.getAllByRole('link', { name: /view on github/i })
    expect(links).toHaveLength(PROJECTS.filter((p) => p.repoUrl).length)
    expect(links[0]).toHaveAttribute('href', 'https://github.com/Wenhao0706/Finance-management')
  })

  it('opens repo links safely in a new tab', () => {
    render(<Projects />)
    const link = screen.getAllByRole('link', { name: /view on github/i })[0]
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('renders one external link per site he built from scratch', () => {
    render(<Projects />)
    const sites = PROJECTS.flatMap((p) => p.sites ?? [])
    expect(sites.length).toBeGreaterThan(0)
    for (const site of sites) {
      const link = screen.getByRole('link', { name: new RegExp(site.label, 'i') })
      expect(link).toHaveAttribute('href', site.href)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
    }
  })

  it('never renders a dead "view project" affordance on a repo-less card', () => {
    render(<Projects />)
    expect(screen.queryByText(/view project/i)).toBeNull()
  })
})
