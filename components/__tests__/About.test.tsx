import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { About } from '@/components/sections/About'

describe('About', () => {
  it('renders an anchor target the nav can scroll to', () => {
    const { container } = render(<About />)
    expect(container.querySelector('#about')).not.toBeNull()
  })

  it('exposes itself to the reveal registry', () => {
    const { container } = render(<About />)
    const section = container.querySelector('[data-reveal="about"]')
    expect(section).not.toBeNull()
    expect(section!.children.length).toBeGreaterThan(0)
  })

  it('carries no bracketed placeholder copy', () => {
    render(<About />)
    expect(screen.queryByText(/\[.+\]/)).toBeNull()
  })
})
