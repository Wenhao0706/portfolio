import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider } from '../ThemeProvider'
import { useTheme } from '../useTheme'

function Probe() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button onClick={toggleTheme} data-testid="probe">
      {theme}
    </button>
  )
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  it('defaults to dark theme when nothing is stored', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    )
    expect(screen.getByTestId('probe')).toHaveTextContent('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('toggles theme and updates the html class + localStorage', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    )
    fireEvent.click(screen.getByTestId('probe'))
    expect(screen.getByTestId('probe')).toHaveTextContent('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('reads an existing theme from localStorage on mount', () => {
    localStorage.setItem('theme', 'light')
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    )
    expect(screen.getByTestId('probe')).toHaveTextContent('light')
  })
})
