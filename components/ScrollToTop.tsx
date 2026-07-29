'use client'

/**
 * Fixed scroll-to-top control. Hidden while the page is at the very top and
 * fades in as soon as the reader scrolls at all.
 *
 * Kept mounted rather than conditionally rendered so the fade has something to
 * animate, and `pointer-events-none` while hidden so an invisible button can
 * never swallow a click.
 */

import { useEffect, useState } from 'react'

/** Small buffer so the button does not flicker on sub-pixel scroll jitter. */
const SHOW_AFTER = 8

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER)
    onScroll() // a reload can restore a mid-page scroll position
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`group fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-[#DFD7C8] dark:border-[#2A2F38] bg-[#F1EBE0] dark:bg-[#14171C] text-[#7A7568] dark:text-[#8A9099] shadow-[0_4px_16px_-4px_rgba(43,42,38,0.25)] transition-[opacity,transform,color,border-color] duration-200 cursor-pointer hover:border-[#B5772E] dark:hover:border-[#D9A441] hover:text-[#B5772E] dark:hover:text-[#D9A441] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B5772E] dark:focus-visible:outline-[#D9A441] ${
        visible ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5 group-focus-visible:-translate-y-0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 19V5" />
        <path d="M5 12l7-7 7 7" />
      </svg>
    </button>
  )
}
