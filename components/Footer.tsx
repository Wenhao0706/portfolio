/**
 * Site footer.
 *
 * Rebuilt as an actual FOOTER rather than a final section. It used to lead with a
 * "let's build something great" call to action, which made sense when contact was
 * its own route; on a single page it sits directly beneath the contact form and
 * asks for the same thing twice, so it read as one more section rather than as
 * the end of the page.
 *
 * What marks the end now is the session closing. The page opens on a terminal
 * typing itself in and closes on `exit`, which is a frame rather than another
 * decoration, and it costs one short line.
 *
 * The traffic band from the design is deliberately ABSENT rather than seeded. It
 * arrives in the analytics phase backed by real Upstash counters. Nothing here
 * may render an invented number.
 *
 * `siLinkedin` no longer exists in simple-icons (trademark removal), so LinkedIn
 * is absent rather than filled with a lookalike from another brand.
 */
import { siGithub, siWhatsapp } from 'simple-icons'
import { LocalTime } from '@/components/LocalTime'
import { TypedLine } from '@/components/TypedLine'
import { SIGNOFF } from '@/lib/about'
import { NAV_SECTIONS } from '@/lib/sections'
import { EMAIL, GITHUB_URL, LINKEDIN_URL, WHATSAPP_URL } from '@/lib/site'
import { FOCUS_RING } from '@/lib/ui'

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

/* Both carry FOCUS_RING already, so a call site is just `className={tileClass}`.
   Appending it at each of the five use sites is five chances to forget one. */
const tileClass = `flex h-11 w-11 items-center justify-center rounded-[7px] border border-[#DFD7C8] text-[#7A7568] transition-colors hover:border-[#B5772E] hover:text-[#B5772E] focus-visible:border-[#B5772E] focus-visible:text-[#B5772E] dark:border-[#2A2F38] dark:text-[#8A9099] dark:hover:border-[#D9A441] dark:hover:text-[#D9A441] dark:focus-visible:border-[#D9A441] dark:focus-visible:text-[#D9A441] ${FOCUS_RING}`

const navLinkClass = `font-mono text-xs text-[#7A7568] transition-colors hover:text-[#B5772E] focus-visible:text-[#B5772E] dark:text-[#8A9099] dark:hover:text-[#D9A441] dark:focus-visible:text-[#D9A441] ${FOCUS_RING}`

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-[#DFD7C8] dark:border-[#2A2F38]">
      <div className="mx-auto w-full max-w-5xl px-[18px] py-12">
        <p className="font-mono text-sm">
          <span aria-hidden className="text-[#B5772E] dark:text-[#D9A441]">
            guest@portfolio
          </span>
          <span aria-hidden className="text-[#7A7568] dark:text-[#5A6070]">
            :~${' '}
          </span>
          <TypedLine text="exit" className="text-[#2B2A26] dark:text-[#EDEFF2]" />
        </p>
        <p className="mt-1 font-mono text-xs text-[#7A7568] dark:text-[#8A9099]">
          [process exited] Thanks for reading this far.
        </p>

        {/* The one piece of large type on the page's last screen. It is his own
            sentence, lifted from About, not a slogan written for a footer. */}
        <p className="mt-10 max-w-3xl font-mono text-2xl leading-snug font-bold text-[#2B2A26] sm:text-4xl dark:text-[#EDEFF2]">
          {SIGNOFF}
        </p>

        {/* Status, not a second call to action. The contact form is directly
            above; what this adds is availability and the timezone gap, which is
            the thing a remote employer actually wants and cannot infer. */}
        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-xs text-[#7A7568] dark:text-[#8A9099]">
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="relative flex h-2 w-2">
              <span className="status-ping absolute inline-flex h-full w-full rounded-full bg-[#7FA57F]" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#7FA57F]" />
            </span>
            Open to junior developer roles
          </span>
          <span aria-hidden className="text-[#DFD7C8] dark:text-[#2A2F38]">|</span>
          <LocalTime />
        </div>

        <div className="mt-10 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <nav aria-label="Sections" className="flex flex-wrap gap-x-6 gap-y-2">
            {NAV_SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={navLinkClass}
              >
                {section.label}
              </a>
            ))}
          </nav>

          <div className="flex gap-3">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub profile"
              className={tileClass}
            >
              <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 fill-current">
                <path d={siGithub.path} />
              </svg>
            </a>
            {/* A text glyph, not an icon. simple-icons removed the LinkedIn mark
                over trademark, and drawing a lookalike would be reproducing the
                logo by hand. See AGENTS.md. */}
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn profile"
              className={tileClass}
            >
              <span aria-hidden className="font-mono text-base font-bold lowercase">
                in
              </span>
            </a>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Message on WhatsApp"
              className={tileClass}
            >
              <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 fill-current">
                <path d={siWhatsapp.path} />
              </svg>
            </a>
            <a
              href={`mailto:${EMAIL}`}
              aria-label="Email Yoon Man Hou"
              className={tileClass}
            >
              <MailIcon className="h-5 w-5" />
            </a>
          </div>
        </div>

        {/* Traffic band slot. Reserved by the border below so the analytics phase
            drops a component in without reopening this layout. */}

        <div className="mt-10 flex flex-col gap-2 border-t border-[#DFD7C8] pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-[#2A2F38]">
          <p className="font-mono text-[11px] text-[#7A7568] dark:text-[#8A9099]">
            © 2026 Yoon Man Hou. All rights reserved.
          </p>
          <p className="font-mono text-[11px] text-[#7A7568] dark:text-[#8A9099]">
            Built with Next.js, Tailwind and GSAP
          </p>
        </div>
      </div>
    </footer>
  )
}
