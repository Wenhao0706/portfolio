'use client'

import { useState, type FormEvent, type KeyboardEvent, type RefObject } from 'react'
import BotAvatar from './BotAvatar'
import ChatMessage from './ChatMessage'
import { MESSAGE_MAX_LENGTH, type ChatMessage as Message } from '@/lib/chat/validate'
import { FOCUS_RING, RAISED_SURFACE } from '@/lib/ui'

/**
 * Openers offered on the empty state. Recruiters arrive without a question ready, and a
 * blank prompt gets closed rather than typed into. Phrased as the visitor would ask, not
 * as menu items.
 */
const SUGGESTIONS = [
  'What has he actually built?',
  'What is he strongest at?',
  'Is he looking for work?',
]

/**
 * The title bar's controls ("New chat" and the close X). Muted at rest so neither competes
 * with the conversation, warming to the accent on hover — they must look like one pair,
 * which is exactly what two hand-maintained copies of this string stop guaranteeing.
 * Callers add their own padding.
 */
const TITLE_BAR_CONTROL = `rounded-[3px] text-[#7A7568] dark:text-[#8A9099] transition-colors cursor-pointer hover:text-[#B5772E] dark:hover:text-[#D9A441] ${FOCUS_RING}`

/**
 * Anchored at `bottom-8 right-8`, overlapping where the launcher sits. That is deliberate
 * now that the launcher fades and shrinks away on open: the panel scales out of the same
 * corner (`origin-bottom-right`), so the two read as one object transforming rather than a
 * panel appearing next to a button. It is the reason there is only one close control.
 */
type ChatPanelProps = {
  open: boolean
  messages: Message[]
  pending: boolean
  error: string | null
  onClose: () => void
  onSend: (text: string) => void
  onReset: () => void
  /** The visitor's own address. `null` until fetched, and on any failure. */
  visitorIp: string | null
  /** Rate limited. Locks the composer; see ChatWidget for why it is UX, not security. */
  blocked: boolean
  listRef: RefObject<HTMLDivElement | null>
  inputRef: RefObject<HTMLTextAreaElement | null>
}

