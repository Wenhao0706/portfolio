import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('vitest + RTL setup', () => {
  it('renders a basic element', () => {
    render(<p>hello header</p>)
    expect(screen.getByText('hello header')).toBeInTheDocument()
  })
})
