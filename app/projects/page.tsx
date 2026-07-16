import Link from 'next/link'
import { PROJECTS } from '@/lib/projects'

export default function ProjectsPage() {
  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-[18px] py-16 sm:py-24">
      <h1 className="font-mono text-2xl font-bold text-[#2B2A26] dark:text-[#EDEFF2]">
        Projects
      </h1>
      <p className="mt-3 text-[#7A7568] dark:text-[#8A9099]">
        [Short intro line — e.g. "A few things I've built, and what I actually did on each."]
      </p>

      <div className="mt-10 space-y-8">
        {PROJECTS.map((project) => (
          <Link
            key={project.slug}
            href={`/projects/${project.slug}`}
            className="block rounded-[7px] border border-[#D8D3C6] dark:border-[#2A2F38] p-6 hover:border-[#B5772E] dark:hover:border-[#D9A441] transition-colors"
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
