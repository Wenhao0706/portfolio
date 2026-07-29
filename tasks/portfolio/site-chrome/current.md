<!--LLM-CONTEXT
Status: 🚀 Built and verified locally — background, tech stack, footer and scroll-to-top all working; shipping to production this session
Domain: portfolio
Gotchas (critical — full list in ## Critical Gotchas below):
  - Absolutely positioned decoration extends the document's SCROLL area even though it adds no height — parking one past the content invents dead space
  - `StackField`'s COLUMN_WIDTH must be changed in lockstep with the page container width in `lib/ui.ts`, or the gutter maths silently misplaces every logo
  - Several `simple-icons` brand colours are near-black and vanish in dark mode; C# and LinkedIn have no icon at all
Related: tasks/portfolio/content-pages/current.md, tasks/portfolio/home-intro-animation/current.md, tasks/portfolio/contact-form/current.md, tasks/portfolio/header-redesign/current.md
Last updated: 2026-07-30
-->

# Portfolio — Site Chrome (Background, Tech Stack, Footer) Summary

## Quick Start (read this first in next session)

**Where we are**: The visual shell around the page content. A site-wide `Backdrop` of blurred colour blobs sits behind every route, the light base colour moved from `#F7F4EE` to a deeper `#F1EBE0`, and cards gained a sunken fill. The home page adds a `StackField` of faded tech logos in its side gutters and a tabbed `TechStack` section. Every route now carries a `Footer` and a fixed `ScrollToTop`.

All of it originated from one complaint: light mode looked empty. Depth came from three things together — a deeper base, the blob wash, and giving cards an actual fill instead of only a border.

**Immediate next actions (in order)**:
1. Decide the tech-stack default tab (see Next Steps) — it currently shows 3 of 14 technologies to a non-clicking reader.
2. Supply a LinkedIn URL so the footer's Contacts column can be completed.

**Key facts for cold start**:
- `lib/ui.ts` holds the shared composite class strings (`PAGE_MAIN`, `SURFACE`, `ACCENT_LINK`…). It is deliberately NOT a palette-token layer — individual hexes stay inline.
- `lib/site.ts` holds contact constants shared by the footer and `/contact`.
- Icon path data comes from `simple-icons` (CC0). Named imports tree-shake.
- `npx vitest run` 87/87, `npm run build` and `tsc --noEmit` clean.

**Gotchas that will trip you**:
- Changing the page width means changing `StackField`'s `COLUMN_WIDTH` too — nothing enforces the link.
- `html { overflow-x: clip }` in `globals.css` is load-bearing for the gutter logos; `hidden` would break `position: sticky` on the header.

---

## Overview

Everything framing the content: page background, decorative layers, the tech-stack section, the footer, and the scroll-to-top. Split out from `content-pages` (which owns copy) and `home-intro-animation` (which owns the load sequence) because none of this is either.

---

## Files

**Frontend**
- `components/Backdrop.tsx` — Three blurred colour blobs, `fixed`, behind all content on every route. Rendered from `app/layout.tsx`.
- `components/StackField.tsx` — Home-only decorative tech logos in the page gutters. `absolute` so they scroll with the page, px offsets, gutter depth as a fraction of available gutter, hidden below `xl`.
- `components/TechStack.tsx` — "What I work with": a roving-focus tablist over four category card grids. Entries mirror the real `stack` arrays in `lib/projects.ts` plus this site's own four.
- `components/Footer.tsx` — Identity, Links, Projects (from `lib/projects.ts`), Contacts. Flex row, not a grid — see Decisions.
- `components/ScrollToTop.tsx` — Fixed bottom-right, fades in past 8px of scroll, kept mounted so the fade has something to animate.
- `lib/ui.ts` — Shared composite Tailwind class strings.
- `lib/site.ts` — Shared contact constants (see `tasks/portfolio/contact-form/current.md`).
- `app/globals.css` — Light base `#F1EBE0`, plus `html { overflow-x: clip }`.
- `app/layout.tsx` — Mounts `Backdrop`, `Footer`, `ScrollToTop` around `{children}`.

---

## Task Status

| # | Task | Status |
|---|------|--------|
| 1 | Background treatment chosen from a scratch comparison lab, then applied: blobs + Sand base + sunken cards | ✅ |
| 2 | `StackField` gutter logos, anchored to the content column so they cannot overlap text | ✅ |
| 3 | `TechStack` tabbed category grid, with dark-mode colour substitutes | ✅ |
| 4 | Site-wide footer + fixed scroll-to-top | ✅ |
| 5 | Page containers standardised to 1024px; `lib/ui.ts` extracted | ✅ |
| 6 | Scratch comparison route (`app/bg-lab/`) deleted after the direction was chosen | ✅ |
| 7 | Tech-stack default tab — reader sees 3 of 14 technologies without clicking | ⬜ Awaiting user decision |
| 8 | LinkedIn link in the footer | ⏸️ Blocked — no URL supplied, and `simple-icons` has no icon |

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Light-mode emptiness fixed with three changes together (deeper base, blob wash, sunken card fill), not one | Dark mode reads as deep for free because any surface lighter than a dark page looks raised. In light mode the cards had no fill at all, only borders, so nothing layered. The base colour alone was never the whole problem |
| `StackField` anchors logos to the CONTENT COLUMN (`50% ± COLUMN_HALF`) rather than to viewport percentages | A percentage that clears the text on a wide monitor lands on top of it on a narrower one. Anchoring makes overlap geometrically impossible instead of merely unlikely |
| `StackField` uses px `top` offsets, never `%` | A percentage resolves against main's height, so anything that grows the page — switching to a tech-stack tab with more rows — re-resolves every offset and slides all ten logos at once |
| Footer columns are a flex row sized to content, not equal grid columns | A grid gives equal gaps between column EDGES; the gutter a reader sees is between the last character of one column and the first of the next. Long project titles filled their cell while short nav links left theirs empty, so identical grid gaps looked wildly unequal |
| Scroll-to-top is fixed bottom-right rather than sitting inside the footer | Reaching it should not require scrolling to the bottom first. It renders from `app/layout.tsx`, not from `Footer` |
| The footer is left at its natural position rather than being pushed below one full viewport | The standard sticky-footer pattern already prevents it floating mid-screen. Padding a page to hide the footer makes readers scroll through emptiness, and NN/G finds below-fold engagement is stronger than assumed. The short pages are short because About is unwritten, which is a content problem |
| `lib/ui.ts` extracts composite class strings but deliberately NOT individual palette hexes | The base-colour rename had to be hand-applied to five copies of the same 400-character string, which is the case for extracting. A `MUTED` token for a colour pair that always sits in a different composite would start a design-token layer this project does not have |

---

## Critical Gotchas

### Frontend
| Issue | Rule |
|-------|------|
| Dead scrollable space below the last section | An absolutely positioned element adds nothing to its parent's height but still extends the document's SCROLL area, so decoration parked past the content invents scroll depth — and at 6% opacity it is invisible while doing it. Clip the field to its container (`inset-y-0` + `overflow-hidden`) rather than trusting offsets to stay in range |
| Page width and `StackField` disagree | `COLUMN_WIDTH` in `StackField.tsx` must equal the container width in `lib/ui.ts`'s `PAGE_MAIN`. Nothing enforces it; a mismatch drives the gutter maths negative and pulls logos onto the text (the `max(…, 0px)` clamp is what stops that becoming an overlap) |
| A brand logo is invisible in dark mode, or has no icon at all | `simple-icons` stores true brand values and several are near-black (Next.js `#000000`, Angular `#0F0F11`). Give those a `darkHex`. C# and LinkedIn were removed over trademark — render a text glyph or plain label, never a lookalike from another brand |
| `overflow-x: clip` on `<html>`, not `hidden` | The gutter logos can land past the viewport edge. `hidden` would make `<html>` a scroll container and break the header's `position: sticky`; `clip` suppresses the scrollbar without that side effect |
| A tab panel that remounts loses its GSAP reveal | `TechStack`'s panel wrapper is a persistent node whose contents swap. The home page tweens `[data-reveal="tech"] > *` to `opacity: 1` via inline styles, so a wrapper that remounted would return without them and render invisible |

---

## Bugs Fixed

| ID | Severity | Issue | Fix |
|----|----------|-------|-----|
| B1 | Medium | A horizontal scrollbar appeared site-wide. `StackField` spanned `w-screen`, and `100vw` includes the scrollbar width, so a centred full-width element always overhangs | Removed `w-screen` in favour of content-column anchoring, and added `html { overflow-x: clip }` as a second layer |
| B2 | Medium | Roughly a viewport of empty scrollable space below "Let's talk". Logo offsets had been tuned when the tech section was `min-h-screen`; removing that shortened the page and left the bottom logos hanging past the content | Retuned offsets into the real content height and added a clipping wrapper so it cannot recur |
| B3 | Low | The footer avatar ignored its `h-14 w-14` classes and rendered at the wrong size | `style={{ width: 'auto', height: 'auto' }}` — correct for responsive images — outranks sizing classes on a fixed-size one. Switched to `fill` inside a sized `relative` wrapper |

---

## Last Session

- Built the whole of this doc's scope in one pass, driven by "light mode looks too empty".
- Chose the background direction from a scratch `/bg-lab` route with live toggles, then deleted it.
- Two layout bugs (B1, B2) were both caused by decoration escaping its intended box, and both were fixed structurally rather than by retuning numbers.
- Product review raised two open questions, now in Next Steps.

---

## Next Steps

**Awaiting a user decision**
- [ ] Tech-stack default tab. The tablist opens on "Languages", which holds 3 of 14 technologies, so a recruiter who does not click sees a 3-item stack — and the hidden groups are exactly the ones (WordPress, the frontend set) that support the junior-full-stack positioning. Either default to Frontend or render all four groups stacked
- [ ] LinkedIn link in the footer. Absent only because `simple-icons` dropped the icon over trademark, not as a content decision. Needs a URL plus a plain-text or inline-SVG link

**Polish**
- [ ] `app/projects/page.tsx` tech chips still use `border-[#D8D3C6]` while every other surface moved to `#DFD7C8`. Either a deliberate lighter chip border or a spot missed in the palette pass — confirm which
