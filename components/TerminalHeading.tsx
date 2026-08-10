'use client'

import { useEffect, useRef, useState } from 'react'
import { scrambleFrame } from '@/lib/scramble'

/** Long enough to read as printing, short enough not to delay the section. */
const DECODE_MS = 620

type Props = {
  children: string
  className?: string
} & React.HTMLAttributes<HTMLHeadingElement>

/**
 * A section heading that resolves out of noise the first time it is scrolled to,
 * with a block cursor trailing the reveal head.
 *
 * TWO SPANS, deliberately. The real text lives in an `sr-only` span and never
 * changes, so the accessible name is stable for the whole animation; the glyphs
 * churn in an `aria-hidden` sibling. Scrambling the visible text directly would
 * make the heading announce noise to a screen reader, and would break every
 * `getByRole('heading', { name })` query in the suite the moment a test rendered
 * mid-flight.
 *
 * The scramble is armed only when the observer fires, never at mount. Until then
 * the visible span holds the real text, so the server render, the no-JS render
 * and any test render are all correct copy rather than a frozen field of noise.
 *
 * Runs on every visit rather than once per session. Unlike the intro terminal,
 * this is 600ms the reader chose by scrolling, not a gate in front of the page.
 *
 * NO prefers-reduced-motion guard, per the site-wide rule in AGENTS.md.
 */
export function TerminalHeading({ children, className = '', ...rest }: Props) {
  const ref = useRef<HTMLHeadingElement>(null)
  const [display, setDisplay] = useState(children)
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    const el = ref.current
    /* No observer means no decode, and the visible span keeps the real text it
       was rendered with. The heading degrades to plain copy rather than to noise. */
    if (!el || typeof IntersectionObserver === 'undefined') return

    let frame = 0
    let done = false

    const run = () => {
      const start = performance.now()
      setPrinting(true)

      const tick = (now: number) => {
        const progress = Math.min((now - start) / DECODE_MS, 1)
        setDisplay(scrambleFrame(children, progress))
        if (progress < 1) {
          frame = requestAnimationFrame(tick)
          return
        }
        setPrinting(false)
      }
      frame = requestAnimationFrame(tick)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (done || !entries.some((entry) => entry.isIntersecting)) return
        done = true
        observer.disconnect()
        run()
      },
      /* Matches the GSAP reveal's `top 85%` so the decode starts as the section
         fades in, and the two read as one motion instead of two. */
      { rootMargin: '0px 0px -15% 0px', threshold: 0 }
    )

    observer.observe(el)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [children])

  return (
    <h2 ref={ref} className={className} {...rest}>
      <span className="sr-only">{children}</span>
      <span aria-hidden>{display}</span>
      {/* Reserved with a fixed width so the cursor appearing and leaving never
          shifts the heading. Only its opacity changes. */}
      <span
        aria-hidden
        className={`ml-1 inline-block h-[0.85em] w-[0.45em] translate-y-[0.08em] bg-[#B5772E] align-baseline dark:bg-[#D9A441] ${
          printing ? 'terminal-caret' : 'opacity-0'
        }`}
      />
    </h2>
  )
}
