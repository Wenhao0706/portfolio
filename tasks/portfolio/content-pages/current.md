<!--LLM-CONTEXT
Status: 🔨 In Progress — pages scaffolded with bracketed [...] placeholder copy, no real content written yet
Domain: portfolio
Gotchas (critical — full list in ## Critical Gotchas below):
  - Next.js 16 dynamic route `params` is a Promise — must `await params`
  - lib/projects.ts is the single source of truth for all project content — don't duplicate project data inline on any page
Related: tasks/portfolio/header-redesign/current.md
Last updated: 2026-07-15
-->

# Portfolio — Content Pages Summary

## Quick Start (read this first in next session)

**Where we are**: Home, About, Projects (index + dynamic detail), and Contact pages are scaffolded and route correctly, but every section of body copy is a bracketed `[...]` placeholder. Structure follows Josh Comeau's "Building an Effective Dev Portfolio" guide (user-provided PDF): project pages as "tour guides" not screenshot galleries, About as a specific origin story not corporate-speak, no skill charts.

**Immediate next actions (in order)**:
1. Write real About page copy (`app/about/page.tsx`) — pure narrative, no dependency on project details being finalized, so it's the easiest starting point.
2. Fill in the 3 project entries in `lib/projects.ts` (`geofencing-app`, `tech-strongbox-project`, `ai-assisted-project`) — each field has a bracketed prompt saying exactly what to write and why.
3. Replace the `[your-email@example.com]` placeholder in `app/contact/page.tsx`.

**Key facts for cold start**:
- All content-page work is uncommitted and untracked (new files).
- `npx tsc --noEmit` is clean; all 7 routes (`/`, `/about`, `/projects`, 3× `/projects/[slug]`, `/contact`) verified returning 200 against the local dev server.
- Editing `lib/projects.ts` updates the Home page's featured cards, the `/projects` index, and each detail page simultaneously — it's the only place project content lives.

**Gotchas that will trip you**:
- `params` on `app/projects/[slug]/page.tsx` is `Promise<{ slug: string }>` in this Next.js version — must `await params` before destructuring `slug`.
- `generateStaticParams()` already maps over `PROJECTS` from `lib/projects.ts` — adding a 4th project there is enough, no manual param list to update.

---

## Overview

Building out the portfolio's content pages (Home, About, Projects, Contact) to replace the leftover create-next-app boilerplate. Content strategy is directly informed by Josh Comeau's "Building an Effective Dev Portfolio" — the same person already cited for header interaction craft in `tasks/portfolio/header-redesign/current.md`. Core idea borrowed: a screenshot + tech list per project is what every junior portfolio does; a full "tour guide" detail page (why built, what was hard, how it was solved) is what makes one stand out.

---

## Files

**Frontend**
- `lib/projects.ts` — NEW. Single typed `Project[]` data source (3 entries) + `getProjectBySlug()`. All content fields are bracketed placeholders.
- `app/page.tsx` — NEW, replaces create-next-app boilerplate. Home: hero hook + featured project cards (from `lib/projects.ts`) + contact teaser.
- `app/about/page.tsx` — NEW. Story-driven About skeleton with bracketed prompts (origin story, WordPress→full-stack reposition, humility/grit line).
- `app/projects/page.tsx` — NEW. Projects index, card grid rendered from `lib/projects.ts`.
- `app/projects/[slug]/page.tsx` — NEW. Dynamic project detail page — Introduction / Purpose & Goal / Spotlight / Current Status / Lessons Learned sections, `generateStaticParams()` from `lib/projects.ts`.
- `app/contact/page.tsx` — NEW. Single `mailto:` CTA, socials kept secondary per the guide's advice against a social-icon wall.

---

## Task Status

| # | Task | Status |
|---|------|--------|
| 1 | Read "Building an Effective Dev Portfolio" PDF and extract structure | ✅ |
| 2 | Scaffold Home page (hero + featured projects + contact teaser) | ✅ |
| 3 | Scaffold About page skeleton | ✅ |
| 4 | Scaffold Projects index page | ✅ |
| 5 | Scaffold dynamic Project Detail page + `lib/projects.ts` data source | ✅ |
| 6 | Scaffold Contact page | ✅ |
| 7 | Write real About page narrative | ⬜ Not started |
| 8 | Write real content for all 3 projects in `lib/projects.ts` | ⬜ Not started |
| 9 | Replace contact page email placeholder | ⬜ Not started |

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Structure every page around Josh Comeau's portfolio guide | Its core claims (tour-guide project pages, 2–5 projects favoring depth, no skill charts/bravado, story-driven About) map directly onto the user's actual background — WordPress work, one FYP, one AI-assisted project |
| Single `lib/projects.ts` feeding Home, `/projects`, and `/projects/[slug]` | Avoids re-entering the same project info in three places; one edit propagates everywhere |
| Bracketed `[...]` placeholders instead of invented filler copy | User asked for a skeleton to react to, not finished prose — fabricated specifics (fake bug stories, fake client names) would need to be un-learned rather than just filled in |

---

## Critical Gotchas

### Frontend
| Issue | Rule |
|-------|------|
| Next.js 16 dynamic route `params` | `params` prop is `Promise<{ slug: string }>`, not a plain object — must `await params` before destructuring (breaking change vs pre-15 Next.js; see `AGENTS.md`'s top banner) |

---

## Bugs Fixed

No bugs logged yet — pages are freshly scaffolded and unpopulated.

---

## Last Session

- Read the user-provided "Building an Effective Dev Portfolio" PDF (Josh Comeau) in full via WSL path `/mnt/c/Users/ASUS/Downloads/`, extracted the structural rules to apply.
- Drafted a content skeleton in conversation first (headers + prompts per page), got user confirmation to proceed, then scaffolded the actual `.tsx` files with bracketed placeholder copy.
- Created `lib/projects.ts` as the single data source for 3 projects: FYP geofencing app, a Tech Strongbox client project, and the AI-assisted personal project.
- Verified `tsc --noEmit` clean and all 7 routes return 200 against the local dev server.

---

## Next Steps

- [ ] Write real About page narrative
- [ ] Fill in real content for all 3 projects in `lib/projects.ts`
- [ ] Replace contact page email placeholder
- [ ] Decide whether to add real screenshots/images to project detail pages
- [ ] Commit content-pages work (currently uncommitted, untracked)
