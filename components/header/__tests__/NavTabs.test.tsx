import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NavTabs } from '@/components/header/NavTabs'

describe('NavTabs', () => {
  it('points every tab at an on-page anchor', () => {
    render(<NavTabs activeId={null} />)
    for (const label of ['About', 'Projects', 'Contact']) {
      const link = screen.getByRole('link', { name: label })
      expect(link.getAttribute('href')).toBe(`#${label.toLowerCase()}`)
    }
  })

  it('marks no tab current before any section is observed', () => {
    render(<NavTabs activeId={null} />)
    /* `current: true`, not `current: 'true'` — the string form never matches
       anything, so it would pass whether or not a tab was marked. */
    expect(screen.queryByRole('link', { current: true })).toBeNull()
  })

  it('marks exactly the section that owns the screen', () => {
    render(<NavTabs activeId="projects" />)
    expect(screen.getByRole('link', { current: true })).toHaveAccessibleName('Projects')
  })
})
