import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChatWidget from '@/components/chat/ChatWidget'

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response
}

/** The panel is always mounted so it can animate; `inert` is what makes it really closed. */
function panel() {
  return screen.getByRole('dialog', { hidden: true })
}

describe('ChatWidget', () => {
  beforeEach(() => {
    // jsdom keeps ONE localStorage for the whole file, so without this a transcript written
    // by an earlier test is restored into the next one and every getByText finds two nodes.
    window.localStorage.clear()
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ reply: 'He built a geofencing app.' })))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the launcher closed, with the panel inert', () => {
    render(<ChatWidget />)
    const launcher = screen.getByRole('button', { name: 'Ask about Man Hou' })
    expect(launcher).toHaveAttribute('aria-expanded', 'false')
    expect(panel()).toHaveAttribute('inert')
  })

  it('opens the panel and focuses the input', async () => {
    const userAction = userEvent.setup()
    render(<ChatWidget />)
    await userAction.click(screen.getByRole('button', { name: 'Ask about Man Hou' }))

    expect(panel()).not.toHaveAttribute('inert')
    await waitFor(() => {
      expect(screen.getByLabelText('Ask a question about Man Hou')).toHaveFocus()
    })
  })

  it('sends a question and renders the reply', async () => {
    const userAction = userEvent.setup()
    render(<ChatWidget />)
    await userAction.click(screen.getByRole('button', { name: 'Ask about Man Hou' }))
    await userAction.type(screen.getByLabelText('Ask a question about Man Hou'), 'what has he built?')
    await userAction.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByText('He built a geofencing app.')).toBeInTheDocument()
    expect(screen.getByText('what has he built?')).toBeInTheDocument()

    // Selected by URL, not by call order: opening the panel also fires GET /api/chat/ip,
    // so indexing into calls[0] silently asserts against the wrong request.
    const chatCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
      ([url]) => url === '/api/chat'
    )
    expect(chatCall).toBeDefined()
    expect(JSON.parse(chatCall![1].body)).toEqual({
      messages: [{ role: 'user', content: 'what has he built?' }],
    })
  })

  it('clears the input after sending', async () => {
    const userAction = userEvent.setup()
    render(<ChatWidget />)
    await userAction.click(screen.getByRole('button', { name: 'Ask about Man Hou' }))
    const input = screen.getByLabelText('Ask a question about Man Hou')
    await userAction.type(input, 'hi{Enter}')

    await waitFor(() => expect(input).toHaveValue(''))
  })

  it('sends a suggestion when one is clicked', async () => {
    const userAction = userEvent.setup()
    render(<ChatWidget />)
    await userAction.click(screen.getByRole('button', { name: 'Ask about Man Hou' }))
    await userAction.click(screen.getByRole('button', { name: 'Is he looking for work?' }))

    expect(await screen.findByText('He built a geofencing app.')).toBeInTheDocument()
  })

  it('surfaces a 400 error message from the gate', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ error: 'Please keep your message under 1000 characters.' }, 400))
    )
    const userAction = userEvent.setup()
    render(<ChatWidget />)
    await userAction.click(screen.getByRole('button', { name: 'Ask about Man Hou' }))
    await userAction.type(screen.getByLabelText('Ask a question about Man Hou'), 'hi{Enter}')

    expect(
      await screen.findByText('Please keep your message under 1000 characters.')
    ).toBeInTheDocument()
  })

  it('surfaces a network failure without losing the typed turn', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed') }))
    const userAction = userEvent.setup()
    render(<ChatWidget />)
    await userAction.click(screen.getByRole('button', { name: 'Ask about Man Hou' }))
    await userAction.type(screen.getByLabelText('Ask a question about Man Hou'), 'hi{Enter}')

    expect(await screen.findByText(/Could not reach the server/)).toBeInTheDocument()
    expect(screen.getByText('hi')).toBeInTheDocument()
  })

  describe('history persistence', () => {
    const STORAGE_KEY = 'manhou-chat-history'

    it('writes the transcript to localStorage after a turn', async () => {
      const userAction = userEvent.setup()
      render(<ChatWidget />)
      await userAction.click(screen.getByRole('button', { name: 'Ask about Man Hou' }))
      await userAction.type(screen.getByLabelText('Ask a question about Man Hou'), 'hi{Enter}')
      await screen.findByText('He built a geofencing app.')

      await waitFor(() => {
        expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) as string)).toEqual([
          { role: 'user', content: 'hi' },
          { role: 'assistant', content: 'He built a geofencing app.' },
        ])
      })
    })

    it('restores a stored transcript on mount', async () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([
          { role: 'user', content: 'earlier question' },
          { role: 'assistant', content: 'earlier answer' },
        ])
      )
      render(<ChatWidget />)
      expect(await screen.findByText('earlier question')).toBeInTheDocument()
      expect(screen.getByText('earlier answer')).toBeInTheDocument()
    })

    // Hand-editable data: a malformed entry must not take the whole widget down.
    it('drops malformed stored entries instead of crashing', async () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([{ role: 'system', content: 'x' }, { nope: 1 }, { role: 'user', content: 'good' }])
      )
      render(<ChatWidget />)
      expect(await screen.findByText('good')).toBeInTheDocument()
      expect(screen.queryByText('x')).not.toBeInTheDocument()
    })

    it('survives unparseable JSON in storage', async () => {
      window.localStorage.setItem(STORAGE_KEY, 'not json at all')
      render(<ChatWidget />)
      expect(screen.getByRole('button', { name: 'Ask about Man Hou' })).toBeInTheDocument()
    })

    it('does not wipe stored history on mount before restoring it', async () => {
      const stored = [{ role: 'user', content: 'kept' }]
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
      render(<ChatWidget />)
      await screen.findByText('kept')
      expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) as string)).toEqual(stored)
    })

    it('clears the transcript and storage on New chat', async () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([{ role: 'user', content: 'old question' }])
      )
      const userAction = userEvent.setup()
      render(<ChatWidget />)
      await userAction.click(screen.getByRole('button', { name: 'Ask about Man Hou' }))
      await screen.findByText('old question')

      await userAction.click(screen.getByRole('button', { name: 'New chat' }))

      expect(screen.queryByText('old question')).not.toBeInTheDocument()
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    })
  })

  describe('visitor IP in the header', () => {
    it('fetches the IP on first open and shows it as a shell prompt', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string) =>
          url === '/api/chat/ip'
            ? jsonResponse({ ip: '203.0.113.45' })
            : jsonResponse({ reply: 'hi' })
        )
      )
      const userAction = userEvent.setup()
      render(<ChatWidget />)

      // Not fetched until the panel is actually opened — the widget is on every page.
      expect(globalThis.fetch).not.toHaveBeenCalled()

      await userAction.click(screen.getByRole('button', { name: 'Ask about Man Hou' }))
      expect(await screen.findByText('203.0.113.45')).toBeInTheDocument()
      expect(screen.getByText('you@')).toBeInTheDocument()
    })

    it('does not re-fetch when the panel is reopened', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ ip: '203.0.113.45' })))
      const userAction = userEvent.setup()
      render(<ChatWidget />)
      const launcher = screen.getByRole('button', { name: 'Ask about Man Hou' })

      await userAction.click(launcher)
      await screen.findByText('203.0.113.45')
      await userAction.keyboard('{Escape}')
      await userAction.click(launcher)

      const ipCalls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
        ([url]) => url === '/api/chat/ip'
      )
      expect(ipCalls).toHaveLength(1)
    })

    // Decoration must never be able to break the chat.
    it('keeps the plain title when the IP lookup fails', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed') }))
      const userAction = userEvent.setup()
      render(<ChatWidget />)
      await userAction.click(screen.getByRole('button', { name: 'Ask about Man Hou' }))

      expect(await screen.findByText('ask-about-manhou')).toBeInTheDocument()
      expect(screen.queryByText('you@')).not.toBeInTheDocument()
    })
  })

  it('closes on Escape and returns focus to the launcher', async () => {
    const userAction = userEvent.setup()
    render(<ChatWidget />)
    const launcher = screen.getByRole('button', { name: 'Ask about Man Hou' })
    await userAction.click(launcher)
    await userAction.keyboard('{Escape}')

    await waitFor(() => expect(panel()).toHaveAttribute('inert'))
    expect(screen.getByRole('button', { name: 'Ask about Man Hou' })).toHaveFocus()
  })
})
