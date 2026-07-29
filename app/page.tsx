'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { PROJECTS } from '@/lib/projects'
import { HomeIntro } from '@/components/HomeIntro'
import StackField from '@/components/StackField'
import TechStack from '@/components/TechStack'
import { ACCENT_LINK, PAGE_MAIN, SECTION_HEADING, SURFACE_INTERACTIVE } from '@/lib/ui'

function TypedWords({ text, offsetClass }: { text: string; offsetClass: string }) {
  const wordSpans = text.split(' ').map((word, wi) => (
    <span key={wi} className="inline-block whitespace-nowrap">
      {word.split('').map((char, ci) => (
        <span
          key={ci}
          data-letter
          className={`inline-block whitespace-pre opacity-0 ${offsetClass}`}
        >
          {char}
        </span>
      ))}
    </span>
  ))

  // Real breakable spaces go *between* word spans, not inside them, so
  // wrapping only ever happens at word boundaries, never mid-word.
  return wordSpans.reduce<React.ReactNode[]>((acc, el, i) => {
    if (i > 0) acc.push(' ')
    acc.push(el)
    return acc
  }, [])
}

gsap.registerPlugin(ScrollTrigger)

/** Fires when the section's top passes this far down the viewport. */
const REVEAL_START = 'top 85%'

