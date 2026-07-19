<!--LLM-CONTEXT
Status: 🔨 In Progress — homepage hero + all 3 project card titles/hooks are real content and live on main; About narrative, contact email, and per-project detail sections still bracketed
Domain: portfolio
Gotchas (critical — full list in ## Critical Gotchas below):
  - Next.js 16 dynamic route `params` is a Promise — must `await params`
  - lib/projects.ts is the single source of truth for all project content — don't duplicate project data inline on any page
  - Cutout-style PNGs need `drop-shadow` not `box-shadow`, and a Tailwind width class + style `{width:'auto',height:'auto'}` (not a fixed px style width) to avoid the Image aspect-ratio warning while still being resizable
Related: tasks/portfolio/header-redesign/current.md, tasks/portfolio/fyp-repo-cleanup/current.md, tasks/portfolio/home-intro-animation/current.md
Last updated: 2026-07-19
-->

# Portfolio — Content Pages Summary

## Quick Start (read this first in next session)

**Where we are**: Home, About, Projects (index + dynamic detail), and Contact pages are scaffolded and route correctly. The homepage hero has real content — name, a rewritten longer tagline, and a floating cutout-photo treatment (now with a full load-in reveal sequence, see `tasks/portfolio/home-intro-animation/current.md`) — and all 3 project cards have real titles/hooks pulled from the user's actual GitHub repos. Browser tab now shows a real title ("Man Hou - Web Developer") and a custom favicon instead of the Next.js defaults. This work is committed and merged to `main` (live via Vercel). About page narrative, contact email, and each project's Introduction/Purpose/Spotlight/Lessons Learned sections are still bracketed `[...]` placeholders.

**Immediate next actions (in order)**:
1. Write real About page copy (`app/about/page.tsx`) — pure narrative, no dependency on project details being finalized.
2. Fill in the 4 remaining bracketed fields per project in `lib/projects.ts` (introduction, purposeAndGoal, spotlight, lessonsLearned) — titles/hooks are already done. `tech-strongbox-project` is intentionally generic ("Tech Strongbox Client Work") until the user provides specific client project URLs.
3. Replace the `[your-email@example.com]` placeholder in `app/contact/page.tsx`.
4. Once the user finishes cleaning up the FYP GitHub repo (see `tasks/portfolio/fyp-repo-cleanup/current.md`), add its `repoUrl` to the `geofencing-app` entry.

**Key facts for cold start**:
- All content-page work described above is committed and merged into `main` via PR #2.
- `npx next build` is clean.
- Editing `lib/projects.ts` updates the Home page's featured cards, the `/projects` index, and each detail page simultaneously — it's the only place project content lives.
- Homepage hero photo is `public/images/yoon-man-hou.png` — a real transparent-background cutout (verified via `sharp` alpha-channel stats), not a plain rectangular photo.

**Gotchas that will trip you**:
- `params` on `app/projects/[slug]/page.tsx` is `Promise<{ slug: string }>` in this Next.js version — must `await params` before destructuring.
- `generateStaticParams()` already maps over `PROJECTS` from `lib/projects.ts` — adding a 4th project there is enough, no manual param list to update.
- The hero photo's glow blob is intentionally NOT amber — `components/header/*`'s single-accent-color rule (AGENTS.md) is scoped to the header only; page-level decoration is free to use other colors (currently soft blue `#6B9BD1`).

---

## Overview

Building out the portfolio's content pages (Home, About, Projects, Contact) to replace the leftover create-next-app boilerplate. Content strategy is directly informed by Josh Comeau's "Building an Effective Dev Portfolio" — the same person cited for header interaction craft in `tasks/portfolio/header-redesign/current.md`, and again this session for the homepage hero photo treatment (a CSS approximation of his floating-cutout-photo effect, since no image-editing tool was available to remove backgrounds locally — the user supplied an already-transparent PNG instead).

---

## Files

**Frontend**
- `lib/projects.ts` — Single typed `Project[]` data source (3 entries) + `getProjectBySlug()`. Titles/hooks are real; other fields still bracketed.
- `app/page.tsx` — Home: hero (name, tagline, floating cutout photo) + featured project cards + contact teaser.
- `app/about/page.tsx` — Story-driven About skeleton, still bracketed.
- `app/projects/page.tsx` — Projects index, card grid rendered from `lib/projects.ts`.
- `app/projects/[slug]/page.tsx` — Dynamic project detail page, still bracketed beyond title/hook.
- `app/contact/page.tsx` — Single `mailto:` CTA, email still a placeholder.
- `public/images/yoon-man-hou.png` — Transparent-background headshot cutout used in the hero.
- `app/globals.css` — Added `@keyframes float` / `--animate-float` (5s idle bob) with a `prefers-reduced-motion` guard — this is a page-level animation, not a header one, so the guard is appropriate here (unlike `components/header/*`, see `tasks/portfolio/header-redesign/current.md`).
- `app/icon.svg` — Favicon (amber "MH" monogram); full load-in reveal sequence for the hero is tracked in `tasks/portfolio/home-intro-animation/current.md`, not here.

---

## Task Status

| # | Task | Status |
|---|------|--------|
| 1 | Read "Building an Effective Dev Portfolio" PDF and extract structure | ✅ |
| 2 | Scaffold Home, About, Projects, Contact pages | ✅ |
| 3 | Homepage hero: real name + tagline copy | ✅ |
| 4 | Homepage hero: photo (circle → rejected as "funeral portrait" → transparent cutout + glow blob + drop-shadow + idle float + hover-tilt) | ✅ |
| 5 | Fill real title + hook for all 3 projects in `lib/projects.ts`, sourced from user's actual GitHub repos | ✅ |
| 6 | Commit and merge content-pages work to `main` (live) | ✅ |
| 11 | Hero photo hover redesign (straight-by-default, hover lean+scale+glow), tagline rewritten twice, browser `<title>` + favicon added | ✅ — see `tasks/portfolio/home-intro-animation/current.md` for the full load-animation work this shipped alongside |
| 7 | Write real About page narrative | ⬜ Not started |
| 8 | Fill Introduction/Purpose/Spotlight/Lessons Learned for all 3 projects | ⬜ Not started |
| 9 | Replace contact page email placeholder | ⬜ Not started |
| 10 | Add `repoUrl` to `geofencing-app` once FYP repo cleanup is done | ⬜ Blocked — see `tasks/portfolio/fyp-repo-cleanup/current.md` |

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Structure every page around Josh Comeau's portfolio guide | Its core claims (tour-guide project pages, story-driven About, no skill charts/bravado) map directly onto the user's actual background |
| Single `lib/projects.ts` feeding Home, `/projects`, and `/projects/[slug]` | Avoids re-entering the same project info in three places |
| Project card copy written from verified GitHub source, not invented | `geofencing-app` turned out to actually be a home-cleaning booking platform (verified from the real Laravel + Flutter source) — title changed to "Cleaning Service Booking App" rather than keeping the guessed-wrong original name; `ai-assisted-project` identified as the `Finance-management` repo (Angular + ASP.NET Core), title "Finance Management" |
| `tech-strongbox-project` kept deliberately generic ("Tech Strongbox Client Work") | User has multiple client projects and will provide specific URLs/details later — writing one fake-specific description would need to be un-learned |
| Hero photo: transparent cutout + blurred color blob + `drop-shadow` + idle float. Default state is straight (not tilted); hover leans it (-3°) with a slight scale-up and a brighter glow | Approximates joshwcomeau.com/about-josh's floating-cutout effect using only CSS, since no background-removal tool was available. Original tilt-then-straighten-on-hover treatment was reworked this session — user wanted the resting state straight, with a distinct "greeting nod" hover instead of the old straighten gimmick |
| Hero glow blob color changed from amber to soft blue | Amber is the header's single deliberate accent (AGENTS.md); user found it "ugly" here — page decoration outside `components/header/*` isn't bound by that rule |

---

## Critical Gotchas

### Frontend
| Issue | Rule |
|-------|------|
| Next.js 16 dynamic route `params` | `params` prop is `Promise<{ slug: string }>` — must `await params` before destructuring |
| Next.js `<Image>` on a transparent cutout PNG, sized responsively | Use `drop-shadow` (follows the alpha silhouette) not `box-shadow` (draws a rectangle); size via a Tailwind `max-w-[Npx]` class, not `w-[Npx]`, paired with `style={{width:'auto',height:'auto'}}` — mixing a fixed-px style width with `height:'auto'` reproduces the Tailwind-Preflight aspect-ratio warning (see `AGENTS.md`), and mixing `w-[Npx]` class with `style width:'auto'` makes the inline style silently win, collapsing the fixed width |

---

## Bugs Fixed

No bugs logged yet — pages are functioning as scaffolded/populated so far.

---

## Last Session

- Reworked the hero photo's default/hover states (straight by default, hover leans+scales+glows) — full detail and the accompanying load-in animation work is in `tasks/portfolio/home-intro-animation/current.md`.
- Rewrote the hero tagline twice more (merged in a "thanks for visiting" + night-work angle, then stripped AI-sounding phrasing per the user's writing-style preference).
- Added a real browser `<title>` ("Man Hou - Web Developer") and a custom favicon (`app/icon.svg`), replacing the Next.js defaults.
- Committed and merged this session's work (with `tasks/portfolio/home-intro-animation/current.md`'s work) into `main`.

---

## Next Steps

- [ ] Write real About page narrative
- [ ] Fill Introduction/Purpose/Spotlight/Lessons Learned for all 3 projects in `lib/projects.ts`
- [ ] Replace contact page email placeholder
- [ ] Add `geofencing-app`'s `repoUrl` once FYP repo cleanup finishes (see `tasks/portfolio/fyp-repo-cleanup/current.md`)
