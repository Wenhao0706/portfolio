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
import { TypedLine } from '@/components/TypedLine'
import { ROLE_LINE } from '@/lib/about'
import { NAV_SECTIONS } from '@/lib/sections'
import { EMAIL, GITHUB_URL, WHATSAPP_URL } from '@/lib/site'
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

const tileClass =
  'flex h-11 w-11 items-center justify-center rounded-[7px] border border-[#DFD7C8] text-[#7A7568] transition-colors hover:border-[#B5772E] hover:text-[#B5772E] focus-visible:border-[#B5772E] focus-visible:text-[#B5772E] dark:border-[#2A2F38] dark:text-[#8A9099] dark:hover:border-[#D9A441] dark:hover:text-[#D9A441] dark:focus-visible:border-[#D9A441] dark:focus-visible:text-[#D9A441]'

const navLinkClass =
  'font-mono text-xs text-[#7A7568] transition-colors hover:text-[#B5772E] focus-visible:text-[#B5772E] dark:text-[#8A9099] dark:hover:text-[#D9A441] dark:focus-visible:text-[#D9A441]'

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

        <div className="mt-10 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-base font-semibold text-[#2B2A26] dark:text-[#EDEFF2]">
              Yoon Man Hou
            </p>
            <p className="mt-1 text-sm text-[#7A7568] dark:text-[#8A9099]">{ROLE_LINE}</p>

            <nav aria-label="Sections" className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
              {NAV_SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className={`${navLinkClass} ${FOCUS_RING}`}
                >
                  {section.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex gap-3">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub profile"
              className={`${tileClass} ${FOCUS_RING}`}
            >
              <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 fill-current">
                <path d={siGithub.path} />
              </svg>
            </a>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Message on WhatsApp"
              className={`${tileClass} ${FOCUS_RING}`}
            >
              <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 fill-current">
                <path d={siWhatsapp.path} />
              </svg>
            </a>
            <a
              href={`mailto:${EMAIL}`}
              aria-label="Email Yoon Man Hou"
              className={`${tileClass} ${FOCUS_RING}`}
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
