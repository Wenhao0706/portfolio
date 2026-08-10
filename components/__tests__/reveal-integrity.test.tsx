import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/ContactForm', () => ({
  ContactForm: () => <form />,
}))

import { About } from '@/components/sections/About'
import { Contact } from '@/components/sections/Contact'
import { Projects } from '@/components/sections/Projects'
import TechStack from '@/components/TechStack'
import { REVEAL_SECTIONS } from '@/lib/reveals'

/**
 * Sections ship at opacity-0 and are only revealed once these selectors match.
 * A selector that stops matching produces a BLANK SECTION in production with
 * nothing in the console. This test is the only thing that catches that.
 */
describe('reveal registry integrity', () => {
  it.each(REVEAL_SECTIONS)('$trigger matches a rendered node', ({ trigger, items }) => {
    const { container } = render(
      <div>
        <About />
        <TechStack />
        <Projects />
        <Contact />
      </div>
    )
    expect(container.querySelector(trigger)).not.toBeNull()
    expect(container.querySelectorAll(items).length).toBeGreaterThan(0)
  })
})
