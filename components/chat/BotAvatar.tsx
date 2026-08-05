/**
 * The bot's face. One mark, used at two sizes: large in the launcher, small beside every
 * reply it gives — so the thing you tap to open the chat is visibly the thing that answers.
 *
 * Drawn rather than imported: `simple-icons` carries brand logos, not characters, and a
 * generic speech bubble would make this look like every support widget on the internet.
 * Strokes use `currentColor` so the parent decides the colour and both themes come free.
 *
 * `blink` opts into the eye animation, which is driven by the PARENT's `group-hover` /
 * `group-focus-visible`. Only the launcher passes it — a face that winks every time you
 * mouse over a paragraph of text would be a nuisance rather than a charm.
 */
export default function BotAvatar({
  className = '',
  blink = false,
}: {
  className?: string
  blink?: boolean
}) {
  // `transform-box: fill-box` is what makes `origin-center` mean the centre of the eye
  // rather than the centre of the whole SVG — without it the eyes slide off the face
  // instead of closing.
  const eye = blink
    ? 'origin-center [transform-box:fill-box] transition-transform duration-150 ease-out group-hover:scale-y-[0.15] group-focus-visible:scale-y-[0.15]'
    : ''

  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none">
      {/* Antenna. Bobs on hover so the whole face reads as alive rather than as an icon. */}
      <path
        d="M12 3.6V5.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        className={
          blink
            ? 'transition-transform duration-200 group-hover:-translate-y-[1px] group-focus-visible:-translate-y-[1px]'
            : ''
        }
      />
      <circle
        cx="12"
        cy="2.5"
        r="1.35"
        fill="currentColor"
        className={
          blink
            ? 'transition-transform duration-200 group-hover:-translate-y-[1px] group-focus-visible:-translate-y-[1px]'
            : ''
        }
      />

      {/* Head. The generous 4.5 corner radius is what makes it read as friendly. */}
      <rect x="3.5" y="5.6" width="17" height="12.9" rx="4.5" stroke="currentColor" strokeWidth="1.6" />

      {/* Ears */}
      <path d="M1.6 10.8v2.6M22.4 10.8v2.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />

      {/* Eyes */}
      <circle cx="9" cy="11.4" r="1.55" fill="currentColor" className={eye} />
      <circle cx="15" cy="11.4" r="1.55" fill="currentColor" className={eye} />

      {/* Smile */}
      <path
        d="M9.4 14.9c.75.65 1.6.97 2.6.97s1.85-.32 2.6-.97"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
