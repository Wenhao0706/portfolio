import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TerminalHeading } from '@/components/TerminalHeading'

const TEXT = 'Some things I have built'

/** Captured so a test can decide when the heading comes into view. */
let trigger: (() => void) | null = null

beforeEach(() => {
  trigger = null
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(private cb: IntersectionObserverCallback) {
        trigger = () =>
          this.cb(
            [{ isIntersecting: true } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver
          )
      }
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    }
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TerminalHeading', () => {
  it('exposes the real text as the accessible name', () => {
    render(<TerminalHeading>{TEXT}</TerminalHeading>)
    expect(screen.getByRole('heading', { name: TEXT })).toBeInTheDocument()
  })

  it('renders real copy before it is scrolled to, never noise', () => {
    const { container } = render(<TerminalHeading>{TEXT}</TerminalHeading>)
    expect(container.querySelector('h2')!.textContent).toContain(TEXT)
  })

  it('resolves back to the exact text once the decode finishes', async () => {
    const { container } = render(<TerminalHeading>{TEXT}</TerminalHeading>)
    const visible = () => container.querySelectorAll('h2 > span')[1]

    trigger!()

    /* The real defect this guards is a frame function that never lands on the
       input, leaving a heading permanently misspelled with nothing in the
       console. Assert the settled text, not an intermediate frame. */
    await waitFor(() => expect(visible().textContent).toBe(TEXT), { timeout: 4000 })
  })

  it('keeps the accessible name stable while the glyphs are still churning', () => {
    render(<TerminalHeading>{TEXT}</TerminalHeading>)
    trigger!()
    expect(screen.getByRole('heading', { name: TEXT })).toBeInTheDocument()
  })

  it('passes data attributes through, so the reveal registry can still find it', () => {
    const { container } = render(
      <TerminalHeading data-reveal="projects-heading">{TEXT}</TerminalHeading>
    )
    expect(container.querySelector('[data-reveal="projects-heading"]')).not.toBeNull()
  })
})
