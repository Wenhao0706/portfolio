import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { TerminalDemo } from '@/components/sections/TerminalDemo'
import { PROJECTS } from '@/lib/projects'

const setup = async () => {
  const user = userEvent.setup()
  render(
    <ThemeProvider>
      <TerminalDemo />
    </ThemeProvider>
  )
  const input = screen.getByLabelText(/terminal input/i)
  await user.click(input)
  return { user, input }
}

const type = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
  await user.keyboard(`${text}{Enter}`)
}

describe('TerminalDemo', () => {
  it('greets with something that tells you what to do next', () => {
    render(
      <ThemeProvider>
        <TerminalDemo />
      </ThemeProvider>
    )
    expect(screen.getByText(/type 'help'/i)).toBeInTheDocument()
  })

  it('echoes the command and prints its output', async () => {
    const { user } = await setup()
    await type(user, 'whoami')
    expect(screen.getByText('yoon_man_hou')).toBeInTheDocument()
  })

  it('clears the input after submitting', async () => {
    const { user, input } = await setup()
    await type(user, 'whoami')
    expect(input).toHaveValue('')
  })

  it('reports an unknown command instead of failing silently', async () => {
    const { user } = await setup()
    await type(user, 'dance')
    expect(screen.getByText(/command not found: dance/i)).toBeInTheDocument()
  })

  it('clear wipes the transcript, including the banner', async () => {
    const { user } = await setup()
    await type(user, 'clear')
    expect(screen.queryByText(/type 'help'/i)).toBeNull()
  })

  it('keeps history across a clear, the way a real shell does', async () => {
    const { user, input } = await setup()
    await type(user, 'whoami')
    await type(user, 'clear')
    await user.keyboard('{ArrowUp}')
    expect(input).toHaveValue('clear')
    await user.keyboard('{ArrowUp}')
    expect(input).toHaveValue('whoami')
  })

  it('walks back down the history and returns to an empty line', async () => {
    const { user, input } = await setup()
    await type(user, 'whoami')
    await type(user, 'skills')
    await user.keyboard('{ArrowUp}{ArrowUp}')
    expect(input).toHaveValue('whoami')
    await user.keyboard('{ArrowDown}')
    expect(input).toHaveValue('skills')
    await user.keyboard('{ArrowDown}')
    expect(input).toHaveValue('')
  })

  it('completes a unique prefix on Tab and leaves a trailing space to type into', async () => {
    const { user, input } = await setup()
    await user.keyboard('wh{Tab}')
    expect(input).toHaveValue('whoami ')
  })

  it('prints the candidates when Tab is ambiguous rather than guessing', async () => {
    const { user, input } = await setup()
    await user.keyboard('c{Tab}')
    expect(input).toHaveValue('c')
    /* Registry order, not alphabetical: cat, contact, clear. */
    expect(screen.getByText(/cat\s+contact\s+clear/)).toBeInTheDocument()
  })

  it('toggles the site theme, sharing the header button context', async () => {
    const { user } = await setup()
    const before = document.documentElement.classList.contains('dark')
    await type(user, 'theme')
    expect(document.documentElement.classList.contains('dark')).toBe(!before)
  })

  it('opens a repo in a new tab only for a project that has one', async () => {
    const open = vi.fn()
    vi.stubGlobal('open', open)
    const linked = PROJECTS.find((p) => p.repoUrl)!
    const unlinked = PROJECTS.find((p) => !p.repoUrl)!

    const { user } = await setup()
    await type(user, `open ${linked.slug}`)
    expect(open).toHaveBeenCalledWith(linked.repoUrl, '_blank', 'noopener,noreferrer')

    open.mockClear()
    await type(user, `open ${unlinked.slug}`)
    expect(open).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('scrolls the page when asked to, using the real section id', async () => {
    const section = document.createElement('div')
    section.id = 'projects'
    const scrollIntoView = vi.fn()
    section.scrollIntoView = scrollIntoView
    document.body.appendChild(section)

    const { user } = await setup()
    await type(user, 'goto projects')
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' })

    section.remove()
  })

  it('submits nothing on an empty line without crashing', async () => {
    const { user } = await setup()
    await user.keyboard('{Enter}')
    expect(screen.getByText(/type 'help'/i)).toBeInTheDocument()
  })
})
