<!--LLM-CONTEXT
Status: ✅ Complete — slash/terminal load animation + full hero reveal choreography built and working; committed and merged to main this session
Domain: portfolio
Gotchas (critical — full list in ## Critical Gotchas below):
  - Text split into individual `inline-block` letter spans wraps mid-word unless grouped by word — see `TypedWords` helper
  - Full-viewport `clip-path` elements animated via `transform` need `willChange`/`backfaceVisibility` or they judder (not composited by default)
  - Do NOT add a `prefers-reduced-motion` guard anywhere in this flow — user extended the header's "always play" rule to the whole home-page load sequence
Related: tasks/portfolio/content-pages/current.md, tasks/portfolio/header-redesign/current.md
Last updated: 2026-07-21
-->

# Portfolio — Home Intro Animation Summary

## Quick Start (read this first in next session)

**Where we are**: Built a full home-page load sequence. `components/HomeIntro.tsx` covers the screen with a diagonal top-left-to-bottom-right "slash" split (two triangle panels via `clip-path`), optionally preceded by a typed Linux-terminal boot sequence (`guest@portfolio:~$ whoami` → `yoon_man_hou`, `./launch.sh` → `[ok] ready`) shown once per browser session on `/`. The moment the slash starts opening, it dispatches a `home-intro-opening` `window` event; `app/page.tsx` (now a client component) listens for it and runs the hero reveal: photo drops in with a bounce, then "hi, i'm" and the name type letter-by-letter, then the tagline types in, then CTA buttons/project cards/closing section fade up in sequence. Committed and merged to `main` this session.

**Immediate next actions (in order)**:
1. None pending — treat as done. Only revisit if the user asks for further animation tuning.

**Key facts for cold start**:
- `app/page.tsx` had to become `'use client'` (was a server component) to hold GSAP refs and the reveal timeline.
- The only link between `HomeIntro` and the hero reveal is a plain `window` `CustomEvent('home-intro-opening')` — they have no parent-child prop relationship.
- `npx next build` and `tsc --noEmit` both clean as of last session.

**Gotchas that will trip you**:
- Adjacent `inline-block` letter spans have an implicit line-break opportunity even with zero whitespace between them — long typed text will wrap mid-word unless letters are grouped per-word first.
- A stale Turbopack dev cache can serve old JS/CSS after edits even past a server restart — compare the served asset's `Last-Modified` header against the source file's mtime; if it predates your edit, delete `.next/cache` and restart.

---

## Overview

A page-load animation for the home route only (first load, refresh, or client-side navigation back to `/`): a "slash" wipe reveal, with a one-time terminal-boot moment on a visitor's first session-visit, synced to a full choreographed reveal of the hero content and page sections below it. Built iteratively over many rounds of direct feedback on timing, easing, direction, and color — this doc records the settled result, not the intermediate attempts (see `## Last Session` for the session narrative).

---

## Files

**Frontend**
- `components/HomeIntro.tsx` — NEW. Full-screen overlay: diagonal slash reveal (GSAP, corner-to-corner `clip-path` triangles, `sine.out` ease) + optional first-session terminal boot sequence (GSAP `TextPlugin`). Dispatches `home-intro-opening` the instant the slash starts moving.
- `app/page.tsx` — Converted to `'use client'`. Hero + page content reveal choreography (photo bounce-drop via `bounce.out`, letter-by-letter name/tagline typing through a new `TypedWords` helper, staggered fade-ups for CTA/project cards/closing section), triggered by the `home-intro-opening` event.
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
| 10 | Commit and merge to `main` | ✅ |

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

---

## Critical Gotchas

### Frontend
| Issue | Rule |
|-------|------|
| Text split into individual `inline-block` letter spans wraps mid-word on narrow viewports | Group letters per-word inside a `whitespace-nowrap` wrapper first (see `TypedWords` in `app/page.tsx`) — adjacent inline-block spans have an implicit break opportunity even with no whitespace between them |
| Full-viewport `clip-path` element animated via `transform` looks janky/stutters | Not composited onto its own GPU layer by default — set `willChange: 'transform'` and `backfaceVisibility: 'hidden'` on the element before animating |
| Turbopack dev server can serve a stale cached build after source edits, even past a restart | Compare the served asset's `Last-Modified` header against the source file's mtime; if it predates the edit, delete `.next/cache` (or all of `.next`) and restart — HMR alone isn't always enough |
| Do not add a `prefers-reduced-motion` guard to `HomeIntro` or the hero reveal | User explicitly extended the header's "animations always play" rule (AGENTS.md) to the whole home-page load sequence |

---

## Bugs Fixed

| ID | Severity | Issue | Fix |
|----|----------|-------|-----|
| B1 | Medium | Overlay panel background color exactly matched the page's own background color, making the slide invisible except where it crossed text/image pixels | Changed panel color to the site's existing border tone (`#D8D3C6`/`#2A2F38`) — same palette, visibly distinct from the raw background |
| B2 | Low | Stale Turbopack dev cache served old CSS/JS after several edits, even past a dev server restart | Deleted `.next/cache`, restarted dev server |
| B3 | Low | Tagline text wrapped mid-word on narrow viewports (e.g. "devel"/"oper" split across lines) | Grouped per-letter spans by word inside a `whitespace-nowrap` wrapper (`TypedWords` helper) instead of leaving every letter independently breakable |
| B4 | Medium | Seam `<div>` had no initial opacity class, so it rendered fully visible from mount — GSAP only touches its opacity once the timeline reaches that step, well after the terminal finishes typing on a first-visit load | Added `opacity-0` as the baseline class |

---

## Last Session

- Fixed a follow-up bug found after this doc's initial write: the seam div was visible from mount instead of hidden until GSAP reached that step (see Bugs B4). Committed and merged to `main`.

---

## Next Steps

- [ ] None pending — revisit only if the user asks for further animation iteration
