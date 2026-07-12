'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/about', label: 'about' },
  { href: '/projects', label: 'projects' },
  { href: '/contact', label: 'contact' },
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
            className={`font-mono text-sm px-[18px] py-4 border-b-2 transition-colors ${
              isActive
                ? 'text-[#EDEFF2] border-[#D9A441] dark:text-[#EDEFF2] dark:border-[#D9A441]'
                : 'text-[#8A9099] border-transparent hover:text-[#EDEFF2]'
            }`}
          >
            {tab.label}
            <span className="text-[#565C66]">.tsx</span>
          </Link>
        )
      })}
    </nav>
  )
}
