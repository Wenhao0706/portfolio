/**
 * Scroll-reveal registry for the single-page layout.
 *
 * Exported as DATA rather than built inline in the page effect so a test can
 * assert every selector matches a real node. Sections start at opacity-0 and are
 * only revealed once these triggers are built, so a selector that silently stops
 * matching leaves a BLANK PAGE, not merely an unanimated one.
 *
 * Adding a section means adding a row here, nothing else.
 */
export type RevealSection = {
  /** Section wrapper that triggers the reveal when it nears the viewport. */
  trigger: string
  /** Children tweened to opacity 1. Staggered in document order. */
  items: string
}

export const REVEAL_SECTIONS: RevealSection[] = [
  { trigger: '[data-reveal="about"]', items: '[data-reveal="about"] > *' },
  { trigger: '[data-reveal="tech"]', items: '[data-reveal="tech"] > *' },
  {
    trigger: '[data-reveal="projects"]',
    items: '[data-reveal="projects-heading"], [data-reveal="project-card"]',
  },
  { trigger: '[data-reveal="contact"]', items: '[data-reveal="contact"] > *' },
  // Transitional: the old closing section is replaced by Contact in Task 6.
  // Kept here so it keeps revealing while the new sections are being built.
  { trigger: '[data-reveal="closing"]', items: '[data-reveal="closing"] > *' },
]
