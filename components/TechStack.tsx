'use client'

/**
 * Home-page tech stack: category tabs switching a card grid.
 *
 * The data lives in lib/tech.ts because the terminal's `skills` command renders
 * the same list; a second copy is a stack that drifts between two surfaces.
 *
 * The panel wrapper is a PERSISTENT DOM node whose contents swap on tab change,
 * not a node that unmounts per tab. The home page's GSAP intro tweens
 * `[data-reveal="tech"] > *` to opacity 1 via inline styles; a wrapper that
 * remounted would come back without them and render invisible.
 */

import { useRef, useState } from 'react'
import { TerminalHeading } from '@/components/TerminalHeading'
import { TECH_GROUPS, type Tech } from '@/lib/tech'
import { FOCUS_RING, SECTION_HEADING, SURFACE, SURFACE_INTERACTIVE } from '@/lib/ui'

function TechCard({ label, icon, darkHex, glyph, index }: Tech & { index: number }) {
  return (
    <li
      /* `terminal-print` + a per-row delay, so switching tabs reads as the next
         category being printed rather than as a hard cut. The <ul> remounts on
         tab change (it is keyed by group id), which is what replays this. */
      className={`terminal-print flex flex-col items-center justify-center gap-3 rounded-[7px] px-3 py-6 ${SURFACE_INTERACTIVE}`}
      style={{ animationDelay: `${index * 45}ms` }}
    >
      {icon ? (
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="h-9 w-9 shrink-0 fill-[var(--brand)] dark:fill-[var(--brand-dark)]"
          style={
            {
              '--brand': `#${icon.hex}`,
              '--brand-dark': darkHex ?? `#${icon.hex}`,
            } as React.CSSProperties
          }
        >
          <path d={icon.path} />
        </svg>
      ) : (
        <span
          aria-hidden
          className="flex h-9 items-center font-mono text-3xl font-bold text-[#68217A] dark:text-[#C58BD9]"
        >
          {glyph}
        </span>
      )}
      <span className="font-mono text-xs text-center text-[#2B2A26] dark:text-[#EDEFF2]">
        {label}
      </span>
    </li>
  )
}

export default function TechStack() {
  const [active, setActive] = useState(0)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  /* Roving focus: a tablist should move between tabs with the arrow keys rather
     than requiring a Tab press per tab. */
  function onKeyDown(e: React.KeyboardEvent) {
    const last = TECH_GROUPS.length - 1
    let next: number | null = null

    if (e.key === 'ArrowRight') next = active === last ? 0 : active + 1
    else if (e.key === 'ArrowLeft') next = active === 0 ? last : active - 1
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = last

    if (next !== null) {
      e.preventDefault()
      setActive(next)
      tabRefs.current[next]?.focus()
    }
  }

  const group = TECH_GROUPS[active]

  return (
    /* Natural height with a little extra breathing room, not a full viewport —
       min-h-screen left a large dead gap on the shorter tabs. `id` + `scroll-mt`
       still give ScrollTrigger a clean section boundary to key off; it does not
       need the section to be viewport-tall. */
    <section id="tech" data-reveal="tech" className="mt-20 scroll-mt-24 py-6">
      <TerminalHeading className={`${SECTION_HEADING} opacity-0 translate-y-2`}>
        What I work with
      </TerminalHeading>

      <div
        role="tablist"
        aria-label="Tech stack categories"
        onKeyDown={onKeyDown}
        className={`mt-6 inline-flex flex-wrap gap-1 rounded-[7px] p-1 opacity-0 translate-y-2 ${SURFACE}`}
      >
        {TECH_GROUPS.map((g, i) => {
          const selected = i === active
          return (
            <button
              key={g.id}
              ref={(el) => {
                tabRefs.current[i] = el
              }}
              role="tab"
              id={`tech-tab-${g.id}`}
              aria-selected={selected}
              aria-controls={`tech-panel-${g.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(i)}
              className={`rounded-[5px] px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer ${FOCUS_RING} ${
                selected
                  ? 'bg-[#B5772E] dark:bg-[#D9A441] text-[#F1EBE0] dark:text-[#14171C]'
                  : 'text-[#7A7568] dark:text-[#8A9099] hover:text-[#B5772E] dark:hover:text-[#D9A441]'
              }`}
            >
              {g.title}
            </button>
          )
        })}
      </div>

      <div className="mt-4 opacity-0 translate-y-2">
        <ul
          key={group.id}
          role="tabpanel"
          id={`tech-panel-${group.id}`}
          aria-labelledby={`tech-tab-${group.id}`}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        >
          {group.items.map((tech, i) => (
            <TechCard key={tech.label} {...tech} index={i} />
          ))}
        </ul>
      </div>
    </section>
  )
}
