'use client'

import { useTheme } from '@/components/theme/useTheme'

// Shared by both crossfading icons; the state-dependent transform/opacity is appended per icon.
const ICON_TRANSITION = 'absolute w-4 h-4 transition-all duration-500 ease-[cubic-bezier(0.65,0,0.35,1)]'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Theme: ${theme}`}
      suppressHydrationWarning
      className="relative w-9 h-9 flex items-center justify-center rounded-[7px] border border-[#D8D3C6] dark:border-[#2A2F38] bg-gradient-to-b from-white to-[#EBE7DC] dark:from-[#1E232B] dark:to-[#14171C] text-[#7A7568] hover:text-[#2B2A26] hover:border-[#8A9099] dark:text-[#8A9099] dark:hover:text-[#EDEFF2] shadow-[0_1px_0_0_rgba(255,255,255,0.7)_inset,0_2px_4px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_2px_5px_rgba(0,0,0,0.5),0_1px_2px_rgba(0,0,0,0.35)] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_3px_6px_rgba(0,0,0,0.16),0_1px_3px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_3px_7px_rgba(0,0,0,0.55),0_1px_3px_rgba(0,0,0,0.4)] active:translate-y-px active:shadow-[0_1px_2px_rgba(0,0,0,0.15)_inset] dark:active:shadow-[0_1px_3px_rgba(0,0,0,0.6)_inset] transition-all duration-300 cursor-pointer"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        suppressHydrationWarning
        className={`${ICON_TRANSITION} ${
          isDark ? 'scale-50 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'
        }`}
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        suppressHydrationWarning
        className={`${ICON_TRANSITION} ${
          isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-50 -rotate-90 opacity-0'
        }`}
      >
        <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
      </svg>
    </button>
  )
}
