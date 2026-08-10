/**
 * Scroll-reveal registry for the single-page layout.
 *
 * Exported as DATA rather than built inline in the page effect so a test can
 * assert every selector matches a real node. Sections start at opacity-0 and are
 * only revealed once these triggers are built, so a selector that silently stops
 * matching leaves a BLANK PAGE, not merely an unanimated one.
 *
 * Adding a section means adding its name below, nothing else.
 */
export type RevealSection = {
  /** Section wrapper that triggers the reveal when it nears the viewport. */
  trigger: string
  /** Children tweened to opacity 1. Staggered in document order. */
  items: string
}

/**
 * Derived from the name rather than written out twice, because the two selectors
 * have to name the SAME section. A hand-typed pair that disagrees still passes a
 * shape check and simply never reveals its section.
 */
const revealSection = (name: string): RevealSection => ({
  trigger: `[data-reveal="${name}"]`,
  items: `[data-reveal="${name}"] > *`,
})

export const REVEAL_SECTIONS: RevealSection[] = ['about', 'tech', 'contact'].map(revealSection)

/**
 * The projects showpiece. Kept separate from REVEAL_SECTIONS because it runs a
 * three-stage timeline rather than one staggered tween, and two tweens fighting
 * over the same nodes produces a half-revealed card.
 *
 * Selectors are exported so the integrity test can assert they still match. The
 * blank-card failure mode is identical to the one REVEAL_SECTIONS guards.
 */
export const PROJECTS_REVEAL = {
  trigger: '[data-reveal="projects"]',
  heading: '[data-reveal="projects-heading"]',
  card: '[data-reveal="project-card"]',
  body: '[data-reveal="project-body"]',
  chip: '[data-reveal="project-chip"]',
} as const

/** gsap is injected so this module stays importable from a test without GSAP. */
export function buildProjectsReveal(
  root: HTMLElement,
  gsapInstance: typeof import('gsap').default,
  start: string
) {
  const trigger = root.querySelector(PROJECTS_REVEAL.trigger)
  const cards = root.querySelectorAll(PROJECTS_REVEAL.card)
  if (!trigger || !cards.length) return

  const tl = gsapInstance.timeline({
    scrollTrigger: { trigger, start, once: true },
  })

  tl.to(root.querySelectorAll(PROJECTS_REVEAL.heading), {
    opacity: 1,
    y: 0,
    duration: 0.4,
    ease: 'power2.out',
  })
    /* Stage 1: the listing lands, still compact. */
    .to(
      cards,
      { opacity: 1, y: 0, duration: 0.45, stagger: 0.12, ease: 'power2.out' },
      '-=0.1'
    )
    /* Stage 2: each card expands into its description. */
    .to(
      root.querySelectorAll(PROJECTS_REVEAL.body),
      { opacity: 1, height: 'auto', duration: 0.4, stagger: 0.12, ease: 'power2.out' },
      '-=0.2'
    )
    /* Stage 3: chips tick in like output. Fast and tight, so it reads as a
       terminal printing rather than as another fade. */
    .to(
      root.querySelectorAll(PROJECTS_REVEAL.chip),
      { opacity: 1, y: 0, duration: 0.2, stagger: 0.03, ease: 'power2.out' },
      '-=0.15'
    )
}