export default function ChatPanel({
  open,
  messages,
  pending,
  error,
  onClose,
  onSend,
  onReset,
  visitorIp,
  blocked,
  listRef,
  inputRef,
}: ChatPanelProps) {
  const [draft, setDraft] = useState('')

  function submit() {
    if (pending || blocked) return
    const text = draft.trim()
    if (!text) return
    onSend(text)
    setDraft('')
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    submit()
  }

  // Enter sends, Shift+Enter is a newline. A chat input where Enter inserts a line break
  // is the single most common complaint about widgets like this.
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <div
      // The closed state is the MARKUP baseline, not something an effect applies after
      // mount — otherwise the panel paints open on every page load and then vanishes.
      // See AGENTS.md on hidden state living in the markup.
      className={`fixed bottom-8 right-8 z-50 flex w-[min(27rem,calc(100vw-2.5rem))] max-h-[min(34rem,calc(100vh-7rem))] origin-bottom-right flex-col overflow-hidden rounded-[5px] ${RAISED_SURFACE} shadow-[0_12px_40px_-12px_rgba(43,42,38,0.45)] transition-[opacity,transform] duration-200 ease-out ${
        open ? 'opacity-100 translate-y-0 scale-100' : 'pointer-events-none opacity-0 translate-y-2 scale-95'
      }`}
      // `inert` takes the whole subtree out of the tab order and the accessibility tree
      // while closed. Without it the input and every suggestion stay keyboard-reachable
      // behind an invisible panel.
      inert={!open}
      role="dialog"
      aria-label="Ask about Man Hou"
    >
      {/* Title bar, styled as an editor tab to match the site's IDE chrome. */}
      <div className="flex items-center gap-2 border-b border-[#DFD7C8] dark:border-[#2A2F38] px-4 py-2.5">
        <BotAvatar className="h-[18px] w-[18px] shrink-0 text-[#B5772E] dark:text-[#D9A441]" />
        {/* Rendered as a shell prompt (`you@<host>`) rather than a bare address, so it
            reads as part of the terminal the panel is dressed as instead of looking like a
            stray debug value. Falls back to the plain title until the fetch lands, and
            stays there for good if it fails — a header that flashes an error is worse than
            one that never had the joke in it. */}
        <span className="truncate font-mono text-sm text-[#2B2A26] dark:text-[#EDEFF2]">
          {visitorIp ? (
            <>
              <span className="text-[#7A7568] dark:text-[#8A9099]">you@</span>
              {visitorIp}
            </>
          ) : (
            'ask-about-manhou'
          )}
        </span>

        {/* Only shown once there is something to clear. History survives page loads now,
            so without this a visitor has no way to get rid of an old conversation. */}
        {messages.length > 0 && (
          <button
            type="button"
            onClick={onReset}
            className={`ml-auto px-1.5 py-1 font-mono text-xs ${TITLE_BAR_CONTROL}`}
          >
            New chat
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          aria-label="Close the chat"
          className={`ml-auto p-1 ${TITLE_BAR_CONTROL}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {/* Transcript. Oldest at the top, newest at the bottom, scrolled by ChatWidget. */}
      <div ref={listRef} className="chat-scroll flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <BotAvatar className="mt-[3px] h-[18px] w-[18px] shrink-0 text-[#B5772E] dark:text-[#D9A441]" />
              <p className="font-mono text-sm leading-relaxed text-[#2B2A26] dark:text-[#EDEFF2]">
                Hi. Ask me anything about Man Hou&apos;s work, and I&apos;ll answer from what he&apos;s
                told me.
              </p>
            </div>
            {/* Not sent to the server until clicked, so an unopened chat costs no quota. */}
            <div className="flex flex-wrap gap-1.5 pl-[26px]">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSend(s)}
                  className={`rounded-[5px] border border-[#DFD7C8] dark:border-[#2A2F38] px-2 py-1 font-mono text-xs text-[#7A7568] dark:text-[#8A9099] transition-colors cursor-pointer hover:border-[#B5772E] hover:text-[#B5772E] dark:hover:border-[#D9A441] dark:hover:text-[#D9A441] ${FOCUS_RING}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => <ChatMessage key={i} message={m} />)
        )}

        {pending && (
          <div className="flex items-center gap-2">
            <BotAvatar className="h-[18px] w-[18px] shrink-0 text-[#B5772E] dark:text-[#D9A441]" />
            {/* A blinking block cursor rather than three bouncing dots — this widget is
                dressed as a terminal, and the cursor is what a terminal does while busy. */}
            <span aria-hidden className="animate-pulse font-mono text-[13px] text-[#B5772E] dark:text-[#D9A441]">
              ▊
            </span>
            <span className="sr-only">Thinking</span>
          </div>
        )}

        {/* Transport-level failures only. Everything the gate chain decides — rate limits,
            the agent being offline — comes back as a normal reply above. */}
        {error && (
          <p role="status" className="font-mono text-[13px] leading-relaxed text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>

      {/* The prompt glyph goes red while locked, so the composer reads as dead at a glance
          rather than only revealing it when a keystroke does nothing. */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-[#DFD7C8] dark:border-[#2A2F38] px-4 py-2.5">
        <span
          aria-hidden
          className={`pb-1.5 font-mono text-[13px] ${
            blocked ? 'text-red-600 dark:text-red-400' : 'text-[#B5772E] dark:text-[#D9A441]'
          }`}
        >
          {blocked ? '✕' : '❯'}
        </span>
        <label htmlFor="chat-input" className="sr-only">
          Ask a question about Man Hou
        </label>
        <textarea
          id="chat-input"
          ref={inputRef}
          rows={1}
          value={draft}
          maxLength={MESSAGE_MAX_LENGTH}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={blocked}
          placeholder={blocked ? 'Rate limited — input locked' : 'Ask a question…'}
          className="max-h-24 flex-1 resize-none bg-transparent py-1 font-mono text-sm leading-relaxed text-[#2B2A26] dark:text-[#EDEFF2] placeholder:text-[#7A7568] dark:placeholder:text-[#8A9099] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={pending || blocked || !draft.trim()}
          aria-label="Send"
          className={`mb-0.5 rounded-[3px] p-1 text-[#B5772E] dark:text-[#D9A441] transition-opacity cursor-pointer disabled:cursor-not-allowed disabled:opacity-35 ${FOCUS_RING}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      </form>
    </div>
  )
}
