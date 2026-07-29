/**
 * Site footer: identity, navigation, projects, contacts, and a scroll-to-top.
 *
 * Project links come from lib/projects.ts rather than being hardcoded, so adding
 * a fourth project updates the footer along with every other surface.
 *
 * `siLinkedin` no longer exists in simple-icons (trademark removal), so the
 * LinkedIn slot is deliberately absent rather than filled with a lookalike.
 */
import Image from 'next/image'
import Link from 'next/link'
import { siGithub, siWhatsapp } from 'simple-icons'
import { PROJECTS } from '@/lib/projects'
import { EMAIL, GITHUB_URL, WHATSAPP_URL } from '@/lib/site'
import { SURFACE } from '@/lib/ui'

/** Hand-drawn rather than from simple-icons: email is not a brand. */
function MailIcon({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  )
}

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/projects', label: 'Projects' },
  { href: '/contact', label: 'Contact' },
]

const linkClass =
  'text-sm text-[#7A7568] dark:text-[#8A9099] transition-colors hover:text-[#B5772E] dark:hover:text-[#D9A441] focus-visible:text-[#B5772E] dark:focus-visible:text-[#D9A441]'

const headingClass = 'font-mono text-sm font-semibold text-[#2B2A26] dark:text-[#EDEFF2]'

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-[#DFD7C8] dark:border-[#2A2F38]">
      <div className="mx-auto w-full max-w-5xl px-[18px] py-12">
        {/* Flex, NOT an equal-width grid. Equal columns give equal gaps between
            column EDGES, but the visible gutter is the space between the last
            character of one column and the first of the next — so a column of long
            project titles fills its cell edge to edge while a column of short nav
            links leaves most of its cell empty, and the two gutters look nothing
            alike. Sizing each column to its content puts one real gap-x between
            them. The identity column takes the slack so the row still spans. */}
        <div className="flex flex-col gap-10 lg:flex-row lg:flex-wrap lg:gap-x-16">
          {/* Identity */}
          <div className="lg:min-w-[240px] lg:flex-1">
            {/* `fill` inside a fixed-size relative circle, NOT width/height props:
                the source is a 180x231 full-figure cutout, so intrinsic sizing plus
                Tailwind's `img { height: auto }` fought the h-16/w-16 classes and
                the circle never held its shape. object-top keeps the head in frame. */}
            <div className={`relative h-16 w-16 overflow-hidden rounded-full ${SURFACE}`}>
              <Image
                src="/images/yoon-man-hou.png"
                alt="Yoon Man Hou"
                fill
                sizes="64px"
                className="object-cover object-top"
              />
            </div>
            <a href={`mailto:${EMAIL}`} className={`mt-4 flex items-center gap-2 ${linkClass}`}>
              <MailIcon className="h-4 w-4 shrink-0" />
              {EMAIL}
            </a>
            <p className="mt-6 font-mono text-[11px] text-[#7A7568] dark:text-[#8A9099]">
              © 2026 Yoon Man Hou. All rights reserved.
            </p>
          </div>

          {/* Links */}
          <div className="lg:shrink-0">
            <h2 className={headingClass}>Links</h2>
            <ul className="mt-4 space-y-3">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Projects */}
          <div className="lg:shrink-0">
            <h2 className={headingClass}>Projects</h2>
            <ul className="mt-4 space-y-3">
              {PROJECTS.map((project) => (
                <li key={project.slug}>
                  <Link href={`/projects/${project.slug}`} className={linkClass}>
                    {project.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacts */}
          <div className="lg:shrink-0">
            <h2 className={headingClass}>Contacts</h2>
            <div className="mt-4 flex items-center gap-3">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub profile"
                className={linkClass}
              >
                <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 fill-current">
                  <path d={siGithub.path} />
                </svg>
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Message Yoon Man Hou on WhatsApp"
                className={linkClass}
              >
                <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 fill-current">
                  <path d={siWhatsapp.path} />
                </svg>
              </a>
              <a href={`mailto:${EMAIL}`} aria-label="Email Yoon Man Hou" className={linkClass}>
                <MailIcon className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
