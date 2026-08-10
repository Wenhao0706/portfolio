/**
 * Site footer: a call to action, social tiles, and section links.
 *
 * The traffic band from the design is deliberately ABSENT rather than seeded.
 * It arrives in the analytics phase backed by real Upstash counters. Nothing
 * here may render an invented number.
 *
 * `siLinkedin` no longer exists in simple-icons (trademark removal), so LinkedIn
 * is absent rather than filled with a lookalike from another brand.
 */
import { siGithub, siWhatsapp } from 'simple-icons'
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

const NAV = [
  { href: '#about', label: 'About' },
  { href: '#projects', label: 'Projects' },
  { href: '#contact', label: 'Contact' },
]

const tileClass =
  'flex h-14 w-14 items-center justify-center rounded-[7px] border border-[#DFD7C8] text-[#7A7568] transition-colors hover:border-[#B5772E] hover:text-[#B5772E] focus-visible:border-[#B5772E] focus-visible:text-[#B5772E] dark:border-[#2A2F38] dark:text-[#8A9099] dark:hover:border-[#D9A441] dark:hover:text-[#D9A441] dark:focus-visible:border-[#D9A441] dark:focus-visible:text-[#D9A441]'

const navLinkClass =
  'font-mono text-sm uppercase tracking-wide text-[#7A7568] transition-colors hover:text-[#B5772E] focus-visible:text-[#B5772E] dark:text-[#8A9099] dark:hover:text-[#D9A441] dark:focus-visible:text-[#D9A441]'

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-[#DFD7C8] dark:border-[#2A2F38]">
      <div className="mx-auto w-full max-w-5xl px-[18px] py-16">
        <p className="font-mono text-xs uppercase tracking-widest text-[#B5772E] dark:text-[#D9A441]">
          // let&apos;s talk
        </p>

        <div className="mt-6 flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="font-mono text-4xl font-bold leading-tight text-[#2B2A26] sm:text-5xl dark:text-[#EDEFF2]">
            {/* The space before the <br> is load-bearing: a bare line break
                contributes nothing to the accessible name, which would read as
                "Let's buildsomething great" to a screen reader. */}
            Let&apos;s build{' '}
            <br />
            something great
            <span
              aria-hidden
              className="ml-1 inline-block h-[0.12em] w-[0.5em] translate-y-[-0.1em] bg-[#B5772E] align-middle dark:bg-[#D9A441]"
            />
          </h2>

          <div className="flex gap-3">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub profile"
              className={`${tileClass} ${FOCUS_RING}`}
            >
              <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6 fill-current">
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
              <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6 fill-current">
                <path d={siWhatsapp.path} />
              </svg>
            </a>
            <a
              href={`mailto:${EMAIL}`}
              aria-label="Email Yoon Man Hou"
              className={`${tileClass} ${FOCUS_RING}`}
            >
              <MailIcon className="h-6 w-6" />
            </a>
          </div>
        </div>

        <nav className="mt-12 flex flex-wrap gap-x-8 gap-y-3">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className={`${navLinkClass} ${FOCUS_RING}`}>
              {item.label}
            </a>
          ))}
        </nav>

        {/* Traffic band slot. Reserved by the mt-12 border below so the analytics
            phase drops a component in without reopening this layout. */}

        <div className="mt-12 border-t border-[#DFD7C8] pt-6 dark:border-[#2A2F38]">
          <p className="font-mono text-[11px] text-[#7A7568] dark:text-[#8A9099]">
            © 2026 Yoon Man Hou. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
