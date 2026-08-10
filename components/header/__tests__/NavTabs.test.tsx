import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NavTabs } from '@/components/header/NavTabs'

beforeEach(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    }
  )
})

describe('NavTabs', () => {
  it('points every tab at an on-page anchor', () => {
    render(<NavTabs />)
    for (const label of ['About', 'Projects', 'Contact']) {
      const link = screen.getByRole('link', { name: label })
      expect(link.getAttribute('href')).toBe(`#${label.toLowerCase()}`)
    }
  })

  it('marks no tab current before any section is observed', () => {
    render(<NavTabs />)
    expect(screen.queryByRole('link', { current: 'true' })).toBeNull()
  })
})
