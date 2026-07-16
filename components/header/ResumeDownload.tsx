'use client'

import { useRef } from 'react'
import gsap from 'gsap'

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
      className="inline-flex items-center gap-[6px] font-mono text-xs border border-[#B5772E] dark:border-[#D9A441] text-[#B5772E] dark:text-[#D9A441] px-3 py-2 rounded-[5px] transition-colors duration-200 hover:bg-[#B5772E] dark:hover:bg-[#D9A441] hover:text-[#F7F4EE] dark:hover:text-[#14171C] focus-visible:bg-[#B5772E] dark:focus-visible:bg-[#D9A441] focus-visible:text-[#F7F4EE] dark:focus-visible:text-[#14171C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B5772E] dark:focus-visible:outline-[#D9A441] cursor-pointer"
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
