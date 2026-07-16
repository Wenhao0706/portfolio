'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/about', label: 'About' },
  { href: '/projects', label: 'Projects' },
  { href: '/contact', label: 'Contact' },
] as const

export function NavTabs() {
  const pathname = usePathname()

  return (
    <nav className="flex items-stretch">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
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
          </Link>
        )
      })}
    </nav>
  )
}
