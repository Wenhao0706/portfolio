'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { PROJECTS } from '@/lib/projects'
import { HomeIntro } from '@/components/HomeIntro'

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

export default function Home() {
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const tl = gsap.timeline({ paused: true })
    const hiLetters = root.querySelectorAll('[data-reveal="hi"] [data-letter]')
    const nameLetters = root.querySelectorAll('[data-reveal="name"] [data-letter]')
    const taglineLetters = root.querySelectorAll('[data-reveal="tagline"] [data-letter]')
    const ctaButtons = root.querySelectorAll('[data-reveal="cta"] > *')
    const projectsHeading = root.querySelector('[data-reveal="projects-heading"]')
    const projectCards = root.querySelectorAll('[data-reveal="project-card"]')
    const closing = root.querySelectorAll('[data-reveal="closing"] > *')
    const photo = root.querySelector('[data-reveal="photo"]')

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
      .to(projectsHeading, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }, '+=0.1')
      .to(
        projectCards,
        { opacity: 1, y: 0, duration: 0.35, stagger: 0.1, ease: 'power2.out' },
        '-=0.15'
      )
      .to(closing, { opacity: 1, y: 0, duration: 0.35, stagger: 0.1, ease: 'power2.out' }, '+=0.05')

    const play = () => tl.play()
    window.addEventListener('home-intro-opening', play)

    return () => {
      window.removeEventListener('home-intro-opening', play)
      tl.kill()
    }
  }, [])

  return (
    <main ref={rootRef} className="flex-1 max-w-3xl mx-auto w-full px-[18px] py-16 sm:py-24">
      <HomeIntro />
      <section className="flex flex-col-reverse items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p
            data-reveal="hi"
            className="font-mono text-xs text-[#B5772E] dark:text-[#D9A441]"
          >
            <TypedWords text="hi, i'm" offsetClass="translate-y-1.5" />
          </p>
          <h1
            data-reveal="name"
            className="mt-2 font-mono text-3xl sm:text-4xl font-bold text-[#2B2A26] dark:text-[#EDEFF2]"
          >
            <TypedWords text="Yoon Man Hou" offsetClass="translate-y-1.5" />
          </h1>
          <p
            data-reveal="tagline"
            className="mt-4 text-lg text-[#7A7568] dark:text-[#8A9099] max-w-xl"
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
              className="font-mono text-sm border border-[#B5772E] dark:border-[#D9A441] text-[#B5772E] dark:text-[#D9A441] px-4 py-2 rounded-[5px] hover:bg-[#B5772E] dark:hover:bg-[#D9A441] hover:text-[#F7F4EE] dark:hover:text-[#14171C] transition-colors opacity-0 translate-y-2"
            >
              Download resume
            </a>
            <Link
              href="/about"
              className="font-mono text-sm text-[#7A7568] dark:text-[#8A9099] hover:text-[#2B2A26] dark:hover:text-[#EDEFF2] px-4 py-2 transition-colors opacity-0 translate-y-2"
            >
              About me
            </Link>
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

      <section className="mt-20">
        <h2
          data-reveal="projects-heading"
          className="font-mono text-sm text-[#7A7568] dark:text-[#8A9099] opacity-0 translate-y-2"
        >
          Some things I've built
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {PROJECTS.map((project) => (
            <Link
              key={project.slug}
              href={`/projects/${project.slug}`}
              data-reveal="project-card"
              className="block rounded-[7px] border border-[#D8D3C6] dark:border-[#2A2F38] p-5 hover:border-[#B5772E] dark:hover:border-[#D9A441] transition-colors opacity-0 translate-y-2"
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
        <h2 className="font-mono text-sm text-[#7A7568] dark:text-[#8A9099] opacity-0 translate-y-2">
          Let&apos;s talk
        </h2>
        <p className="mt-2 text-[#2B2A26] dark:text-[#EDEFF2] opacity-0 translate-y-2">
          [Short closing line + link to /contact, or your email directly.]
        </p>
      </section>
    </main>
  )
}
