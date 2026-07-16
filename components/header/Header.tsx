import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { AnimatedName } from './AnimatedName'
import { ThemeToggle } from './ThemeToggle'
import { NavTabs } from './NavTabs'
import { ResumeDownload } from './ResumeDownload'

export default function Header() {
  return (
    <ThemeProvider>
      <header className="rounded-b-lg overflow-hidden border border-[#2A2F38]">
        <div className="bg-[#F7F4EE] dark:bg-[#14171C] flex items-center justify-between px-[18px]">
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
