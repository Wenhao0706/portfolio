'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { ACCENT_BUTTON } from '@/lib/ui'

export function ResumeDownload() {
  const arrowRef = useRef<SVGGElement>(null)
  const tweenRef = useRef<gsap.core.Timeline | null>(null)

  const handleEnter = () => {
    if (!arrowRef.current) return
    tweenRef.current?.kill()
    tweenRef.current = gsap.timeline({ repeat: -1, repeatDelay: 0.3 }).to(arrowRef.current, {
      y: 3,
      duration: 0.12,
      ease: 'power1.out',
      yoyo: true,
      repeat: 1,
    })
  }

  const handleLeave = () => {
    tweenRef.current?.kill()
    if (arrowRef.current) {
      gsap.set(arrowRef.current, { y: 0 })
    }
  }

  return (
    <a
      href="/resume.pdf"
      download
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      className={ACCENT_BUTTON}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="shrink-0 overflow-visible"
      >
        <g ref={arrowRef}>
          <path d="M8 4V10.5" />
          <path d="M4.5 8L8 11.5L11.5 8" />
        </g>
      </svg>
      resume
    </a>
  )
}
