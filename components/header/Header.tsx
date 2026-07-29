import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { AnimatedName } from './AnimatedName'
import { ThemeToggle } from './ThemeToggle'
import { NavTabs } from './NavTabs'
import { ResumeDownload } from './ResumeDownload'

export default function Header() {
  return (
    <ThemeProvider>
      {/* `sticky top-0` rather than `fixed`: it pins from the very first pixel of
          scroll exactly like fixed, but keeps its space in the flow, so the page
          below needs no compensating padding and nothing hides under it. */}
      <header className="sticky top-0 z-50 rounded-b-lg overflow-hidden border border-[#2A2F38]">
        <div className="bg-[#F1EBE0] dark:bg-[#14171C] flex items-center justify-between px-[18px]">
          <AnimatedName />
          <NavTabs />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <ResumeDownload />
          </div>
        </div>
      </header>
    </ThemeProvider>
  )
}
