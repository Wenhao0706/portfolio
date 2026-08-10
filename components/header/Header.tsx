'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatedName } from './AnimatedName'
import { MenuButton, MobileNav } from './MobileNav'
import { NavTabs } from './NavTabs'
import { ResumeDownload } from './ResumeDownload'
import { ThemeToggle } from './ThemeToggle'
import { useActiveSection } from './useActiveSection'

/** Tailwind's `md`. The one place the breakpoint is written as a number. */
const DESKTOP_QUERY = '(min-width: 768px)'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const activeId = useActiveSection()
  const buttonRef = useRef<HTMLButtonElement>(null)

  /* Escape closes and hands focus back to the button that opened it, otherwise
     focus is left orphaned inside a panel that is no longer on screen. */
  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      buttonRef.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  /* Crossing to desktop while the panel is open would leave it expanded under a
     nav bar that already shows every link. Rotating a phone is enough to hit it.

     This is a BREAKPOINT query, not the prefers-reduced-motion pattern AGENTS.md
     forbids. Guarded because jsdom does not implement matchMedia. */
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia(DESKTOP_QUERY)
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false)
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  /* `sticky top-0` rather than `fixed`: it pins from the very first pixel of
     scroll exactly like fixed, but keeps its space in the flow, so the page
     below needs no compensating padding and nothing hides under it. */
  return (
    <header className="sticky top-0 z-50 overflow-hidden rounded-b-lg border border-[#2A2F38] bg-[#F1EBE0] dark:bg-[#14171C]">
      {/* `min-w-0` on the name lets it shrink instead of forcing the row wider
          than the viewport. Without it the row has a fixed floor and the actions
          get pushed past the right edge on a narrow phone. */}
      <div className="flex items-center justify-between gap-2 px-[18px]">
        <div className="min-w-0">
          <AnimatedName />
        </div>

        <NavTabs />

        <div className="flex shrink-0 items-center gap-3">
          <ThemeToggle />
          <span className="hidden md:block">
            <ResumeDownload />
          </span>
          <MenuButton
            open={menuOpen}
            buttonRef={buttonRef}
            onClick={() => setMenuOpen((v) => !v)}
          />
        </div>
      </div>

      <MobileNav open={menuOpen} activeId={activeId} onNavigate={() => setMenuOpen(false)} />
    </header>
  )
}
