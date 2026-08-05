'use client'

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import type { ChatMessage } from '@/lib/chat/validate'

/**
 * The transcript, mirrored into the visitor's OWN browser via localStorage.
 *
 * That needs no database and no cache server, because the data never leaves their machine
 * — which is also why it is per-browser rather than per-person, and why clearing site data
 * wipes it. Split out of ChatWidget so the widget only deals in conversation, and the two
 * effects that make persistence safe stay next to each other and next to the reasons why.
 */

const STORAGE_KEY = 'manhou-chat-history'

/**
 * Slightly more than the server's `MAX_HISTORY_MESSAGES` so a returning visitor still sees
 * the tail of the last conversation above what actually gets sent. Also the cap on how
 * much of a stranger's localStorage this is entitled to occupy.
 */
const STORED_MAX_MESSAGES = 20

function isStoredMessage(value: unknown): value is ChatMessage {
  if (typeof value !== 'object' || value === null) return false
  const { role, content } = value as { role?: unknown; content?: unknown }
  return (role === 'user' || role === 'assistant') && typeof content === 'string'
}

export function useChatHistory(): [ChatMessage[], Dispatch<SetStateAction<ChatMessage[]>>] {
  const [messages, setMessages] = useState<ChatMessage[]>([])

  /**
   * Gates the SAVE effect until the LOAD effect has run. Without it, the save fires on
   * mount with `messages` still `[]` and wipes the stored history before it is read back.
   * State rather than a ref on purpose: a ref would not re-render, so the save effect
   * would never re-run to write the restored messages.
   */
  const [hydrated, setHydrated] = useState(false)

  /**
   * Restore once on mount, never during render. Reading localStorage in the initial
   * `useState` would make the client's first render differ from the server's (which has no
   * localStorage at all) and trip a hydration mismatch. The panel starts closed, so
   * restoring one paint later is invisible.
   *
   * Every entry is re-validated: this is data a visitor can hand-edit in devtools, and a
   * malformed one would otherwise crash the render for them with no way back.
   */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          const restored = parsed.filter(isStoredMessage).slice(-STORED_MAX_MESSAGES)
          // Syncing from an external store (localStorage) on mount is the case the rule's
          // own docs carve out. It cannot move into `useState`'s initialiser: the server
          // has no localStorage, so a client-only initial value would differ from the
          // server's markup and trip a hydration mismatch. Runs once, and the panel is
          // closed at that point, so nothing visibly re-renders.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          if (restored.length) setMessages(restored)
        }
      }
    } catch {
      // Private mode, a disabled-storage policy, or corrupt JSON. Starting a fresh
      // conversation is a perfectly good outcome, so this failure stays silent.
    }
    setHydrated(true)
  }, [])

  /**
   * The empty case REMOVES the key rather than storing `[]`.
   *
   * Not cosmetic: clearing the conversation empties `messages`, and this effect then
   * re-runs for the empty array. Had it written unconditionally it would put `[]` straight
   * back over what was just deleted, leaving a dead key in every visitor's browser forever
   * and making the delete look like it had failed.
   */
  useEffect(() => {
    if (!hydrated) return
    try {
      if (messages.length === 0) {
        window.localStorage.removeItem(STORAGE_KEY)
      } else {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(messages.slice(-STORED_MAX_MESSAGES))
        )
      }
    } catch {
      // Safari private mode throws on every write once the quota is zero. Losing the
      // history is not worth breaking the conversation in progress over.
    }
  }, [messages, hydrated])

  return [messages, setMessages]
}
