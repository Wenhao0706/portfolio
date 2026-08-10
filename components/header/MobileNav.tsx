'use client'

import { ResumeDownload } from './ResumeDownload'
import { NAV_SECTIONS } from '@/lib/sections'
import { FOCUS_RING } from '@/lib/ui'

/**
 * The burger. Three bars that fold into a cross.
 *
 * Purely CSS transforms on the bars rather than swapping an icon, so the two
 * states are the same three elements moving and there is no frame where the
 * button is empty.
 */
export function MenuButton({
  open,
  onClick,
  buttonRef,
}: {
  open: boolean
  onClick: () => void
  buttonRef: React.RefObject<HTMLButtonElement | null>
}) {
  const bar =
    'block h-0.5 w-5 rounded-full bg-current transition-transform duration-300 ease-out'

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls="mobile-nav"
      aria-label={open ? 'Close menu' : 'Open menu'}
      className={`flex h-9 w-9 cursor-pointer flex-col items-center justify-center gap-1 rounded-[7px] border border-[#D8D3C6] text-[#7A7568] transition-colors hover:border-[#B5772E] hover:text-[#B5772E] lg:hidden dark:border-[#2A2F38] dark:text-[#8A9099] dark:hover:border-[#D9A441] dark:hover:text-[#D9A441] ${FOCUS_RING}`}
    >
      {/* 6px is half the 12px span between the outer bars, so they meet dead centre. */}
      <span className={`${bar} ${open ? 'translate-y-[6px] rotate-45' : ''}`} />
      <span
        className={`${bar} transition-opacity duration-200 ${open ? 'opacity-0' : 'opacity-100'}`}
      />
      <span className={`${bar} ${open ? '-translate-y-[6px] -rotate-45' : ''}`} />
    </button>
  )
}

/**
 * The mobile panel, rendered as a file tree rather than a plain link list.
 *
 * IN THE FLOW, not absolutely positioned. The header is `sticky` with
 * `overflow-hidden` for its rounded bottom corners, which would clip an absolute
 * dropdown; an in-flow panel simply makes the sticky header taller while it is
 * open and needs no z-index or clipping exceptions.
 *
 * The open/close animation is the grid `0fr -> 1fr` technique, which animates to
 * the panel's natural height without anyone hardcoding a pixel value that would
 * go stale the moment a link is added.
 *
 * `inert` + `aria-hidden` when closed: both navs are always in the DOM and the
 * swap is CSS only, so without this a keyboard user would tab through a second
 * invisible copy of every link.
 */
export function MobileNav({
  open,
  activeId,
  onNavigate,
}: {
  open: boolean
  activeId: string | null
  onNavigate: () => void
}) {
  return (
    <div
      id="mobile-nav"
      inert={!open}
      aria-hidden={!open}
      className={`grid transition-[grid-template-rows] duration-300 ease-out lg:hidden ${
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      }`}
    >
      <div className="overflow-hidden">
        <nav
          aria-label="Sections"
          className="border-t border-[#DFD7C8] px-[18px] py-4 dark:border-[#2A2F38]"
        >
          <p aria-hidden className="font-mono text-[11px] text-[#7A7568] dark:text-[#8A9099]">
            ~/
          </p>

          <ul className="mt-1">
            {NAV_SECTIONS.map((section, i) => {
              const isActive = activeId === section.id
              const isLast = i === NAV_SECTIONS.length - 1
              return (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    onClick={onNavigate}
                    aria-current={isActive ? 'true' : undefined}
                    className={`flex items-center gap-2 py-2 font-mono text-sm transition-colors ${FOCUS_RING} ${
                      isActive
                        ? 'text-[#B5772E] dark:text-[#D9A441]'
                        : 'text-[#7A7568] hover:text-[#2B2A26] dark:text-[#8A9099] dark:hover:text-[#EDEFF2]'
                    }`}
                  >
                    <span aria-hidden className="text-[#DFD7C8] dark:text-[#2A2F38]">
                      {isLast ? '└' : '├'}
                    </span>
                    {section.label}
                  </a>
                </li>
              )
            })}
          </ul>

          <div className="mt-4 border-t border-[#DFD7C8] pt-4 dark:border-[#2A2F38]">
            <ResumeDownload />
          </div>
        </nav>
      </div>
    </div>
  )
}
