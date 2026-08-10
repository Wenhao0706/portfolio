/**
 * The tech stack, shared by the TechStack tab panel and the terminal's `skills`.
 *
 * Every entry is drawn from a real project's `stack` in lib/projects.ts, plus the
 * four this site is built with. Deliberately no proficiency bars or star ratings,
 * which the portfolio guide this site follows treats as an antipattern.
 *
 * Icon path data comes from `simple-icons` (CC0). Two things it does NOT give us:
 *
 *  1. `darkHex`. Several brand colours are essentially black (Next.js #000000,
 *     Angular #0F0F11) or very dark (Pusher #300D4F, .NET #512BD4). Painted at
 *     their real value they vanish against the dark theme, so those entries carry
 *     an explicit dark-mode substitute. Everything else uses one colour in both.
 *
 *  2. An icon for C#. Simple Icons carries none, and the nearest name match
 *     (`siSharp`) is the electronics company. `glyph` renders the text instead.
 */
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

type Icon = { title: string; hex: string; path: string }

export type Tech = {
  label: string
  icon?: Icon
  /** Fallback when the brand colour is too dark to read on the dark theme. */
  darkHex?: string
  /** Used only when no icon exists. */
  glyph?: string
}

export type TechGroup = { id: string; title: string; items: Tech[] }

export const TECH_GROUPS: TechGroup[] = [
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
