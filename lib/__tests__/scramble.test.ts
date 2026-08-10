import { describe, expect, it } from 'vitest'
import { scrambleFrame, SCRAMBLE_GLYPHS } from '@/lib/scramble'

const TEXT = 'A bit about me'
/** Deterministic: always picks the first glyph. */
const zero = () => 0

describe('scrambleFrame', () => {
  it('resolves to the exact text at full progress', () => {
    expect(scrambleFrame(TEXT, 1, zero)).toBe(TEXT)
  })

  it('clamps progress past the ends rather than overrunning the string', () => {
    expect(scrambleFrame(TEXT, 5, zero)).toBe(TEXT)
    expect(scrambleFrame(TEXT, -3, zero)).toBe(scrambleFrame(TEXT, 0, zero))
  })

  it('holds the exact width at every progress, so the section never reflows', () => {
    for (const p of [0, 0.13, 0.5, 0.77, 1]) {
      expect(scrambleFrame(TEXT, p, zero)).toHaveLength(TEXT.length)
    }
  })

  it('keeps real spaces so word shape survives the noise', () => {
    const frame = scrambleFrame(TEXT, 0, zero)
    for (let i = 0; i < TEXT.length; i++) {
      if (TEXT[i] === ' ') expect(frame[i]).toBe(' ')
    }
  })

  it('reveals left to right', () => {
    const frame = scrambleFrame(TEXT, 0.5, zero)
    expect(frame.startsWith(TEXT.slice(0, Math.floor(0.5 * TEXT.length)))).toBe(true)
  })

  /* Positive control. Every other assertion here passes for a frame function
     that just returns its input, which would ship an entirely invisible effect. */
  it('actually obscures the text at low progress', () => {
    expect(scrambleFrame(TEXT, 0, zero)).not.toBe(TEXT)
    expect(scrambleFrame(TEXT, 0.4, zero)).not.toBe(TEXT)
  })

  it('never emits a bracket, which would trip the placeholder-copy guards', () => {
    expect(SCRAMBLE_GLYPHS).not.toMatch(/[[\]]/)
  })
})
