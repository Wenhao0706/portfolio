'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { HomeIntro } from '@/components/HomeIntro'
import StackField from '@/components/StackField'
import TechStack from '@/components/TechStack'
import { About } from '@/components/sections/About'
import { Contact } from '@/components/sections/Contact'
import { Hero } from '@/components/sections/Hero'
import { Projects } from '@/components/sections/Projects'
import { REVEAL_SECTIONS } from '@/lib/reveals'
import { PAGE_MAIN } from '@/lib/ui'

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

      /* Created AFTER the intro finishes, never at mount. Sections near the fold
         already satisfy `top 85%` on load, so a trigger built at mount fires behind
         the still-covering overlay and the section is revealed before anyone
         scrolls to it. Deferring also lets ScrollTrigger measure a settled layout. */
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

      const tl = gsap.timeline({ paused: true, onComplete: buildScrollReveals })

      tl.to(photo, { opacity: 1, y: 0, duration: 1.1, ease: 'bounce.out' }, 0)
        .to(hiLetters, { opacity: 1, y: 0, duration: 0.3, stagger: 0.06, ease: 'power2.out' }, '-=0.15')
        .to(nameLetters, { opacity: 1, y: 0, duration: 0.35, stagger: 0.07, ease: 'power2.out' }, '-=0.05')
        .to(taglineLetters, { opacity: 1, y: 0, duration: 0.2, stagger: 0.006, ease: 'power2.out' }, '-=0.1')
        .to(ctaButtons, { opacity: 1, y: 0, duration: 0.35, stagger: 0.12, ease: 'power2.out' }, '-=0.15')

      /* Repeat visits skip the choreography and land on the finished page. The
         letter-by-letter reveal runs several seconds, charming once and a wait
         every time after. Matches HomeIntro's first-session rule. */
      const showEverythingAtRest = () => {
        const heroTargets = [hiLetters, nameLetters, taglineLetters, ctaButtons, photo]
        heroTargets.forEach((t) => t && gsap.set(t, { opacity: 1, y: 0 }))
        REVEAL_SECTIONS.forEach(({ items }) =>
          gsap.set(root.querySelectorAll(items), { opacity: 1, y: 0 })
        )
        scrollRevealsBuilt = true
      }

      /* Safety net: if the intro never dispatches, the timeline never runs and its
         onComplete never builds the reveals, leaving every section below the fold
         at opacity-0 forever. Better a late reveal than a blank page. */
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
      <About />
      <TechStack />
      <Projects />
      <Contact />
    </main>
  )
}
