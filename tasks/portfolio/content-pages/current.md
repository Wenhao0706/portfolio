<!--LLM-CONTEXT
Status: 🔨 In Progress — all short-form copy is now real; the About narrative and the per-project detail fields are the only bracketed placeholders left in production
Domain: portfolio
Gotchas (critical — full list in ## Critical Gotchas below):
  - Next.js 16 dynamic route `params` is a Promise — must `await params`
  - lib/projects.ts is the single source of truth for all project content — don't duplicate project data inline on any page
  - Cutout-style PNGs need `drop-shadow` not `box-shadow`, and a Tailwind width class + style `{width:'auto',height:'auto'}` (not a fixed px style width) to avoid the Image aspect-ratio warning while still being resizable
Related: tasks/portfolio/header-redesign/current.md, tasks/portfolio/fyp-repo-cleanup/current.md, tasks/portfolio/home-intro-animation/current.md, tasks/portfolio/contact-form/current.md, tasks/portfolio/deployment/current.md, tasks/portfolio/site-chrome/current.md
Last updated: 2026-07-30
-->

# Portfolio — Content Pages Summary

## Quick Start (read this first in next session)

**Where we are**: Home, About, Projects (index + detail), and Contact all route correctly and are live at `https://www.manhou.de`. Every short-form line is now real copy: the homepage hero and closing line, the `/projects` intro, and the `/contact` intro plus its email/WhatsApp fallback. Project cards carry real titles and hooks from the user's actual repos. Two placeholders remain, both long-form: the About narrative, and each project's Introduction/Purpose/Spotlight/Lessons Learned.

Page containers are standardised at `max-w-5xl` (1024px) on every route. Visual chrome (background, footer, tech stack) lives in `tasks/portfolio/site-chrome/current.md`.

**Immediate next actions (in order)**:
1. Write real About page copy (`app/about/page.tsx`) — pure narrative, no dependency on project details being finalized. This is now the single largest block of placeholder text on the site.
2. Fill the 4 bracketed fields per project in `lib/projects.ts` (introduction, purposeAndGoal, spotlight, lessonsLearned). `tech-strongbox-project` stays deliberately generic until the user supplies specific client URLs.
3. Once the FYP repo cleanup finishes (see `tasks/portfolio/fyp-repo-cleanup/current.md`), add its `repoUrl` to `geofencing-app`.

**Key facts for cold start**:
- `npx next build` and `npx vitest run` are clean (87 tests).
- Editing `lib/projects.ts` updates the Home cards, the `/projects` index, each detail page, AND the footer's Projects column simultaneously — it is the only place project content lives.
- Page shell classes come from `lib/ui.ts` (`PAGE_MAIN`, `PAGE_HEADING`); changing the column width is a one-line edit there, but `StackField`'s `COLUMN_WIDTH` must be changed to match.
- Homepage hero photo is `public/images/yoon-man-hou.png` — a real transparent-background cutout, not a rectangular photo.

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
- `app/contact/page.tsx` — Renders `<ContactForm />` (see `tasks/portfolio/contact-form/current.md`), replacing the old `mailto:` CTA.
- `public/images/yoon-man-hou.png` — Transparent-background headshot cutout used in the hero.
- `app/globals.css` — `@keyframes float` / `--animate-float` (5s idle bob). ⚠️ Its `prefers-reduced-motion` guard is the last one left in the codebase and predates the site-wide no-guard rule; it means the hero photo does not bob for the owner. Do not use it as precedent — see AGENTS.md `## React & Animation`.
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
| 9 | Replace contact page placeholder with a working form | ✅ — see `tasks/portfolio/contact-form/current.md` |
| 12 | Short-form copy written: `/contact` intro + fallback links, homepage closing line (links to `/contact`), `/projects` intro | ✅ |
| 13 | Page containers standardised to `max-w-5xl` (1024px) across all 5 routes, via `lib/ui.ts` | ✅ |
| 14 | "About me" hero CTA removed — "Download resume" is now the only hero button | ✅ |
| 15 | `lib/projects.ts`: added the missing `Laravel` to `geofencing-app`'s stack | ✅ |
| 7 | Write real About page narrative | ⬜ Not started |
| 8 | Fill Introduction/Purpose/Spotlight/Lessons Learned for all 3 projects | ⬜ Not started |
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

- Wrote all remaining short-form copy: `/contact` intro + email/WhatsApp fallback, homepage closing line, `/projects` intro. Two of the three were live placeholders that no task had ever tracked.
- Standardised every page container to 1024px and removed the "About me" hero CTA.
- Found `lib/projects.ts` was missing `Laravel` from `geofencing-app`, which this doc had recorded as verified. Added.

---

## Next Steps

**Live placeholder copy (visible to recruiters right now)**
- [ ] Write the About page narrative (`app/about/page.tsx`) — six bracketed instruction paragraphs, the last substantial placeholder on the site. Reached from both the header nav and the footer, so a recruiter browsing a finished-looking home page lands on an unfinished one
- [ ] Fill Introduction/Purpose/Spotlight/Lessons Learned for all 3 projects in `lib/projects.ts`

**Blocked**
- [ ] Add `geofencing-app`'s `repoUrl` once FYP repo cleanup finishes (see `tasks/portfolio/fyp-repo-cleanup/current.md`)
