import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PROJECTS, getProjectBySlug } from '@/lib/projects'

export function generateStaticParams() {
  return PROJECTS.map((project) => ({ slug: project.slug }))
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const project = getProjectBySlug(slug)

  if (!project) {
    notFound()
  }

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-[18px] py-16 sm:py-24">
      <Link
        href="/projects"
        className="font-mono text-xs text-[#7A7568] dark:text-[#8A9099] hover:text-[#2B2A26] dark:hover:text-[#EDEFF2] transition-colors"
      >
        ← All projects
      </Link>

      <h1 className="mt-4 font-mono text-2xl font-bold text-[#2B2A26] dark:text-[#EDEFF2]">
        {project.title}
      </h1>
      <p className="mt-2 text-[#7A7568] dark:text-[#8A9099]">{project.hook}</p>

      <dl className="mt-6 grid grid-cols-2 gap-4 font-mono text-xs">
        <div>
          <dt className="text-[#7A7568] dark:text-[#8A9099]">Role</dt>
          <dd className="mt-1 text-[#2B2A26] dark:text-[#EDEFF2]">{project.role}</dd>
        </div>
        <div>
          <dt className="text-[#7A7568] dark:text-[#8A9099]">Stack</dt>
          <dd className="mt-1 text-[#2B2A26] dark:text-[#EDEFF2]">{project.stack.join(', ')}</dd>
        </div>
      </dl>

      <div className="mt-10 space-y-10 text-[#2B2A26] dark:text-[#EDEFF2] leading-relaxed">
        <section>
          <h2 className="font-mono text-sm text-[#B5772E] dark:text-[#D9A441]">Introduction</h2>
          <p className="mt-2">{project.introduction}</p>
        </section>

        <section>
          <h2 className="font-mono text-sm text-[#B5772E] dark:text-[#D9A441]">
            Purpose &amp; Goal
          </h2>
          <p className="mt-2">{project.purposeAndGoal}</p>
        </section>

        <section>
          <h2 className="font-mono text-sm text-[#B5772E] dark:text-[#D9A441]">Spotlight</h2>
          <p className="mt-2">{project.spotlight}</p>
        </section>

        {project.currentStatus && (
          <section>
            <h2 className="font-mono text-sm text-[#B5772E] dark:text-[#D9A441]">
              Current Status
            </h2>
            <p className="mt-2">{project.currentStatus}</p>
          </section>
        )}

        <section>
          <h2 className="font-mono text-sm text-[#B5772E] dark:text-[#D9A441]">
            Lessons Learned
          </h2>
          <p className="mt-2">{project.lessonsLearned}</p>
        </section>
      </div>
    </main>
  )
}
