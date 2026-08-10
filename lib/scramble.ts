/**
 * Text decode effect for section headings.
 *
 * The site's intro is a terminal that types itself, but that vocabulary stopped
 * at the overlay: every heading below it merely faded up, which is the same
 * reveal every portfolio has. Headings now RESOLVE out of noise instead, so the
 * whole page reads as one shell session printing rather than a document fading.
 *
 * Kept as a pure frame function rather than a hook so the resolve-to-exact-text
 * invariant is testable without a DOM or a clock. A drifting frame function
 * would leave a heading permanently misspelled, which no visual test catches.
 */

/**
 * Deliberately excludes `[` and `]`. Several component tests assert no bracketed
 * placeholder copy renders, and a mid-flight frame containing one would make a
 * real content guard fail intermittently on timing alone.
 */
export const SCRAMBLE_GLYPHS = '!<>-_/\\|=+*^?#$%&'

/**
 * One frame of the decode, left to right.
 *
 * Characters before the reveal head are final. Everything after is noise, so the
 * heading holds its exact width for the whole animation and never reflows the
 * section below it. Real spaces are preserved so word shape stays readable while
 * the letters are still resolving.
 *
 * @param progress 0 is full noise, 1 is the exact input text. Clamped.
 * @param rand Injectable for deterministic tests.
 */
export function scrambleFrame(text: string, progress: number, rand: () => number = Math.random) {
  const clamped = Math.min(Math.max(progress, 0), 1)
  const revealed = Math.floor(clamped * text.length)

  let out = ''
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (i < revealed || char === ' ') {
      out += char
      continue
    }
    out += SCRAMBLE_GLYPHS[Math.floor(rand() * SCRAMBLE_GLYPHS.length)]
  }
  return out
}
