/**
 * Composite Tailwind class strings that more than one surface needs verbatim.
 *
 * This is NOT a design-token layer — individual colours stay as inline arbitrary
 * values (`text-[#B5772E]`) everywhere, which is the house style. What lives here
 * is only a treatment that is repeated whole and must not drift: the last palette
 * rename had to be applied by hand to five separate copies of the same string.
 */

/** Page shell. Every route's <main> is the same column at the same rhythm. */
export const PAGE_MAIN = 'flex-1 max-w-5xl mx-auto w-full px-[18px] py-16 sm:py-24'

/** The <h1> that names a route. */
export const PAGE_HEADING = 'font-mono text-2xl font-bold text-[#2B2A26] dark:text-[#EDEFF2]'

/**
 * The <h2> that opens a section within a page. Home-page sections append their own
 * `opacity-0 translate-y-2` reveal baseline; it is not part of the heading itself.
 */
export const SECTION_HEADING =
  'font-mono text-xl sm:text-2xl font-normal text-[#2B2A26] dark:text-[#EDEFF2]'

/** Sunken card/panel: a hairline border over a faint inset fill. */
export const SURFACE =
  'border border-[#DFD7C8] dark:border-[#2A2F38] bg-black/[0.035] dark:bg-black/20'

/** SURFACE for something clickable — the border warms to the accent on hover. */
export const SURFACE_INTERACTIVE = `${SURFACE} transition-colors hover:border-[#B5772E] dark:hover:border-[#D9A441]`

/**
 * Inline accent link. The underline is present but transparent at rest so it can
 * colour in on hover without shifting the text (see AGENTS.md on reserved space).
 */
export const ACCENT_LINK =
  'text-[#B5772E] dark:text-[#D9A441] underline underline-offset-2 decoration-transparent hover:decoration-current focus-visible:decoration-current transition-colors'

/** Outlined accent button that fills in on hover/focus. */
export const ACCENT_BUTTON =
  'inline-flex items-center gap-[6px] font-mono text-xs border border-[#B5772E] dark:border-[#D9A441] text-[#B5772E] dark:text-[#D9A441] px-3 py-2 rounded-[5px] transition-colors duration-200 hover:bg-[#B5772E] dark:hover:bg-[#D9A441] hover:text-[#F1EBE0] dark:hover:text-[#14171C] focus-visible:bg-[#B5772E] dark:focus-visible:bg-[#D9A441] focus-visible:text-[#F1EBE0] dark:focus-visible:text-[#14171C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B5772E] dark:focus-visible:outline-[#D9A441] cursor-pointer'
