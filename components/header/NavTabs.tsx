'use client'

import { NAV_SECTIONS, useActiveSection } from './useActiveSection'

/**
 * Desktop nav tabs. Hidden below `md`, where MobileNav takes over.
 *
 * Both are always in the DOM; the swap is CSS only. The closed mobile panel is
 * `aria-hidden` + `inert`, so the duplicate set of links never reaches the
 * accessibility tree or the tab order.
 */
export function NavTabs() {
  const activeId = useActiveSection()

  return (
    <nav className="hidden items-stretch md:flex">
      {NAV_SECTIONS.map((tab) => {
        const isActive = activeId === tab.id
        return (
          <a
            key={tab.id}
            href={`#${tab.id}`}
            aria-current={isActive ? 'true' : undefined}
            className={`group font-mono text-sm px-[18px] py-4 border-b-2 outline-none focus-visible:ring-2 focus-visible:ring-[#B5772E] dark:focus-visible:ring-[#D9A441] ${
              isActive
                ? 'text-[#2B2A26] border-[#B5772E] dark:text-[#EDEFF2] dark:border-[#D9A441]'
                : 'border-transparent'
            }`}
          >
            {tab.label.split('').map((char, i) => (
              <span
                key={i}
                className={`inline-block transition-colors duration-150 ${
                  isActive
                    ? ''
                    : 'text-[#7A7568] group-hover:text-[#2B2A26] group-focus-visible:text-[#2B2A26] dark:text-[#8A9099] dark:group-hover:text-[#EDEFF2] dark:group-focus-visible:text-[#EDEFF2]'
                }`}
                style={{ transitionDelay: `${i * 20}ms` }}
              >
                {char}
              </span>
            ))}
          </a>
        )
      })}
    </nav>
  )
}
