'use client'

import { useEffect, useState } from 'react'
import { NAV_SECTIONS } from '@/lib/sections'

/**
 * Which section currently owns the screen, or null before any of them do.
 *
 * Shared by the desktop tabs and the mobile menu. Two observers watching the same
 * sections would be two chances to disagree about where the reader is, and the
 * mobile menu marking a different tab than the header is the kind of bug that
 * only shows up on a phone.
 */
export function useActiveSection() {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    const sections = NAV_SECTIONS.map((tab) => document.getElementById(tab.id)).filter(
      (el): el is HTMLElement => el !== null
    )
    if (!sections.length || typeof IntersectionObserver === 'undefined') return

    /* Bottom margin pulls the detection band up to the top third of the viewport,
       so a section counts as active once it OWNS the screen, not the instant its
       first pixel appears. Without it, two adjacent sections both qualify while
       scrolling and the tab flickers between them. */
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)
        if (!visible.length) return
        const top = visible.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b
        )
        setActiveId(top.target.id)
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  return activeId
}
