import Link from 'next/link'
import { PROJECTS } from '@/lib/projects'
import { PAGE_HEADING, PAGE_MAIN, SURFACE_INTERACTIVE } from '@/lib/ui'

export default function ProjectsPage() {
  return (
    <main className={PAGE_MAIN}>
      <h1 className={PAGE_HEADING}>Projects</h1>
      <p className="mt-3 text-[#7A7568] dark:text-[#8A9099]">
        A few things I&apos;ve built, and what I actually did on each one.
      </p>

      <div className="mt-10 space-y-8">
        {PROJECTS.map((project) => (
          <Link
            key={project.slug}
            href={`/projects/${project.slug}`}
            className={`block rounded-[7px] p-6 ${SURFACE_INTERACTIVE}`}
          >
            <h2 className="font-mono text-lg font-semibold text-[#2B2A26] dark:text-[#EDEFF2]">
              {project.title}
            </h2>
            <p className="mt-2 text-[#7A7568] dark:text-[#8A9099]">{project.hook}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {project.stack.map((tech) => (
                <span
                  key={tech}
                  className="font-mono text-xs text-[#7A7568] dark:text-[#8A9099] border border-[#D8D3C6] dark:border-[#2A2F38] rounded-[4px] px-2 py-1"
                >
                  {tech}
                </span>
              ))}
            </div>
            <p className="mt-4 font-mono text-xs text-[#B5772E] dark:text-[#D9A441]">
              View project →
            </p>
          </Link>
        ))}
      </div>
    </main>
  )
}
