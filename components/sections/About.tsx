import { TerminalHeading } from '@/components/TerminalHeading'
import { ABOUT_PARAGRAPHS } from '@/lib/about'
import { SECTION_HEADING } from '@/lib/ui'

export function About() {
  return (
    <section id="about" data-reveal="about" className="mt-20 scroll-mt-24">
      <TerminalHeading className={`${SECTION_HEADING} opacity-0 translate-y-2`}>
        A bit about me
      </TerminalHeading>
      {ABOUT_PARAGRAPHS.map((text) => (
        <p
          key={text.slice(0, 24)}
          className="mt-4 max-w-2xl leading-relaxed text-[#7A7568] dark:text-[#8A9099] opacity-0 translate-y-2"
        >
          {text}
        </p>
      ))}
    </section>
  )
}
