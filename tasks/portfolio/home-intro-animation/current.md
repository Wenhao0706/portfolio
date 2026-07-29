<!--LLM-CONTEXT
Status: ✅ Complete — slash/terminal intro, hero choreography, and scroll-triggered section reveals all working; content reveal now first-visit-only
Domain: portfolio
Gotchas (critical — full list in ## Critical Gotchas below):
  - NEVER add a `prefers-reduced-motion` guard anywhere on this site — the owner runs reduced motion at OS level, so a guard silently disables every animation
  - Anything hidden on only SOME loads needs its hidden state in the markup, not just in `useEffect` — otherwise it flashes on every load (Bugs B4, B5)
  - Child effects run before parent effects, so a flag a child writes cannot be read by the parent's effect — pass it on the event (Bugs B6)
  - Text split into individual `inline-block` letter spans wraps mid-word unless grouped by word — see `TypedWords` helper
Related: tasks/portfolio/content-pages/current.md, tasks/portfolio/header-redesign/current.md, tasks/portfolio/site-chrome/current.md
Last updated: 2026-07-30
-->

# Portfolio — Home Intro Animation Summary

## Quick Start (read this first in next session)

**Where we are**: Live on `/`. `components/HomeIntro.tsx` covers the screen with a diagonal "slash" split (two `clip-path` triangles), optionally preceded by a typed terminal boot sequence. When the slash starts opening it dispatches `home-intro-opening`; `app/page.tsx` listens and runs the hero reveal (photo bounce-drop → letter-typed name/tagline → CTA fade-up). Sections BELOW the fold no longer ride that timeline — they have their own GSAP ScrollTrigger reveals, built only after the hero finishes.

Two things are now first-visit-only per browser session: the terminal (always was) and the whole content reveal (new). The slash still replays on every visit.

**Immediate next actions (in order)**:
1. None pending — treat as done. Only revisit if the user asks for further animation tuning.

**Key facts for cold start**:
- `app/page.tsx` is `'use client'` and holds the GSAP refs, the hero timeline, and the ScrollTrigger builders, all inside one `gsap.context()`.
- `HomeIntro` and the reveal share no props — only the `home-intro-opening` `CustomEvent`, which now carries `detail.firstVisit`.
- ScrollTrigger ships inside the `gsap` package (free since 3.12); import from `gsap/ScrollTrigger`, nothing to install.
- To see the full first-visit sequence, open a private window. `sessionStorage` is per-tab, so a refresh in the same tab gets the fast path.

**Gotchas that will trip you**:
- Never add a `prefers-reduced-motion` guard — see Critical Gotchas, this silently kills every animation for the owner.
- Sections start at `opacity-0`, so any break in the intro → hero → ScrollTrigger chain leaves a blank page rather than an unanimated one. A 4s fallback timer exists for exactly this.
- A stale Turbopack dev cache can serve old JS/CSS after edits even past a server restart — compare the served asset's `Last-Modified` against the source mtime; if older, delete `.next/cache` and restart.

---

## Overview

A page-load animation for the home route only (first load, refresh, or client-side navigation back to `/`): a "slash" wipe reveal, with a one-time terminal-boot moment on a visitor's first session-visit, synced to a full choreographed reveal of the hero content and page sections below it. Built iteratively over many rounds of direct feedback on timing, easing, direction, and color — this doc records the settled result, not the intermediate attempts (see `## Last Session` for the session narrative).

---

## Files

**Frontend**
- `components/HomeIntro.tsx` — NEW. Full-screen overlay: diagonal slash reveal (GSAP, corner-to-corner `clip-path` triangles, `sine.out` ease) + optional first-session terminal boot sequence (GSAP `TextPlugin`). Dispatches `home-intro-opening` the instant the slash starts moving.
- `app/page.tsx` — Converted to `'use client'`. Hero choreography (photo bounce-drop, letter-typed name/tagline via `TypedWords`, CTA fade-up) off the `home-intro-opening` event, plus the ScrollTrigger builders for the three below-fold sections. All inside one `gsap.context()` so every trigger and listener is reverted on unmount. `REVEAL_START` (`'top 85%'`) is the single tuning knob.
- `app/globals.css` — Removed the `home-intro-overlay` entry from the `prefers-reduced-motion` block (kept `animate-float`'s, which is unrelated/pre-existing).
- `app/icon.svg` — NEW. Dark rounded-square favicon with amber "MH" monogram, replacing the default Next.js `favicon.ico` (deleted).
- `public/resume.pdf` — NEW. Real CV file; fixes `ResumeDownload.tsx`'s previously-404ing link (tracked as missing in `tasks/portfolio/header-redesign/current.md`).

---

## Task Status

| # | Task | Status |
|---|------|--------|
| 1 | Diagonal slash overlay (corner-to-corner triangles), replaces earlier plain hover-straighten photo tilt | ✅ |
| 2 | Terminal boot sequence (GSAP TextPlugin typing), gated to first-session-only via `sessionStorage` | ✅ |
| 3 | Sync hero content reveal to the slash via a `window` CustomEvent | ✅ |
| 4 | Hero reveal choreography: photo bounce-drop → letter-typed name/tagline → staggered CTA/cards/closing fade-up | ✅ |
| 5 | Fix long-text mid-word wrapping bug (`TypedWords` word-grouping) | ✅ |
| 6 | Tagline copy: two rewrites (thank-you + night-work merge, then de-AI-ified phrasing) | ✅ |
| 7 | Browser tab title changed to "Man Hou - Web Developer" | ✅ |
| 8 | Favicon (`app/icon.svg`, amber "MH" monogram) | ✅ |
| 9 | `public/resume.pdf` added, hero CTA changed from "View projects" to "Download resume" | ✅ |
| 10 | Tasks 1–9 built and reviewed | ✅ |
| 11 | Below-fold sections moved off the intro timeline onto GSAP ScrollTrigger, built after the hero completes | ✅ |
| 12 | Content reveal gated to first-session-only; two intro bugs fixed (B5, B6) | ✅ |

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Sync `HomeIntro` and the hero reveal via a `window` CustomEvent, not props/context | The two components have no natural parent-child data link; a global event lets the reveal timeline start at the exact moment the slash begins opening, regardless of which HomeIntro branch (terminal vs slash-only) ran |
| Diagonal top-left-to-bottom-right slash (corner-to-corner triangles), not a vertical curtain split | User explicitly wanted a directional "slash," not a plain wipe |
| Terminal boot sequence gated to first-session-only (`sessionStorage`), slash always replays on every `/` visit | User found the terminal charming once but "not good UX" to retype on every repeat visit home; the slash-only reveal stays fast on repeats |
| Overlay panel color uses the site's existing border tone (`#D8D3C6`/`#2A2F38`), not the raw page background color | Matching the background exactly made the slide invisible except where it crossed actual text/photo pixels — the border tone stays in-palette but is visibly distinct from the page |
| Photo drops and bounces to rest first, then hero text starts typing (not simultaneously) | A photo is a stronger visual hook than text; sequencing avoids two competing animations fighting for attention mid-motion |
| Single continuous `sine.out` ease for the slash's opening motion, seam disappears instantly (`.set`, not a fade) when the slide starts | Landed on this after trying a two-beat "crack + sweep" version that read as an unwanted mid-animation jump — the seam is a static mark, not something that travels with the panels, so it should vanish the instant motion starts rather than linger or fade separately |
| Content reveal (hero + below-fold sections) gated to first-session-only; the slash still replays every visit | The letter-by-letter hero reveal runs several seconds. Charming once, a wait on every repeat visit. The slash is fast enough to keep as the constant |
| `firstVisit` travels on the `home-intro-opening` event rather than being re-read from `sessionStorage` by the listener | `HomeIntro` is a CHILD of the home page, and child effects run before parent effects — its write always precedes any read the parent could make, so a listener re-reading storage would see "seen" on a genuine first visit |
| Scroll reveals are built in the hero timeline's `onComplete`, not at mount, with a 4s `setTimeout` fallback | A trigger created at mount for a section near the fold satisfies `top 85%` immediately and fires behind the still-covering overlay. Deferring also lets ScrollTrigger measure a settled layout. The fallback exists because sections start at `opacity-0`, so a broken chain means a blank page, not just a missing animation |

---

## Critical Gotchas

### Frontend
| Issue | Rule |
|-------|------|
| Text split into individual `inline-block` letter spans wraps mid-word on narrow viewports | Group letters per-word inside a `whitespace-nowrap` wrapper first (see `TypedWords` in `app/page.tsx`) — adjacent inline-block spans have an implicit break opportunity even with no whitespace between them |
| Full-viewport `clip-path` element animated via `transform` looks janky/stutters | Not composited onto its own GPU layer by default — set `willChange: 'transform'` and `backfaceVisibility: 'hidden'` on the element before animating |
| Turbopack dev server can serve a stale cached build after source edits, even past a restart | Compare the served asset's `Last-Modified` header against the source file's mtime; if it predates the edit, delete `.next/cache` (or all of `.next`) and restart — HMR alone isn't always enough |
| A `prefers-reduced-motion` guard anywhere on this site — added once this session and it silently disabled every reveal | The owner runs reduced motion at OS level, so the guard's branch is the one that executes: everything snaps to its end state, nothing errors, and the page just looks unanimated. Rule now covers the whole site, not only the header — see AGENTS.md `## React & Animation` |

---

## Bugs Fixed

| ID | Severity | Issue | Fix |
|----|----------|-------|-----|
| B1 | Medium | Overlay panel background color exactly matched the page's own background color, making the slide invisible except where it crossed text/image pixels | Changed panel color to the site's existing border tone (`#D8D3C6`/`#2A2F38`) — same palette, visibly distinct from the raw background |
| B2 | Low | Stale Turbopack dev cache served old CSS/JS after several edits, even past a dev server restart | Deleted `.next/cache`, restarted dev server |
| B3 | Low | Tagline text wrapped mid-word on narrow viewports (e.g. "devel"/"oper" split across lines) | Grouped per-letter spans by word inside a `whitespace-nowrap` wrapper (`TypedWords` helper) instead of leaving every letter independently breakable |
| B4 | Medium | Seam `<div>` had no initial opacity class, so it rendered fully visible from mount — GSAP only touches its opacity once the timeline reaches that step, well after the terminal finishes typing on a first-visit load | Added `opacity-0` as the baseline class |
| B5 | Medium | Same defect as B4, on the terminal: it had no `opacity-0` baseline, so it flashed on EVERY load before `useEffect` hid it. Looked like the `sessionStorage` gate was broken; the gate was fine all along | Added `opacity-0` to the markup; the effect now sets `opacity: 1` on the visit that plays it |
| B6 | Medium | The `sessionStorage` gate read-then-wrote on every effect run. React StrictMode double-invokes effects in dev, so the second pass read back the flag the first pass had just written and skipped the terminal on a genuine first visit | Decide once into a `useRef`, which survives the double-invoke because it is the same component instance |

---

## Last Session

- Moved below-fold sections off the intro timeline onto their own ScrollTrigger reveals, built after the hero completes so they cannot fire behind the overlay.
- Gated the whole content reveal to first-session-only, passing `firstVisit` on the existing event.
- Fixed B5 and B6, both of which made the terminal appear at the wrong times while `sessionStorage` was working correctly.
- Briefly added a `prefers-reduced-motion` guard to the new reveals, which disabled all animation for the owner. Removed; the rule is now site-wide in AGENTS.md.

---

## Next Steps

- [ ] None pending — revisit only if the user asks for further animation iteration
