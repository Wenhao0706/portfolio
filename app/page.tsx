'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { HomeIntro } from '@/components/HomeIntro'
import StackField from '@/components/StackField'
import TechStack from '@/components/TechStack'
import { Hero } from '@/components/sections/Hero'
import { Projects } from '@/components/sections/Projects'
import { REVEAL_SECTIONS } from '@/lib/reveals'
import { ACCENT_LINK, PAGE_MAIN, SECTION_HEADING } from '@/lib/ui'

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

        REVEAL_SECTIONS.forEach(({ trigger, items }) => {
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
        REVEAL_SECTIONS.forEach(({ items }) =>
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
      <Hero />

      <TechStack />

      <Projects />

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
