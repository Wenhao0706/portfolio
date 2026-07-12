import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { ThemeToggle } from './ThemeToggle'
import { NavTabs } from './NavTabs'

export default function Header() {
  return (
    <ThemeProvider>
      <header className="rounded-lg overflow-hidden border border-[#2A2F38]">
        <div className="bg-[#EDE9E0] dark:bg-[#1A1E24] px-[14px] py-[6px] flex items-center gap-2 font-mono text-xs text-[#8A8272] dark:text-[#6B7280]">
          <span className="flex gap-[6px] mr-[6px]">
            <span className="w-[9px] h-[9px] rounded-full bg-[#E5534B]" />
            <span className="w-[9px] h-[9px] rounded-full bg-[#DCA131]" />
            <span className="w-[9px] h-[9px] rounded-full bg-[#3FB950]" />
          </span>
          wenhao.dev — portfolio.tsx
        </div>
        <div className="bg-[#F7F4EE] dark:bg-[#14171C] flex items-center justify-between px-[18px]">
          <div className="font-mono font-bold text-[15px] py-4 text-[#2B2A26] dark:text-[#EDEFF2] flex items-center gap-[2px]">
            wenhao
            <span className="inline-block w-[7px] h-4 bg-[#4FA88F] ml-[2px] dark:animate-pulse" />
          </div>
          <NavTabs />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a
              href="/resume.pdf"
              download
              className="font-mono text-xs bg-transparent border border-[#B5772E] dark:border-[#D9A441] text-[#B5772E] dark:text-[#D9A441] px-3 py-2 rounded-[5px] hover:bg-[#B5772E] dark:hover:bg-[#D9A441] hover:text-[#F7F4EE] dark:hover:text-[#14171C] transition-colors"
            >
              $ resume --download
            </a>
          </div>
        </div>
      </header>
    </ThemeProvider>
  )
}
