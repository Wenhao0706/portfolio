import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { ThemeToggle } from '../ThemeToggle'

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  it('shows a control labelled with the current theme', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )
    expect(screen.getByRole('button', { name: /dark/i })).toBeInTheDocument()
  })

  it('flips the label and html class when clicked', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: /dark/i }))
    expect(screen.getByRole('button', { name: /light/i })).toBeInTheDocument()
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
