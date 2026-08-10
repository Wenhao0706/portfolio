'use client'

import { useEffect, useState } from 'react'

const TABS = [
  { id: 'about', label: 'About' },
  { id: 'projects', label: 'Projects' },
  { id: 'contact', label: 'Contact' },
] as const

export function NavTabs() {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    const sections = TABS.map((tab) => document.getElementById(tab.id)).filter(
      (el): el is HTMLElement => el !== null
    )
    if (!sections.length) return

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

  return (
    <nav className="flex items-stretch">
      {TABS.map((tab) => {
        const isActive = activeId === tab.id
        return (
          <a
            key={tab.id}
            href={`#${tab.id}`}
            aria-current={isActive ? 'true' : undefined}
            className={`group font-mono text-sm px-[18px] py-4 border-b-2 outline-none focus-visible:ring-2 focus-visible:ring-[#B5772E] dark:focus-visible:ring-[#D9A441] ${
              isActive
                ? 'text-[#2B2A26] border-[#B5772E] dark:text-[#EDEFF2] dark:border-[#D9A441]'
                : 'border-transparent'
            }`}
          >
            {tab.label.split('').map((char, i) => (
              <span
                key={i}
                className={`inline-block transition-colors duration-150 ${
                  isActive
                    ? ''
                    : 'text-[#7A7568] group-hover:text-[#2B2A26] group-focus-visible:text-[#2B2A26] dark:text-[#8A9099] dark:group-hover:text-[#EDEFF2] dark:group-focus-visible:text-[#EDEFF2]'
                }`}
                style={{ transitionDelay: `${i * 20}ms` }}
              >
                {char}
              </span>
            ))}
          </a>
        )
      })}
    </nav>
  )
}
