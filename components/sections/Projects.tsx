'use client'

import { useRef } from 'react'
import { siGithub } from 'simple-icons'
import { TerminalHeading } from '@/components/TerminalHeading'
import type { Project } from '@/lib/projects'
import { PROJECTS } from '@/lib/projects'
import { FOCUS_RING, SECTION_HEADING, SURFACE_INTERACTIVE } from '@/lib/ui'

/**
 * The card's outward link treatment, worn by both the site list and the repo link
 * under it — same accent, same underline-on-hover, same focus ring. Callers add
 * their own spacing and the alignment their content needs (a bare label sits on the
 * baseline; a label beside an icon centres).
 */
const externalLinkClass = `inline-flex font-mono text-xs text-[#B5772E] transition-colors hover:underline focus-visible:underline dark:text-[#D9A441] ${FOCUS_RING}`

/**
 * One project card.
 *
 * Client-side only because of the pointer tracking. Everything the card renders
 * is static data, so this costs a component boundary and no fetching.
 *
 * The glow follows the cursor by writing --px/--py straight to the node's inline
 * style rather than going through React state. A pointermove setState would
 * re-render the card on every frame of every hover; the CSS custom property is
 * read by the compositor and never touches the tree.
 */
function ProjectCard({ project }: { project: Project }) {
  const ref = useRef<HTMLElement>(null)

  const trackPointer = (event: React.PointerEvent<HTMLElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--px', `${event.clientX - rect.left}px`)
    el.style.setProperty('--py', `${event.clientY - rect.top}px`)
  }

  /* A keyboard user has no coordinates, so the glow must not stay parked wherever
     the last mouse happened to leave it. Clearing the properties drops both back
     to the 50% fallback in globals.css and lights the card evenly. */
  const clearPointer = () => {
    const el = ref.current
    if (!el) return
    el.style.removeProperty('--px')
    el.style.removeProperty('--py')
  }

  return (
    <article
      ref={ref}
      data-reveal="project-card"
      onPointerMove={trackPointer}
      onPointerLeave={clearPointer}
      onFocus={clearPointer}
      className={`group relative overflow-hidden rounded-[7px] p-5 opacity-0 translate-y-2 ${SURFACE_INTERACTIVE}`}
    >
      <div
        aria-hidden
        className="project-glow pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
      />

      {/* Every child sits above the glow layer. */}
      <div className="relative">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <span
            aria-hidden
            className="font-mono text-xs text-[#B5772E] dark:text-[#D9A441]"
          >
            $
          </span>
          <h3 className="font-mono font-semibold text-[#2B2A26] dark:text-[#EDEFF2]">
            {project.title}
          </h3>
          {/* Caret parked beside the title, blinking only while the card is
              pointed at or tabbed into, so the card reads as the live line. */}
          <span
            aria-hidden
            className="ml-auto hidden h-[0.9em] w-[0.45em] bg-[#B5772E] opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 sm:inline-block dark:bg-[#D9A441]"
          />
        </div>

        <div data-reveal="project-body" className="h-0 overflow-hidden opacity-0">
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#7A7568] dark:text-[#8A9099]">
            {project.description}
          </p>

          <ul className="mt-4 flex flex-wrap gap-2">
            {project.stack.map((tech) => (
              <li
                key={tech}
                data-reveal="project-chip"
                className="translate-y-1 rounded-[4px] border border-[#DFD7C8] px-2 py-1 font-mono text-[11px] text-[#7A7568] opacity-0 transition-colors group-hover:border-[#B5772E]/40 dark:border-[#2A2F38] dark:text-[#8A9099] dark:group-hover:border-[#D9A441]/40"
              >
                {tech}
              </li>
            ))}
          </ul>

          {/* The one card with live work to show. Labelled, because five bare links
              under a paragraph read as a footer; the label is what tells a recruiter
              these are builds rather than references. */}
          {project.sites && (
            <div className="mt-4">
              <p className="font-mono text-[11px] text-[#7A7568] dark:text-[#8A9099]">
                Built from scratch, sole developer
              </p>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {project.sites.map((site) => (
                  <li key={site.href}>
                    <a
                      href={site.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${externalLinkClass} items-baseline gap-1`}
                    >
                      {site.label}
                      <span aria-hidden>&#8599;</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Rendered only when a repo actually exists. FYP lights up on its own
              the day its repoUrl is added, with no code change here. */}
          {project.repoUrl && (
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-4 ${externalLinkClass} items-center gap-2`}
            >
              <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-current">
                <path d={siGithub.path} />
              </svg>
              View on GitHub
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

export function Projects() {
  return (
    <section id="projects" data-reveal="projects" className="mt-20 scroll-mt-24">
      <TerminalHeading
        data-reveal="projects-heading"
        className={`${SECTION_HEADING} opacity-0 translate-y-2`}
      >
        Some things I&apos;ve built
      </TerminalHeading>

      <div className="mt-6 flex flex-col gap-4">
        {PROJECTS.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>
    </section>
  )
}
