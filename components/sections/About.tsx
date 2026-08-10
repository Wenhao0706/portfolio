import { SECTION_HEADING } from '@/lib/ui'

const PARAGRAPHS = [
  "I'm a WordPress and PHP developer at Tech Strongbox, where most of my time goes to client sites. Theme work, plugin customisation, and the kind of bug that only ever shows up on someone else's hosting.",
  "I studied software engineering and built a cleaning service booking app as my final year project, a Laravel API with a Flutter app on top. It's still the thing I'm proudest of, mostly because of how much of it broke before it worked.",
  "Right now I'm learning React and Node, and this site is where I'm doing it. I'm looking for a junior developer role where I can keep building things I don't fully know how to build yet.",
]

export function About() {
  return (
    <section id="about" data-reveal="about" className="mt-20 scroll-mt-24">
      <h2 className={`${SECTION_HEADING} opacity-0 translate-y-2`}>A bit about me</h2>
      {PARAGRAPHS.map((text) => (
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
