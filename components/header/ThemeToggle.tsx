'use client'

import { useTheme } from '@/components/theme/useTheme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Theme: ${theme}`}
      suppressHydrationWarning
      className="font-mono text-xs px-2 py-1 rounded border border-[#565C66] text-[#7A7568] hover:text-[#2B2A26] hover:border-[#8A9099] transition-colors dark:text-[#8A9099] dark:hover:text-[#EDEFF2]"
    >
      {theme === 'dark' ? 'dark' : 'light'}
    </button>
  )
}
