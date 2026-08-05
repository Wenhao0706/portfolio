'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ChatLauncher from './ChatLauncher'
import ChatPanel from './ChatPanel'
import { useChatHistory } from './useChatHistory'
import { MAX_HISTORY_MESSAGES, type ChatMessage } from '@/lib/chat/validate'

/**
 * Owns the conversation. The panel and launcher are presentational; everything that talks
 * to `/api/chat` lives here.
 *
 * There is no session on the server, so this component IS the conversation — the whole
 * transcript is sent back each turn. That is deliberate: it keeps the EC2 box stateless,
 * so nothing about a visitor is ever stored next to the credentials. Mirroring the
 * transcript into the visitor's own browser is `useChatHistory`'s job.
 */

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useChatHistory()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * The visitor's own IP, shown in the panel header as a wink at the fact that the site
   * knows it. Fetched on FIRST OPEN rather than on mount, so a visitor who never opens the
   * chat never costs a request — the widget is on every page, so mounting is cheap and
   * common while opening is rare and deliberate.
   */
  const [visitorIp, setVisitorIp] = useState<string | null>(null)
  const ipRequested = useRef(false)

  /**
   * Set when the server reports a rate-limit block, and locks the composer.
   *
   * Purely a UX signal, NOT a security control — the server re-checks the limit on every
   * request, so a visitor who clears this in devtools just earns a second identical
   * refusal. It exists because a live input under a message saying "you have been blocked"
   * invites exactly the spamming the block is there to stop.
   *
   * Deliberately NOT cleared by `reset`: starting a new conversation does not give anyone
   * a fresh budget, and re-opening the composer would only lead them into a refusal.
   */
  const [blocked, setBlocked] = useState(false)

  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)

  const close = useCallback(() => setOpen(false), [])

  /**
   * Return focus to the launcher when the panel closes, or a keyboard user is dropped at
   * the top of the document with no idea where they are.
   *
   * Has to happen in an effect keyed on the open->closed EDGE, not inside `close()`. The
   * launcher is `tabIndex={-1}` and `aria-hidden` while the panel is open, so focusing it
   * synchronously inside the handler would target an element that is still hidden on that
   * commit. By the time this effect runs, the re-render has made it focusable again.
   */
  const wasOpen = useRef(false)
  useEffect(() => {
    if (wasOpen.current && !open) launcherRef.current?.focus()
    wasOpen.current = open
  }, [open])

  // Storage is cleaned by `useChatHistory`, whose save effect fires on the empty array.
  const reset = useCallback(() => {
    setMessages([])
    setError(null)
    inputRef.current?.focus()
  }, [setMessages])

  // Escape closes, which is what a dialog is expected to do. Bound to the document rather
  // than the panel because focus may sit on the launcher when the panel is open.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, close])

  // The ref guard, not a `[]` dependency: this must fire on first OPEN, not on mount, and
  // must not re-fire each time the panel is reopened.
  useEffect(() => {
    if (!open || ipRequested.current) return
    ipRequested.current = true
    fetch('/api/chat/ip')
      .then((res) => res.json())
      .then((data: { ip?: string }) => {
        if (typeof data.ip === 'string') setVisitorIp(data.ip)
      })
      .catch(() => {
        // Decoration. A failure here must never be visible — the header just keeps its
        // ordinary title.
      })
  }, [open])

  // Focus the input on open. The panel animates in over 200ms and is `inert` until `open`
  // flips, so this runs on the same commit that clears inert — by the time the browser
  // processes the focus call the element is focusable.
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Keep the newest turn in view. Depends on `pending` too, so the thinking cursor
  // scrolls into view the moment it appears rather than after the answer lands.
  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages, pending])

  const send = useCallback(
    async (text: string) => {
      if (pending || blocked) return
      // Collapsed here as well as on the server so the visitor's own bubble renders
      // exactly the string the server was given — otherwise a pasted multi-line question
      // displays with its line breaks while the transcript sent onward has none.
      const content = text.replace(/\s+/g, ' ').trim()
      if (!content) return

      const next: ChatMessage[] = [...messages, { role: 'user', content }]
      setMessages(next)
      setPending(true)
      setError(null)

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          // Trimmed from the END, so the slice always still ends on the question being
          // asked — the server rejects a transcript that does not.
          body: JSON.stringify({ messages: next.slice(-MAX_HISTORY_MESSAGES) }),
        })
        const data = (await res.json()) as { reply?: string; error?: string; blocked?: boolean }

        if (res.ok && typeof data.reply === 'string') {
          setMessages((m) => [...m, { role: 'assistant', content: data.reply as string }])
          // Set AFTER the reply is appended, so the refusal is on screen explaining the
          // lock before the composer goes dead.
          if (data.blocked) setBlocked(true)
        } else {
          // A 4xx carries a message the visitor can act on ("keep it under 1000
          // characters"). Anything else is ours, not theirs, so it stays generic.
          setError(data.error ?? 'Something went wrong. Please try again.')
        }
      } catch {
        setError('Could not reach the server. Please check your connection and try again.')
      } finally {
        setPending(false)
      }
    },
    // `setMessages` comes from a custom hook rather than a bare `useState`, so the lint
    // rule cannot see that it is the stable setter it is. Listing it costs nothing.
    [messages, pending, blocked, setMessages]
  )

  return (
    <>
      <ChatPanel
        open={open}
        messages={messages}
        pending={pending}
        error={error}
        onClose={close}
        onSend={send}
        onReset={reset}
        visitorIp={visitorIp}
        blocked={blocked}
        listRef={listRef}
        inputRef={inputRef}
      />
      <ChatLauncher ref={launcherRef} open={open} onClick={() => (open ? close() : setOpen(true))} />
    </>
  )
}
