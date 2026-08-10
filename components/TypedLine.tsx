'use client'

import { useEffect, useRef, useState } from 'react'

/** Per character. Slow enough to read as typing, not as a paste. */
const CHAR_MS = 55

/**
 * A line that types itself the first time it is scrolled to.
 *
 * Distinct from TerminalHeading's decode on purpose. A heading RESOLVES, because
 * it is a label that already exists; a command is TYPED, because someone is
 * entering it. Using the same effect for both would flatten that difference.
 *
 * Same two-span split as TerminalHeading: the real text sits in an `sr-only` span
 * so the accessible content is complete and stable from first paint, while the
 * visible span fills in. A screen reader should not receive a line one character
 * at a time.
 *
 * NO prefers-reduced-motion guard, per the site-wide rule in AGENTS.md.
 */
export function TypedLine({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState(text.length)
  const [typing, setTyping] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return

    let timer = 0
    let done = false

    const observer = new IntersectionObserver(
      (entries) => {
        if (done || !entries.some((entry) => entry.isIntersecting)) return
        done = true
        observer.disconnect()

        setShown(0)
        setTyping(true)
        let i = 0
        timer = window.setInterval(() => {
          i += 1
          setShown(i)
          if (i >= text.length) {
            window.clearInterval(timer)
            setTyping(false)
          }
        }, CHAR_MS)
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0 }
    )

    observer.observe(el)
    return () => {
      observer.disconnect()
      window.clearInterval(timer)
    }
  }, [text])

  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>{text.slice(0, shown)}</span>
      <span
        aria-hidden
        className={`ml-0.5 inline-block h-[0.9em] w-[0.45em] translate-y-[0.1em] bg-[#B5772E] dark:bg-[#D9A441] ${
          typing ? 'terminal-caret' : 'opacity-0'
        }`}
      />
    </span>
  )
}
