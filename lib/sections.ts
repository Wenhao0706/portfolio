/**
 * The page's navigable sections, in document order.
 *
 * ONE list, read by the desktop tabs, the mobile menu, the scroll spy and the
 * footer. Four surfaces naming the same sections is four chances to disagree, and
 * a footer offering a link the header does not is the kind of drift nobody
 * notices until a section is renamed.
 *
 * Document order matters: the scroll spy picks the topmost intersecting section,
 * so a list out of order would highlight the wrong tab on the way down.
 *
 * Plain module with no 'use client', so the server-rendered footer can import it
 * without pulling a client boundary along with it.
 */
export type NavSection = { id: string; label: string }

export const NAV_SECTIONS: NavSection[] = [
  { id: 'terminal', label: 'Terminal' },
  { id: 'about', label: 'About' },
  { id: 'projects', label: 'Projects' },
  { id: 'contact', label: 'Contact' },
]
