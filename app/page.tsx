import Image from 'next/image'
import Link from 'next/link'
import { PROJECTS } from '@/lib/projects'

export default function Home() {
  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-[18px] py-16 sm:py-24">
      <section className="flex flex-col-reverse items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs text-[#B5772E] dark:text-[#D9A441]">hi, i'm</p>
          <h1 className="mt-2 font-mono text-3xl sm:text-4xl font-bold text-[#2B2A26] dark:text-[#EDEFF2]">
            Yoon Man Hou
          </h1>
          <p className="mt-4 text-lg text-[#7A7568] dark:text-[#8A9099] max-w-xl">
            WordPress/PHP dev by day, picking up React and Node on the side through this
            portfolio.
          </p>
          <div className="mt-8 flex gap-3">
            <Link
              href="/projects"
              className="font-mono text-sm border border-[#B5772E] dark:border-[#D9A441] text-[#B5772E] dark:text-[#D9A441] px-4 py-2 rounded-[5px] hover:bg-[#B5772E] dark:hover:bg-[#D9A441] hover:text-[#F7F4EE] dark:hover:text-[#14171C] transition-colors"
            >
              View projects
            </Link>
            <Link
              href="/about"
              className="font-mono text-sm text-[#7A7568] dark:text-[#8A9099] hover:text-[#2B2A26] dark:hover:text-[#EDEFF2] px-4 py-2 transition-colors"
            >
              About me
            </Link>
          </div>
        </div>
        <div className="relative shrink-0 group">
          <div
            aria-hidden
            className="absolute inset-0 rounded-full bg-[#6B9BD1] opacity-25 blur-2xl"
          />
          <div className="animate-float">
            <Image
              src="/images/yoon-man-hou.png"
              alt="Yoon Man Hou"
              width={180}
              height={231}
              priority
              className="relative max-w-[180px] object-contain drop-shadow-[0_20px_25px_rgba(0,0,0,0.35)] rotate-[-4deg] transition-transform duration-300 group-hover:rotate-0"
              style={{ width: 'auto', height: 'auto' }}
            />
          </div>
        </div>
      </section>

      <section className="mt-20">
        <h2 className="font-mono text-sm text-[#7A7568] dark:text-[#8A9099]">
          Some things I've built
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {PROJECTS.map((project) => (
            <Link
              key={project.slug}
              href={`/projects/${project.slug}`}
              className="block rounded-[7px] border border-[#D8D3C6] dark:border-[#2A2F38] p-5 hover:border-[#B5772E] dark:hover:border-[#D9A441] transition-colors"
            >
              <h3 className="font-mono font-semibold text-[#2B2A26] dark:text-[#EDEFF2]">
                {project.title}
              </h3>
              <p className="mt-2 text-sm text-[#7A7568] dark:text-[#8A9099]">{project.hook}</p>
              <p className="mt-3 font-mono text-xs text-[#B5772E] dark:text-[#D9A441]">
                View project →
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <h2 className="font-mono text-sm text-[#7A7568] dark:text-[#8A9099]">Let's talk</h2>
        <p className="mt-2 text-[#2B2A26] dark:text-[#EDEFF2]">
          [Short closing line + link to /contact, or your email directly.]
        </p>
      </section>
    </main>
  )
}
