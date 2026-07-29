/**
 * Home-page-only decoration: the stack scattered through the margins beside the content.
 *
 * Positioned `absolute`, not `fixed`, so the logos scroll away with the page
 * instead of following the viewport.
 *
 * Placement is anchored to the CONTENT COLUMN rather than to a percentage of the
 * viewport. The field spans main's box (capped at max-w-5xl, 1024px, and centred),
 * so `50%` here is the column centre. Every logo is pushed at least
 * COLUMN_HALF + MIN_CLEARANCE away from that centre, which makes overlapping the
 * text geometrically impossible at any width. Percentage placement cannot promise
 * that: the same `left: 46%` that clears the text on a wide monitor lands on top
 * of it on a narrower one.
 *
 * Depth into the gutter is then a FRACTION of the available gutter, not a fixed
 * px value, so the logos stay scattered at different distances instead of lining
 * up flush against the column edge. The gutter is `(100vw - COLUMN_WIDTH) / 2`.
 *
 * Hidden below `xl` because at 1024px the column now fills the viewport exactly,
 * leaving no gutter at all; xl (1280px) gives 128px a side to draw in.
 *
 * Icon path data comes from `simple-icons` (CC0). Rendered in the foreground
 * colour at very low opacity so it reads as texture rather than as branding.
 */
import {
  siAngular,
  siDotnet,
  siFlutter,
  siLaravel,
  siNextdotjs,
  siPhp,
  siReact,
  siTailwindcss,
  siTypescript,
  siWordpress,
} from 'simple-icons'

/** Must track app/page.tsx's container: max-w-5xl (1024px). */
const COLUMN_WIDTH = 1024
const COLUMN_HALF = COLUMN_WIDTH / 2
const MIN_CLEARANCE = 16
/** Stops a logo drifting arbitrarily far out on an ultrawide monitor. */
const MAX_DRIFT = 200

type Icon = { title: string; path: string }

type Placed = {
  icon: Icon
  side: 'left' | 'right'
  /** Absolute px from the top of main, NOT a percentage. See note above STACK. */
  top: number
  /** How deep into the gutter, as a fraction of gutter width. 0 hugs the column. */
  depth: number
  size: number
  delay: number
  duration: number
}

/**
 * `top` is in PX rather than `%` on purpose. A percentage resolves against the
 * height of main, so anything that grows the page — switching the tech-stack tab
 * to a category with more rows, an image loading late — re-resolves every
 * percentage and slides all ten logos at once. Fixed px offsets stay put.
 *
 * Keep the largest `top` comfortably INSIDE the real content height (~1500px at
 * this layout). An absolutely positioned box adds nothing to its parent's height
 * but still extends the document's SCROLLABLE area, so a logo parked past the end
 * of the content shows up as dead space below the last section. The clipping
 * wrapper in the component below is the belt to this braces.
 */
const STACK: Placed[] = [
  { icon: siPhp, side: 'left', top: 80, depth: 0.42, size: 78, delay: 0, duration: 7 },
  { icon: siWordpress, side: 'right', top: 210, depth: 0.06, size: 60, delay: 1.2, duration: 8 },
  { icon: siNextdotjs, side: 'right', top: 380, depth: 0.55, size: 46, delay: 3.4, duration: 8 },
  { icon: siLaravel, side: 'left', top: 520, depth: 0.02, size: 56, delay: 2.4, duration: 6.5 },
  { icon: siFlutter, side: 'right', top: 650, depth: 0.3, size: 52, delay: 0.6, duration: 7.5 },
  { icon: siAngular, side: 'left', top: 780, depth: 0.5, size: 66, delay: 3, duration: 8.5 },
  { icon: siTailwindcss, side: 'left', top: 900, depth: 0.1, size: 50, delay: 1.5, duration: 6.8 },
  { icon: siDotnet, side: 'right', top: 1030, depth: 0.48, size: 58, delay: 1.8, duration: 6 },
  { icon: siReact, side: 'left', top: 1160, depth: 0.26, size: 70, delay: 2.1, duration: 9 },
  { icon: siTypescript, side: 'right', top: 1290, depth: 0.14, size: 48, delay: 0.9, duration: 7 },
]

export default function StackField() {
  return (
    /* `inset-y-0` + `overflow-hidden` clips the field to main's real height, so a
       logo can never extend the document's scrollable area and produce dead space
       below the last section. `-left/-right` widen it past main's box by more than
       MAX_DRIFT + the largest icon, so the gutter logos still have room to draw;
       50% of a symmetrically widened box is still the column centre, which keeps
       the placement maths below unchanged. */
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 -left-[300px] -right-[300px] -z-10 hidden overflow-hidden xl:block"
    >
      {STACK.map(({ icon, side, top, depth, size, delay, duration }) => {
        /* max(...,0px) matters: below COLUMN_WIDTH the gutter term goes NEGATIVE,
           which would pull the logo back across the clearance and onto the text. */
        const drift = `min(max((100vw - ${COLUMN_WIDTH}px) / 2 * ${depth}, 0px), ${MAX_DRIFT}px)`
        const edge = `calc(50% + ${COLUMN_HALF + MIN_CLEARANCE}px + ${drift})`
        return (
          <svg
            key={icon.title}
            viewBox="0 0 24 24"
            className="animate-float absolute fill-[var(--foreground)] opacity-[0.06]"
            style={{
              top: `${top}px`,
              /* Anchor the OUTER edge so the icon grows away from the column, never into it. */
              ...(side === 'left' ? { right: edge } : { left: edge }),
              width: size,
              height: size,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          >
            <path d={icon.path} />
          </svg>
        )
      })}
    </div>
  )
}
