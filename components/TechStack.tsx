'use client'

/**
 * Home-page tech stack: category tabs switching a card grid.
 *
 * Every entry is drawn from a real project's `stack` in lib/projects.ts, plus the
 * four this site is built with. Deliberately no proficiency bars or star ratings,
 * which the portfolio guide this site follows treats as an antipattern.
 *
 * Icon path data comes from `simple-icons` (CC0).
 *
 * Two things the icon data does NOT give us for free:
 *
 *  1. `darkHex`. Several brand colours are essentially black (Next.js #000000,
 *     Angular #0F0F11) or very dark (Pusher #300D4F, .NET #512BD4). Painted at
 *     their real value they vanish against the dark theme, so those entries carry
 *     an explicit dark-mode substitute. Everything else uses one colour in both.
 *
 *  2. An icon for C#. Simple Icons carries none, and the nearest name match
 *     (`siSharp`) is the electronics company. `glyph` renders the text instead.
 *
 * The panel wrapper is a PERSISTENT DOM node whose contents swap on tab change,
 * not a node that unmounts per tab. The home page's GSAP intro tweens
 * `[data-reveal="tech"] > *` to opacity 1 via inline styles; a wrapper that
 * remounted would come back without them and render invisible.
 */

import { useRef, useState } from 'react'
import {
  siAngular,
  siDocker,
  siDotnet,
  siFirebase,
  siFlutter,
  siLaravel,
  siNextdotjs,
  siNodedotjs,
  siPhp,
  siPusher,
  siReact,
  siStripe,
  siTailwindcss,
  siTypescript,
  siWordpress,
} from 'simple-icons'
import { SECTION_HEADING, SURFACE, SURFACE_INTERACTIVE } from '@/lib/ui'

type Icon = { title: string; hex: string; path: string }

type Tech = {
  label: string
  icon?: Icon
  /** Fallback when the brand colour is too dark to read on the dark theme. */
  darkHex?: string
  /** Used only when no icon exists. */
  glyph?: string
}

const GROUPS: { id: string; title: string; items: Tech[] }[] = [
  {
    id: 'languages',
    title: 'Languages',
    items: [
      { label: 'PHP', icon: siPhp },
      { label: 'C#', glyph: 'C#' },
      { label: 'TypeScript', icon: siTypescript },
    ],
  },
  {
    id: 'frontend',
    title: 'Frontend',
    items: [
      { label: 'React', icon: siReact },
      { label: 'Next.js', icon: siNextdotjs, darkHex: '#EDEFF2' },
      { label: 'Angular', icon: siAngular, darkHex: '#EDEFF2' },
      { label: 'Tailwind', icon: siTailwindcss },
      { label: 'Flutter', icon: siFlutter },
    ],
  },
  {
    id: 'backend',
    title: 'Backend & CMS',
    items: [
      { label: 'Node.js', icon: siNodedotjs },
      { label: 'Laravel', icon: siLaravel },
      { label: 'ASP.NET Core', icon: siDotnet, darkHex: '#8A7BF0' },
      { label: 'WordPress', icon: siWordpress },
    ],
  },
  {
    id: 'tools',
    title: 'Services & Tools',
    items: [
      { label: 'Firebase', icon: siFirebase },
      { label: 'Stripe', icon: siStripe },
      { label: 'Pusher', icon: siPusher, darkHex: '#B08BD1' },
      { label: 'Docker', icon: siDocker },
    ],
  },
]

function TechCard({ label, icon, darkHex, glyph }: Tech) {
  return (
    <li
      className={`flex flex-col items-center justify-center gap-3 rounded-[7px] px-3 py-6 ${SURFACE_INTERACTIVE}`}
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
    const last = GROUPS.length - 1
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

  const group = GROUPS[active]

  return (
    /* Natural height with a little extra breathing room, not a full viewport —
       min-h-screen left a large dead gap on the shorter tabs. `id` + `scroll-mt`
       still give ScrollTrigger a clean section boundary to key off; it does not
       need the section to be viewport-tall. */
    <section id="tech" data-reveal="tech" className="mt-20 scroll-mt-24 py-6">
      <h2 className={`${SECTION_HEADING} opacity-0 translate-y-2`}>What I work with</h2>

      <div
        role="tablist"
        aria-label="Tech stack categories"
        onKeyDown={onKeyDown}
        className={`mt-6 inline-flex flex-wrap gap-1 rounded-[7px] p-1 opacity-0 translate-y-2 ${SURFACE}`}
      >
        {GROUPS.map((g, i) => {
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
              className={`rounded-[5px] px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B5772E] dark:focus-visible:outline-[#D9A441] ${
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
          {group.items.map((tech) => (
            <TechCard key={tech.label} {...tech} />
          ))}
        </ul>
      </div>
    </section>
  )
}