export default function Home() {
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const ctx = gsap.context(() => {
      const hiLetters = root.querySelectorAll('[data-reveal="hi"] [data-letter]')
      const nameLetters = root.querySelectorAll('[data-reveal="name"] [data-letter]')
      const taglineLetters = root.querySelectorAll('[data-reveal="tagline"] [data-letter]')
      const ctaButtons = root.querySelectorAll('[data-reveal="cta"] > *')
      const photo = root.querySelector('[data-reveal="photo"]')

      /* Below-the-fold sections. Each reveals when its own section nears the
         viewport rather than on load, so the animation is where the reader is. */
      const scrollSections: { trigger: string; items: string }[] = [
        { trigger: '[data-reveal="tech"]', items: '[data-reveal="tech"] > *' },
        {
          trigger: '[data-reveal="projects"]',
          items: '[data-reveal="projects-heading"], [data-reveal="project-card"]',
        },
        { trigger: '[data-reveal="closing"]', items: '[data-reveal="closing"] > *' },
      ]

      /* Deliberately NO prefers-reduced-motion guard here. The site owner runs with
         reduced motion enabled at OS level, so a guard silently snaps every reveal
         to its end state and the page looks unanimated. Same explicit decision as
         components/header/* — see AGENTS.md. */

      /* Created AFTER the intro finishes, never at mount. "What I work with" sits
         close enough to the fold that `top 85%` is already satisfied on load, so a
         trigger built at mount fires instantly — behind the still-covering overlay —
         and the section is already revealed by the time anyone scrolls to it.
         Deferring also means ScrollTrigger measures a settled layout. */
      let scrollRevealsBuilt = false
      const buildScrollReveals = () => {
        if (scrollRevealsBuilt) return
        scrollRevealsBuilt = true

        scrollSections.forEach(({ trigger, items }) => {
          const el = root.querySelector(trigger)
          const targets = root.querySelectorAll(items)
          if (!el || !targets.length) return

          gsap.to(targets, {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.1,
            ease: 'power2.out',
            scrollTrigger: { trigger: el, start: REVEAL_START, once: true },
          })
        })

        ScrollTrigger.refresh()
      }

      /* The hero still plays off the intro overlay, not off scroll: it is already
         in view on load, so a scroll trigger would fire instantly anyway. */
      const tl = gsap.timeline({ paused: true, onComplete: buildScrollReveals })

      tl.to(photo, { opacity: 1, y: 0, duration: 1.1, ease: 'bounce.out' }, 0)
        .to(hiLetters, { opacity: 1, y: 0, duration: 0.3, stagger: 0.06, ease: 'power2.out' }, '-=0.15')
        .to(
          nameLetters,
          { opacity: 1, y: 0, duration: 0.35, stagger: 0.07, ease: 'power2.out' },
          '-=0.05'
        )
        .to(
          taglineLetters,
          { opacity: 1, y: 0, duration: 0.2, stagger: 0.006, ease: 'power2.out' },
          '-=0.1'
        )
        .to(ctaButtons, { opacity: 1, y: 0, duration: 0.35, stagger: 0.12, ease: 'power2.out' }, '-=0.15')

      /* Repeat visits skip the choreography entirely and land on the finished page.
         The letter-by-letter hero reveal runs several seconds — charming once,
         a wait every time after. The slash itself still replays on every visit;
         only the content reveal is gated. Matches the terminal's first-session
         rule in components/HomeIntro.tsx. */
      const showEverythingAtRest = () => {
        const heroTargets = [hiLetters, nameLetters, taglineLetters, ctaButtons, photo]
        heroTargets.forEach((t) => t && gsap.set(t, { opacity: 1, y: 0 }))
        scrollSections.forEach(({ items }) =>
          gsap.set(root.querySelectorAll(items), { opacity: 1, y: 0 })
        )
        scrollRevealsBuilt = true
      }

      /* Safety net: if the intro never dispatches, the hero timeline never runs and
         its onComplete never builds the scroll reveals — leaving every section below
         the fold stuck at opacity-0 forever. Better a late reveal than a blank page.
         Cleared as soon as the real event arrives. */
      const fallback = window.setTimeout(() => {
        tl.play()
        buildScrollReveals()
      }, 4000)

      const play = (event: Event) => {
        window.clearTimeout(fallback)
        const firstVisit =
          (event as CustomEvent<{ firstVisit?: boolean }>).detail?.firstVisit ?? true
        if (firstVisit) tl.play()
        else showEverythingAtRest()
      }
      window.addEventListener('home-intro-opening', play)

      return () => {
        window.removeEventListener('home-intro-opening', play)
        window.clearTimeout(fallback)
      }
    }, root)

    return () => ctx.revert()
  }, [])

  return (
    <main ref={rootRef} className={`relative ${PAGE_MAIN}`}>
      <StackField />
      <HomeIntro />
      <section className="flex flex-col-reverse items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p
            data-reveal="hi"
            className="font-mono text-xs text-[#B5772E] dark:text-[#D9A441]"
          >
            <TypedWords text="Hi, I'm" offsetClass="translate-y-1.5" />
          </p>
          <h1
            data-reveal="name"
            className="mt-2 font-mono text-3xl sm:text-4xl font-bold text-[#2B2A26] dark:text-[#EDEFF2]"
          >
            <TypedWords text="Yoon Man Hou" offsetClass="translate-y-1.5" />
          </h1>
          <p
            data-reveal="tagline"
            className="mt-4 font-sans text-base sm:text-lg leading-relaxed text-[#7A7568] dark:text-[#8A9099] max-w-xl"
          >
            <TypedWords
              text="Thanks for stopping by. I work as a WordPress/PHP developer during the day, and I'm using my free time to learn React and Node by building this site. Below you'll find some of what I've worked on, real client projects and a few things I built just to learn. Got something to say or looking to hire? Just reach out."
              offsetClass="translate-y-1"
            />
          </p>
          <div data-reveal="cta" className="mt-8 flex gap-3">
            <a
              href="/resume.pdf"
              download
              className="font-mono text-sm border border-[#B5772E] dark:border-[#D9A441] text-[#B5772E] dark:text-[#D9A441] px-4 py-2 rounded-[5px] hover:bg-[#B5772E] dark:hover:bg-[#D9A441] hover:text-[#F1EBE0] dark:hover:text-[#14171C] transition-colors opacity-0 translate-y-2"
            >
              Download resume
            </a>
          </div>
        </div>
        <div data-reveal="photo" className="relative shrink-0 group opacity-0 -translate-y-24">
          <div
            aria-hidden
            className="absolute inset-0 rounded-full bg-[#6B9BD1] opacity-25 blur-2xl transition-opacity duration-300 group-hover:opacity-40"
          />
          <div className="animate-float">
            <Image
              src="/images/yoon-man-hou.png"
              alt="Yoon Man Hou"
              width={180}
              height={231}
              priority
              className="relative max-w-[180px] object-contain drop-shadow-[0_20px_25px_rgba(0,0,0,0.35)] transition-transform duration-300 ease-out group-hover:-rotate-3 group-hover:scale-105"
              style={{ width: 'auto', height: 'auto' }}
            />
          </div>
        </div>
      </section>

      <TechStack />

      <section data-reveal="projects" className="mt-20">
        <h2
          data-reveal="projects-heading"
          className={`${SECTION_HEADING} opacity-0 translate-y-2`}
        >
          Some things I&apos;ve built
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {PROJECTS.map((project) => (
            <Link
              key={project.slug}
              href={`/projects/${project.slug}`}
              data-reveal="project-card"
              className={`block rounded-[7px] p-5 opacity-0 translate-y-2 ${SURFACE_INTERACTIVE}`}
            >
              <h3 className="font-mono font-semibold text-[#2B2A26] dark:text-[#EDEFF2]">
                {project.title}
              </h3>
              <p className="mt-2 text-sm text-[#7A7568] dark:text-[#8A9099]">{project.hook}</p>
              <p className="mt-3 font-mono text-xs text-[#B5772E] dark:text-[#D9A441]">
                View project →
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section data-reveal="closing" className="mt-20">
        <h2 className={`${SECTION_HEADING} opacity-0 translate-y-2`}>Let&apos;s talk</h2>
        <p className="mt-4 text-[#7A7568] dark:text-[#8A9099] opacity-0 translate-y-2">
          Looking for a junior developer role, and open to freelance work. If that sounds like
          you,{' '}
          <Link
            href="/contact"
            className={ACCENT_LINK}
          >
            say hello
          </Link>
          .
        </p>
      </section>
    </main>
  )
}
