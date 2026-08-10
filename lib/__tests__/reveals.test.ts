import { describe, expect, it } from 'vitest'
import { REVEAL_SECTIONS } from '@/lib/reveals'

describe('REVEAL_SECTIONS', () => {
  it('gives every entry a trigger and an items selector', () => {
    expect(REVEAL_SECTIONS.length).toBeGreaterThan(0)
    for (const section of REVEAL_SECTIONS) {
      expect(section.trigger).toMatch(/^\[data-reveal=/)
      expect(section.items.length).toBeGreaterThan(0)
    }
  })

  it('has no duplicate triggers', () => {
    const triggers = REVEAL_SECTIONS.map((s) => s.trigger)
    expect(new Set(triggers).size).toBe(triggers.length)
  })
})
