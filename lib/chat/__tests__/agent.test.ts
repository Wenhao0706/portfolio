import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { askAgent } from '../agent'
import type { ChatMessage } from '../validate'

const MESSAGES: ChatMessage[] = [{ role: 'user', content: 'what stack?' }]

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

describe('askAgent', () => {
  beforeEach(() => {
    vi.stubEnv('CHAT_AGENT_URL', 'https://agent.example.com/chat')
    vi.stubEnv('CHAT_AGENT_SECRET', 'test-secret')
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('returns the reply on a healthy response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ reply: '  He uses Next.js.  ' })))
    await expect(askAgent(MESSAGES)).resolves.toEqual({ ok: true, reply: 'He uses Next.js.' })
  })

  it('sends the bearer secret and a system + prompt body', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ reply: 'ok' }))
    vi.stubGlobal('fetch', fetchMock)
    await askAgent(MESSAGES)

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://agent.example.com/chat')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer test-secret')

    const body = JSON.parse(init.body as string)
    expect(typeof body.system).toBe('string')
    expect(body.system.length).toBeGreaterThan(0)
    // The transcript must end on the anchor, or Claude continues its own last turn.
    expect(body.prompt.endsWith('Assistant:')).toBe(true)
    expect(body.prompt).toContain('Visitor: what stack?')
  })

  it('fails closed when the env vars are unset', async () => {
    vi.stubEnv('CHAT_AGENT_URL', '')
    vi.stubEnv('CHAT_AGENT_SECRET', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(askAgent(MESSAGES)).resolves.toEqual({ ok: false, reason: 'not-configured' })
    // The point of the short-circuit: no request is attempted at all.
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports a timeout distinctly from an unreachable box', async () => {
    const timeout = Object.assign(new Error('signal timed out'), { name: 'TimeoutError' })
    vi.stubGlobal('fetch', vi.fn(async () => { throw timeout }))
    await expect(askAgent(MESSAGES)).resolves.toEqual({ ok: false, reason: 'timeout' })
  })

  it('reports a network failure as unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed') }))
    await expect(askAgent(MESSAGES)).resolves.toEqual({ ok: false, reason: 'unavailable' })
  })

  it('treats a non-2xx as unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'agent error' }, 502)))
    await expect(askAgent(MESSAGES)).resolves.toEqual({ ok: false, reason: 'unavailable' })
  })

  it('treats an unparseable body as unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => { throw new SyntaxError('not json') },
    } as unknown as Response)))
    await expect(askAgent(MESSAGES)).resolves.toEqual({ ok: false, reason: 'unavailable' })
  })

  // A 200 carrying nothing is what `claude -p` exiting 0 with empty stdout looks like —
  // quota exhausted, or killed mid-run. Rendering it would show an empty bubble.
  it.each([[''], ['   '], [null], [42]])('treats a 200 with reply %p as empty', async (reply) => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ reply })))
    await expect(askAgent(MESSAGES)).resolves.toEqual({ ok: false, reason: 'empty' })
  })
})
