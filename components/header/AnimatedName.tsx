'use client'

import Link from 'next/link'
import { useRef } from 'react'
import gsap from 'gsap'

const NAME = 'Yoon Man Hou'

export function AnimatedName() {
  const linkRef = useRef<HTMLAnchorElement>(null)
  const tweenRef = useRef<gsap.core.Tween | null>(null)

  const handleEnter = () => {
    const letters = linkRef.current?.querySelectorAll('[data-letter]')
    if (!letters) return
    tweenRef.current?.kill()
    tweenRef.current = gsap.to(letters, {
      y: -8,
      duration: 0.4,
      ease: 'sine.inOut',
      stagger: {
        each: 0.05,
        repeat: -1,
        yoyo: true,
      },
    })
  }

  const handleLeave = () => {
    tweenRef.current?.kill()
    const letters = linkRef.current?.querySelectorAll('[data-letter]')
    if (letters) {
      tweenRef.current = gsap.to(letters, { y: 0, duration: 0.2, overwrite: true })
    }
  }

  return (
    <Link
      href="/"
      ref={linkRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="group inline-flex items-center font-mono font-bold text-[15px] py-4"
    >
      <span className="text-[#2B2A26] dark:text-[#EDEFF2] transition-colors group-hover:text-[#B5772E] dark:group-hover:text-[#D9A441]">
        {NAME.split('').map((char, i) => (
          <span key={i} data-letter className="inline-block whitespace-pre">
            {char}
          </span>
        ))}
      </span>
    </Link>
  )
}
