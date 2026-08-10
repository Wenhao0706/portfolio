import { siGithub } from 'simple-icons'
import { PROJECTS } from '@/lib/projects'
import { FOCUS_RING, SECTION_HEADING, SURFACE_INTERACTIVE } from '@/lib/ui'

export function Projects() {
  return (
    <section id="projects" data-reveal="projects" className="mt-20 scroll-mt-24">
      <h2
        data-reveal="projects-heading"
        className={`${SECTION_HEADING} opacity-0 translate-y-2`}
      >
        Some things I&apos;ve built
      </h2>

      <div className="mt-6 flex flex-col gap-4">
        {PROJECTS.map((project) => (
          <article
            key={project.slug}
            data-reveal="project-card"
            className={`rounded-[7px] p-5 opacity-0 translate-y-2 ${SURFACE_INTERACTIVE}`}
          >
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
                    className="translate-y-1 rounded-[4px] border border-[#DFD7C8] px-2 py-1 font-mono text-[11px] text-[#7A7568] opacity-0 dark:border-[#2A2F38] dark:text-[#8A9099]"
                  >
                    {tech}
                  </li>
                ))}
              </ul>

              {/* Rendered only when a repo actually exists. FYP lights up on its own
                  the day its repoUrl is added, with no code change here. */}
              {project.repoUrl && (
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-4 inline-flex items-center gap-2 font-mono text-xs text-[#B5772E] transition-colors hover:underline focus-visible:underline dark:text-[#D9A441] ${FOCUS_RING}`}
                >
                  <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-current">
                    <path d={siGithub.path} />
                  </svg>
                  View on GitHub
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
