<!--LLM-CONTEXT
Status: 🔨 In Progress — header shell + interaction polish done, content-page skeleton scaffolded (see content-pages doc), spring-animation design pending approval
Domain: portfolio
Gotchas (critical — full list in ## Critical Gotchas below):
  - suppressHydrationWarning on <html> is intentional — do not remove
  - GSAP tweens must be tracked in a ref and killed before restarting (both enter AND leave handlers)
  - Header animations do NOT guard prefers-reduced-motion by design (user override) — do not re-add the guard
Related: tasks/portfolio/content-pages/current.md
Last updated: 2026-07-15
-->

# Portfolio — Header Redesign Summary

## Quick Start (read this first in next session)

**Where we are**: The IDE/terminal-styled header (logo, nav tabs, theme toggle, resume CTA) is built and polished. Content pages (`/about`, `/projects`, `/contact`) are now scaffolded with placeholder copy — see `tasks/portfolio/content-pages/current.md`. A spring-motion animation upgrade (referencing joshwcomeau.com's interaction craft) was designed in conversation but never approved/built.

**Immediate next actions (in order)**:
1. Resume the spring-motion design conversation: confirm scope (shared `components/motion/spring.ts` ease constant, animated sliding indicator bar in `NavTabs.tsx`, retuned `ThemeToggle.tsx` icon-swap easing) before writing any code — nothing was implemented yet.
2. Add `public/resume.pdf` — `ResumeDownload.tsx` links to it but the file still doesn't exist in `public/`; clicking the CTA currently 404s.
3. Fill in real content-page copy — see `tasks/portfolio/content-pages/current.md` Next Steps.

**Key facts for cold start**:
- All header work is uncommitted.
- `npx tsc --noEmit` and `npx vitest run` both currently pass (5/5 tests across 3 files).
- Project agents under `.claude/agents/` (Explore, Plan, code-reviewer, code-simplifier, product-reviewer, claude-md-pruner) are now loadable as `subagent_type`s and were used this session.

**Gotchas that will trip you**:
- A component that splits text into per-character `<span>`s (`AnimatedName.tsx`, `NavTabs.tsx`) breaks Testing Library's `getByText` — match by `getByRole` + accessible name instead.
- The site has exactly one accent color (amber `#B5772E`/`#D9A441`) by design — don't introduce a second one.
- Header hover animations deliberately do NOT guard `prefers-reduced-motion` — user explicitly asked for animations to always play regardless of OS setting. Don't reintroduce the guard without asking first.

---

## Overview

Redesigning the portfolio site's header from a generic IDE-mockup (title bar, `.tsx` nav labels, plain text theme toggle) into a polished, single-accent-color, terminal-styled header with an animated identity (GSAP letter-wave hover on the name) and an icon-based theme toggle. Purpose: the whole site exists to give recruiters/clients a strong first impression (per user's stated goal and this session's research into what makes developer portfolios convert) — the header is the first thing any visitor sees.

---

## Files

**Frontend**
- `components/header/Header.tsx` — header shell (logo slot, nav tabs, theme toggle, resume CTA); no more title bar row, `rounded-b-lg` corners only
- `components/header/AnimatedName.tsx` — NEW. Client component, GSAP letter-wave hover animation on "Yoon Man Hou", links home
- `components/header/NavTabs.tsx` — nav tab links (`about`/`projects`/`contact`), active-state amber underline via `usePathname()`
- `components/header/ThemeToggle.tsx` — sun/moon SVG icon swap (CSS transition-based, `500ms` custom-eased crossfade), 3D button treatment (gradient bg, layered box-shadow, active-press), `aria-label={Theme: ${theme}}` kept for test compatibility
- `components/header/ResumeDownload.tsx` — NEW. Client component replacing the old inline `$ resume --download` link; reads "resume" with a download-arrow icon that does a single GSAP tap-bounce on hover/focus (reduced-motion guarded)
- `app/layout.tsx` — root layout; `suppressHydrationWarning` on `<html>` guards the no-flash theme script
- `app/page.tsx` — leftover create-next-app boilerplate homepage; two `<Image>` tags patched with `style={{width:'auto',height:'auto'}}` to fix a Tailwind-Preflight-vs-next/image aspect-ratio warning
- `components/header/__tests__/Header.test.tsx`, `components/header/__tests__/NavTabs.test.tsx` — updated/existing coverage

---

## Task Status

| # | Task | Status |
|---|------|--------|
| 1 | Remove title bar row, keep tab bar | ✅ |
| 2 | Rename logo "wenhao" → "Yoon Man Hou" | ✅ |
| 3 | Make logo clickable → home | ✅ |
| 4 | Remove `.tsx` suffix from nav labels | ✅ |
| 5 | Square off top corners (`rounded-b-lg`) | ✅ |
| 6 | Theme toggle: text label → animated sun/moon icon | ✅ |
| 7 | Name hover: GSAP letter-wave animation (iterated through several approaches before landing on current one) | ✅ |
| 8 | Fix `<html>` hydration-mismatch console warning | ✅ |
| 9 | GitNexus + project agents (`.claude/agents/*`) scaffolded | ✅ |
| 10 | Spring-motion design (shared ease token + sliding nav indicator + retuned toggle easing) — referencing joshwcomeau.com | 📋 Designed in conversation, not approved/built |
| 11 | `/about`, `/projects`, `/contact` pages | ✅ Scaffolded with placeholder copy — see `tasks/portfolio/content-pages/current.md` |
| 12 | Add `public/resume.pdf` | ⬜ Still missing — CTA 404s |
| 13 | Theme toggle: slower/smoother icon crossfade + 3D button treatment (gradient, layered shadow, press effect) | ✅ |
| 14 | Nav tabs: per-letter staggered hover color sweep + capitalized labels (About/Projects/Contact) | ✅ |
| 15 | Rebuild resume CTA (`ResumeDownload.tsx`): dropped `$ resume --download` wording, now "resume" + download-arrow icon with GSAP tap-bounce (iterated through fill-wipe → sparkle burst → glowing line sweep → dash-draw progress line before landing on arrow-only) | ✅ |
| 16 | Reduced-motion + keyboard-focus parity across all header hover animations | ✅ then reverted — user asked animations to always play; only keyboard-focus parity kept |
| 17 | Fix `app/page.tsx` `<Image>` aspect-ratio console warning | ✅ |
| 18 | Restore looping resume-bounce (`repeat: -1`) after earlier capping to a single bounce | ✅ |
| 19 | Permanently remove `prefers-reduced-motion` guards from `NavTabs`/`ThemeToggle`/`ResumeDownload` | ✅ |

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Single accent color (amber) across the whole header | A prior teal cursor accent was removed after being identified as an inconsistent second accent — one deliberate accent reads as more intentional |
| Hover-only underline/marker instead of an always-on border on the logo | An always-on `border-b-2` amber treatment on the logo duplicated the nav tabs' "active page" signal, confusing what "active" meant |
| GSAP (already a dependency) for the name hover animation, not CSS-only | Needed a continuous, staggered, direction-aware wave effect across individual letters — beyond what CSS transitions/keyframes handle cleanly per-letter |
| `suppressHydrationWarning` on `<html>`, not a code fix | The no-flash theme script's DOM mutation before hydration is an expected, unavoidable mismatch with this pattern (same approach used by `next-themes`) |
| Header hover animations always play, no `prefers-reduced-motion` guard | Added per product-review recommendation, then explicitly reversed by the user — animations should never be silently suppressed by an OS setting on this site |

---

## Critical Gotchas

### Frontend
| Issue | Rule |
|-------|------|
| GSAP tween race on rapid hover in/out | Every tween/timeline (including ones created inside a mouse-leave handler) must be stored in a ref and killed before the next one starts — an untracked reset tween can run concurrently with a newly started loop tween |
| Testing Library accessible-name whitespace stripping | A component that splits text into per-character `<span>`s (like `AnimatedName`, `NavTabs`) will have `getByText` fail to match — use `getByRole` + accessible name instead |
| `<html>` hydration mismatch | Expected from the `beforeInteractive` no-flash theme script; `suppressHydrationWarning` on `<html>` is the correct fix, not a bug |
| SVG `<filter>` (glow/blur) on a `<line>` renders nothing | Default `filterUnits="objectBoundingBox"` sizes the filter region as a % of the shape's own zero-height bbox, collapsing it to nothing — use `filterUnits="userSpaceOnUse"` with explicit absolute `x`/`y`/`width`/`height` instead |
| Next.js `<Image>` aspect-ratio warning persists after setting `style={{height:'auto'}}` alone | Tailwind Preflight's `img{height:auto}` already overrides `height`; a fixed `width` px in the same `style` reproduces the one-axis-overridden mismatch — set **both** `width:'auto'` and `height:'auto'` |

---

## Bugs Fixed

| ID | Severity | Issue | Fix |
|----|----------|-------|-----|
| B1 | Medium | GSAP reset tween in `AnimatedName.tsx`'s `handleLeave` wasn't tracked in `tweenRef`, allowing it to run concurrently with a newly triggered loop tween on rapid re-hover | Store the reset tween in `tweenRef` the same way the enter tween is stored |
| B2 | Low | `<html>` hydration-mismatch console warning from the no-flash theme script | Added `suppressHydrationWarning` to `<html>` in `app/layout.tsx` |
| B3 | Medium | `NavTabs.tsx`'s per-letter hover rewrite accidentally dropped the `.tsx` suffix span; user later decided to remove it for good instead of restoring it | Removed the `.tsx` span entirely; updated stale `NavTabs.test.tsx` title that still referenced it |
| B4 | Low | `ResumeDownload.tsx`'s glow `<filter>` was invisible — `filterUnits="objectBoundingBox"` collapsed to a zero-height region on the `<line>` | Switched to `filterUnits="userSpaceOnUse"` with explicit region (later removed entirely when the design changed to arrow-only) |
| B5 | Low | `app/page.tsx` `<Image>` aspect-ratio warning reproduced after first fix attempt (`height:'auto'` paired with a fixed `width` px) | Set both `width` and `height` to `'auto'` |

---

## Last Session

- Capitalized nav labels (`about`→`About` etc). User then reported the animations looked "gone" after `/done`'s review pass — root cause was the user's own OS `prefers-reduced-motion` setting suppressing the just-added guards, not lost work; confirmed via dev-server HTML fetch and a targeted question before diagnosing.
- Per explicit user request, removed the `prefers-reduced-motion` guards entirely from `NavTabs`/`ThemeToggle`/`ResumeDownload` (JS `matchMedia` check + Tailwind `motion-reduce:` classes) — animations now always play, reversing this session's earlier accessibility addition. Restored the resume-button bounce to looping (`gsap.timeline({repeat:-1})`) after it had been capped to a single bounce.
- Read the user-provided "Building an Effective Dev Portfolio" PDF (Josh Comeau) in full and used it to scaffold content pages — see `tasks/portfolio/content-pages/current.md` for that work.
- Fixed a structural template violation in this doc's own Critical Gotchas table (two rows had 3 pipe-separated columns under a 2-column header from an earlier pass).

---

## Next Steps

- [ ] Resume and approve the spring-motion design (shared ease token, sliding nav indicator, retuned theme-toggle easing), then implement
- [ ] Add `public/resume.pdf` — CTA currently 404s
- [ ] Commit the uncommitted header work
- [ ] Content-page copy is tracked separately — see `tasks/portfolio/content-pages/current.md` Next Steps
