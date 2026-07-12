'use client'

import { useTheme } from '@/components/theme/useTheme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="font-mono text-xs px-2 py-1 rounded border border-[#565C66] text-[#8A9099] hover:text-[#EDEFF2] hover:border-[#8A9099] transition-colors dark:border-[#565C66] dark:text-[#8A9099]"
    >
      {theme === 'dark' ? 'dark' : 'light'}
    </button>
  )
}
