'use client'

import { forwardRef, useEffect, useState } from 'react'
import BotAvatar from './BotAvatar'
import { FOCUS_RING, RAISED_SURFACE } from '@/lib/ui'

/**
 * The corner control that opens the panel.
 *
 * A circle, stacked above `ScrollToTop` as a column of round controls. Larger than that
 * button (64px against 48px) because it is the primary action of the pair and should be
 * the one the eye lands on first.
 *
 * It never turns into a close button. The panel already owns the only X, and the open
 * panel is anchored to this same corner scaling out of it, so the launcher fading away as
 * the panel grows reads as one object becoming another rather than two controls that do
 * the same job.
 *
 * `group` here is what drives the blink and antenna bob inside `BotAvatar`, on hover AND
 * on keyboard focus — a hover-only animation is a house rule violation (see AGENTS.md).
 * The idle float and ring come from `.chat-launcher` in globals.css.
 */

/**
 * How long before the "Ask me anything" nudge appears.
 *
 * Long enough that it does not compete with the page's own intro animation, short enough
 * that it still lands while a visitor is reading the first screen. A bot face alone says
 * "chat" to people who already know the convention; the words are for everyone else.
 */
const HINT_DELAY_MS = 2600

const ChatLauncher = forwardRef<HTMLButtonElement, { open: boolean; onClick: () => void }>(
  function ChatLauncher({ open, onClick }, ref) {
    const [hintShown, setHintShown] = useState(false)

    // Note the direction: the hint's HIDDEN state is the markup baseline and this effect
    // reveals it. Doing it the other way round would ship the nudge visible in the HTML
    // and blink it away on hydration, on every single page load. See AGENTS.md.
    useEffect(() => {
      const timer = setTimeout(() => setHintShown(true), HINT_DELAY_MS)
      return () => clearTimeout(timer)
    }, [])

    // Once the chat has been opened the nudge has done its job, and repeating it at
    // somebody who is already talking to the bot is nagging.
    const showHint = hintShown && !open

    return (
      <>
        <span
          aria-hidden
          className={`pointer-events-none fixed bottom-[6.25rem] right-[6.5rem] z-50 whitespace-nowrap rounded-[5px] ${RAISED_SURFACE} px-2.5 py-1.5 font-mono text-xs text-[#7A7568] dark:text-[#8A9099] shadow-[0_4px_16px_-4px_rgba(43,42,38,0.25)] transition-[opacity,transform] duration-300 ease-out ${
            showHint ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'
          }`}
        >
          Ask me anything
        </span>

        <button
          ref={ref}
          type="button"
          onClick={onClick}
          aria-expanded={open}
          aria-label="Ask about Man Hou"
          // Hidden rather than unmounted while open, for two reasons: the fade is what
          // sells the launcher becoming the panel, and ChatWidget focuses this element
          // when the panel closes, which needs it to still be in the document.
          //
          // `chat-launcher` (the float and ring) is dropped while open — that motion is an
          // invitation, and an open panel has already accepted it.
          aria-hidden={open}
          tabIndex={open ? -1 : 0}
          className={`group fixed bottom-20 right-8 z-50 flex h-16 w-16 items-center justify-center rounded-full ${RAISED_SURFACE} text-[#B5772E] dark:text-[#D9A441] shadow-[0_6px_20px_-6px_rgba(43,42,38,0.35)] transition-[opacity,transform,color,border-color] duration-200 cursor-pointer hover:border-[#B5772E] dark:hover:border-[#D9A441] ${FOCUS_RING} ${
            open ? 'pointer-events-none scale-75 opacity-0' : 'chat-launcher scale-100 opacity-100'
          }`}
        >
          <BotAvatar blink className="h-9 w-9" />
        </button>
      </>
    )
  }
)

export default ChatLauncher
