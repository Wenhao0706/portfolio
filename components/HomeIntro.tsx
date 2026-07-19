'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { TextPlugin } from 'gsap/TextPlugin'

gsap.registerPlugin(TextPlugin)

export function HomeIntro() {
  const containerRef = useRef<HTMLDivElement>(null)
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const seamRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const line1Ref = useRef<HTMLSpanElement>(null)
  const line2Ref = useRef<HTMLSpanElement>(null)
  const line3Ref = useRef<HTMLSpanElement>(null)
  const line4Ref = useRef<HTMLSpanElement>(null)
  const cursorRef = useRef<HTMLSpanElement>(null)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)

  useEffect(() => {
    const seenBefore = sessionStorage.getItem('home-intro-seen') === '1'
    sessionStorage.setItem('home-intro-seen', '1')

    let cursorTween: gsap.core.Tween | null = null

    timelineRef.current?.kill()
    const tl = gsap.timeline({
      onComplete: () => {
        cursorTween?.kill()
        if (containerRef.current) containerRef.current.style.display = 'none'
      },
    })
    timelineRef.current = tl

    if (seenBefore) {
      gsap.set(terminalRef.current, { display: 'none' })
    } else {
      cursorTween = gsap.to(cursorRef.current, {
        opacity: 0,
        duration: 0.5,
        repeat: -1,
        yoyo: true,
        ease: 'steps(1)',
      })

      tl.to({}, { duration: 0.2 })
        .to(line1Ref.current, { text: 'whoami', duration: 0.3, ease: 'none' })
        .to(line2Ref.current, { text: 'yoon_man_hou', duration: 0.45, ease: 'none' }, '+=0.15')
        .to(line3Ref.current, { text: './launch.sh', duration: 0.35, ease: 'none' }, '+=0.25')
        .to(line4Ref.current, { text: '[ok] ready', duration: 0.3, ease: 'none' }, '+=0.15')
        .to({}, { duration: 0.45 })
        .add(() => cursorTween?.kill())
        .to(terminalRef.current, { opacity: 0, scale: 0.94, duration: 0.3, ease: 'power1.in' })
    }

    // The crack and the opening motion start together, so the seam dissolves
    // into the widening gap instead of vanishing before the panels visibly move.
    tl.fromTo(seamRef.current, { opacity: 0 }, { opacity: 1, duration: 0.18 })
      .set(seamRef.current, { opacity: 0 })
      .call(() => window.dispatchEvent(new Event('home-intro-opening')))
      .to(
        leftRef.current,
        { xPercent: -100, yPercent: 100, duration: 1.1, ease: 'sine.out', force3D: true },
        '<'
      )
      .to(
        rightRef.current,
        { xPercent: 100, yPercent: -100, duration: 1.1, ease: 'sine.out', force3D: true },
        '<'
      )

    return () => {
      cursorTween?.kill()
      tl.kill()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="home-intro-overlay fixed inset-0 z-[100] pointer-events-none"
    >
      <div
        ref={leftRef}
        className="absolute inset-0 bg-[#D8D3C6] dark:bg-[#2A2F38]"
        style={{
          clipPath: 'polygon(0% 0%, 100% 100%, 0% 100%)',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
        }}
      />
      <div
        ref={rightRef}
        className="absolute inset-0 bg-[#D8D3C6] dark:bg-[#2A2F38]"
        style={{
          clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%)',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
        }}
      />
      <div
        ref={seamRef}
        className="absolute inset-0 bg-[#B5772E] dark:bg-[#D9A441]"
        style={{
          clipPath: 'polygon(-0.05% 0.05%, 0.05% -0.05%, 100.05% 99.95%, 99.95% 100.05%)',
        }}
      />
      <div ref={terminalRef} className="absolute inset-0 flex items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-[7px] border border-[#2A2F38] bg-[#14171C] shadow-[0_20px_50px_rgba(0,0,0,0.45)] overflow-hidden">
          <div className="px-3 py-2 border-b border-[#2A2F38]">
            <p className="font-mono text-[11px] text-[#5A6070]">guest@portfolio: ~</p>
          </div>
          <div className="px-4 py-4 font-mono text-[13px] leading-6">
            <p>
              <span className="text-[#D9A441]">guest@portfolio</span>
              <span className="text-[#5A6070]">:~$ </span>
              <span ref={line1Ref} className="text-[#EDEFF2]" />
            </p>
            <p className="text-[#8A9099]">
              <span ref={line2Ref} />
            </p>
            <p className="mt-2">
              <span className="text-[#D9A441]">guest@portfolio</span>
              <span className="text-[#5A6070]">:~$ </span>
              <span ref={line3Ref} className="text-[#EDEFF2]" />
            </p>
            <p>
              <span ref={line4Ref} className="text-[#D9A441]" />
              <span
                ref={cursorRef}
                className="inline-block w-[7px] h-[14px] bg-[#D9A441] ml-0.5 align-middle"
              />
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
