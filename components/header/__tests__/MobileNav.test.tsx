import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import HeaderComponent from '../Header'

/* ThemeProvider moved to app/layout.tsx, so a standalone Header render supplies
   it here. See Header.test.tsx. */
const Header = () => (
  <ThemeProvider>
    <HeaderComponent />
  </ThemeProvider>
)

const openMenu = async () => {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /open menu/i }))
  return user
}

describe('mobile menu', () => {
  it('starts closed', () => {
    render(<Header />)
    const button = screen.getByRole('button', { name: /open menu/i })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById('mobile-nav')).toHaveAttribute('aria-hidden', 'true')
  })

  /* The desktop nav and the mobile panel are both always in the DOM; only CSS
     hides one. Without inert + aria-hidden a keyboard user tabs through a second
     invisible copy of every link, which is invisible to a purely visual check. */
  it('keeps the closed panel out of the accessibility tree and the tab order', () => {
    render(<Header />)
    const panel = document.getElementById('mobile-nav')!
    expect(panel).toHaveAttribute('inert')
    expect(screen.getAllByRole('link', { name: 'About' })).toHaveLength(1)
  })

  it('opens on click and exposes the section links', async () => {
    render(<Header />)
    await openMenu()

    const button = screen.getByRole('button', { name: /close menu/i })
    expect(button).toHaveAttribute('aria-expanded', 'true')

    const panel = document.getElementById('mobile-nav')!
    expect(panel).not.toHaveAttribute('inert')
    for (const label of ['About', 'Projects', 'Contact']) {
      expect(within(panel).getByRole('link', { name: label })).toHaveAttribute(
        'href',
        `#${label.toLowerCase()}`
      )
    }
  })

  it('offers the resume inside the menu, since the header button is hidden on mobile', async () => {
    render(<Header />)
    await openMenu()
    const panel = document.getElementById('mobile-nav')!
    expect(within(panel).getByRole('link', { name: /resume/i })).toHaveAttribute(
      'href',
      '/resume.pdf'
    )
  })

  it('closes after a section is chosen, so the panel does not cover the target', async () => {
    render(<Header />)
    const user = await openMenu()
    const panel = document.getElementById('mobile-nav')!

    await user.click(within(panel).getByRole('link', { name: 'Projects' }))

    expect(screen.getByRole('button', { name: /open menu/i })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
  })

  it('closes on Escape and hands focus back to the button', async () => {
    render(<Header />)
    const user = await openMenu()

    await user.keyboard('{Escape}')

    const button = screen.getByRole('button', { name: /open menu/i })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveFocus()
  })
})
