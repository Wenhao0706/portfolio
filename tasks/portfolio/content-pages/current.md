<!--LLM-CONTEXT
Status: ✅ Shipped — the site is ONE route. All copy is real; no bracketed placeholder remains anywhere in production
Domain: portfolio
Gotchas (critical — full list in ## Critical Gotchas below):
  - The site is a SINGLE page. `/about`, `/projects`, `/projects/[slug]` and `/contact` are deleted and 308-redirect to anchors
  - Content lives in `lib/` (projects, about, tech, site, sections) because the terminal renders the same facts as the page — never inline copy in a component
  - Sections ship at `opacity-0` and are revealed by GSAP; a reveal selector that stops matching leaves a BLANK section with nothing in the console
  - Naming a client is a claim he BUILT their site. `sites` is only for the five he built as sole developer; the maintained brands must never drift into it
Related: tasks/portfolio/chatbot/current.md, tasks/portfolio/terminal/current.md, tasks/portfolio/site-chrome/current.md, tasks/portfolio/header-redesign/current.md, tasks/portfolio/fyp-repo-cleanup/current.md, tasks/portfolio/home-intro-animation/current.md, tasks/portfolio/contact-form/current.md, tasks/portfolio/deployment/current.md
Last updated: 2026-08-11
-->

# Portfolio — Page Content Summary

## Quick Start (read this first in next session)

**Where we are**: The portfolio is one scrolling page at `/`, in this order — Hero, Terminal, About, TechStack, Projects, Contact — plus the footer. Four routes were deleted and 308-redirect to anchors. Every bracketed placeholder is gone: the About narrative is written, project cards carry real 2-3 sentence descriptions, and the per-project detail fields were removed with the detail route.

**Immediate next actions (in order)**:
1. Settle the client-naming rationale. `lib/projects.ts` and `lib/__tests__/projects.test.ts` both justify publishing the five client names with "the CV names and links these five already" — the resume PDF does NOT name any of them (verified 2026-08-11). Either update the resume or replace the comment with the real basis.
2. PostHog instrumentation is the agreed next piece of work — see `tasks/portfolio/posthog-analytics/current.md`.
3. Add `geofencing-app`'s `repoUrl` once the FYP repo cleanup finishes.

**Key facts for cold start**:
- `npx vitest run` (351 tests), `npx tsc --noEmit`, `npx eslint app components lib`, `npm run build` all clean.
- Content sources, all under `lib/`: `projects.ts`, `about.ts` (bio + sign-off + timezone), `tech.ts`, `site.ts` (email, GitHub, LinkedIn, WhatsApp), `sections.ts` (nav order).
- Editing any of those updates the page AND the terminal simultaneously. That is deliberate — the two must never disagree.
- `app/page.tsx` is a thin orchestrator: one GSAP timeline plus the reveal registry in `lib/reveals.ts`.

**Gotchas that will trip you**:
- Adding a section means adding it to `lib/sections.ts` AND `lib/reveals.ts`; the header, mobile menu, footer and scroll spy all read the former.
- `components/__tests__/reveal-integrity.test.tsx` is the only thing that catches a reveal selector that stopped matching. Do not weaken it to make a change pass.
- `sites` means "he built this". Never add a brand he only maintains — the test pins the list to five.

---

## Overview

Content strategy follows Josh Comeau's "Building an Effective Dev Portfolio". This session collapsed the five-route structure into a single page (spec: `docs/superpowers/specs/2026-08-09-one-page-revamp-design.md`, plan: `docs/superpowers/plans/2026-08-09-one-page-revamp.md`), then wrote the last of the real copy and added an interactive terminal as the signature moment.

---

## Files

**Content sources (`lib/`)**
- `projects.ts` — typed `Project[]`. Fields are slug, title, hook, description, stack, optional `sites: ProjectSite[]`/`repoUrl`. `sites` replaced the unused `liveUrl`. The detail-page fields were deleted with the detail route.
- `about.ts` — `ABOUT_PARAGRAPHS` (bio, shared with the terminal's `cat about.md`), `ROLE_LINE`, `SIGNOFF` (the footer's large type, lifted from the third paragraph), `TIMEZONE`/`LOCATION_LABEL`.
- `tech.ts` — `TECH_GROUPS`, shared by the TechStack tab panel and the terminal's `skills`.
- `sections.ts` — `NAV_SECTIONS`, the one list read by desktop tabs, mobile menu, scroll spy and footer.
- `reveals.ts` — scroll-reveal registry plus the projects showpiece builder.

**Page**
- `app/page.tsx` — orchestrator. Renders the six sections, owns the GSAP timeline.
- `components/sections/{Hero,TerminalDemo,About,Projects,Contact}.tsx` — one file per section.
- `next.config.ts` — the four 308 redirects.
- `app/contact/actions.ts` — the Server Action survived the route deletion; it was never tied to the page.

---

## Task Status

| # | Task | Status |
|---|------|--------|
| 1 | Scaffold pages, hero copy, hero photo treatment, short-form copy | ✅ |
| 2 | Real title + hook for all 3 projects from actual repos | ✅ |
| 3 | Collapse five routes to one page with 308 redirects | ✅ |
| 4 | Write the About narrative | ✅ — real copy, sourced in `lib/about.ts` |
| 5 | Project card descriptions (2-3 sentences each), ordered by strength | ✅ |
| 6 | Delete the detail-page fields and `getProjectBySlug` | ✅ |
| 7 | Interactive terminal section | ✅ — see `tasks/portfolio/terminal/current.md` |
| 8 | Motion identity (heading decode, tab print, card pointer glow) | ✅ |
| 9 | Add `repoUrl` to `geofencing-app` | ⬜ Blocked — see `tasks/portfolio/fyp-repo-cleanup/current.md` |
| 10 | State why the two unlinked cards are unlinked | 🟡 Half done — the client card now links the five sites he built, so it is no longer unlinked. `finance-management` is still silent |
| 11 | Link the five client sites built as sole developer | ✅ — card, terminal `cat`/`open`, and chatbot knowledge all carry them |

---

## Key Technical Decisions

### D-one-page — Collapse five routes into one scrolling page
**Problem**: Five routes for a portfolio with three projects and a two-paragraph About meant a recruiter had to navigate to see anything, and two of the routes were mostly placeholder.
**Decision**: One page, sections with anchors, 308 redirects from the old paths.
**Rejected**: Keeping `/projects/[slug]` for SEO — three thin pages compete with each other and none of them rank; one substantive page is the better indexable unit.
**Consequences**: The resume and the chatbot's replies still name the old paths, so the redirects are load-bearing rather than cosmetic. Scroll position now carries the navigation state, which required a scroll spy.
**Status**: shipped 2026-08-10

### D-content-in-lib — All rendered facts live in `lib/`, never inline in a component
**Problem**: The terminal prints the same bio, stack and project data the page renders. A second copy is a copy that drifts, and the version a visitor reads in the terminal is the one an interviewer quotes back.
**Decision**: `about.ts`, `tech.ts`, `sections.ts` extracted so both surfaces import one source.
**Rejected**: Letting the terminal hold its own short summaries — cheaper to write, guaranteed to disagree within a month.
**Consequences**: Editing the bio changes the About section, `cat about.md`, and the footer sign-off at once. Tests assert the terminal's output contains the same strings the page renders.
**Status**: shipped 2026-08-10

### D-no-dead-links — Never render an affordance that goes nowhere
**Problem**: Two of three projects have no public repo and no live URL.
**Decision**: Cards render a repo link only when `repoUrl` exists; the terminal's `open` refuses rather than inventing one. Finance Management is deployed but self-hosted from a laptop and currently returns 530, so it carries no `sites` entry either.
**Rejected**: Linking Finance Management's live URL — a link that is down half the time is worse than no link.
**Consequences**: `finance-management` stays text-only; the absence is honest but silent (Task 10). The client card stopped being one of the two the day `sites` landed — see `D-client-sites`, which extends this rule rather than relaxing it.
**Status**: shipped 2026-08-10, amended 2026-08-11

### D-client-sites — Link only the five sites he built from scratch, never the ones he maintains
**Problem**: The client card said "Case studies coming soon" and linked nowhere, so the single largest body of his real work was invisible to a recruiter. But his client work splits in two: five sites he built as sole developer, and established brands (The Chicken Rice Shop, Tune Group, BioGaia, Caroline, GNIUS) he only maintains and extends.
**Decision**: A `sites?: ProjectSite[]` field carries the five builds, rendered under the label "Built from scratch, sole developer". The maintained brands are named nowhere on the page, and the chatbot's knowledge base states explicitly that he did not build them.
**Rejected**: Listing all the brands as "clients worked with" — the stronger-looking list, and the one that collapses the distinction an interviewer will probe first. A link reads as "I built this", so the maintained brands cannot appear as links without making a claim he would have to walk back.
**Consequences**: The card gained five external links and the terminal's `open` needed a repo→site fallback. The maintain-vs-build line now exists in three places (card copy, `lib/projects.ts` comment, chatbot knowledge) and all three have to keep agreeing.
**Status**: shipped 2026-08-11 — but see the open consent/CV question in Next Steps before treating the rationale as settled

| Decision | Rationale |
|----------|-----------|
| Project cards are `<article>`, not `<Link>` | A whole-card link is wrong when most cards have no destination |
| Cards ordered by strength, not by linkability | `geofencing-app` first — it is the strongest work even though the only linked project is third |
| Hero glow blob stays soft blue, not amber | Amber is the header's single accent (AGENTS.md); page decoration is not bound by that rule |

---

## Critical Gotchas

### Frontend
| Issue | Rule |
|-------|------|
| Sections ship at `opacity-0` | A reveal selector that stops matching leaves a blank section with nothing in the console. `reveal-integrity.test.tsx` asserts every selector in `lib/reveals.ts` matches a rendered node — fix the selector, never the test |
| Adding a navigable section | It must go in `lib/sections.ts` (header, mobile menu, footer, scroll spy) AND `lib/reveals.ts` (reveal), and needs `scroll-mt-24` or the sticky header covers its heading |
| Two surfaces render the same fact | Import from `lib/`; never retype copy into a component. The terminal and the page disagreeing is the failure mode this prevents |
| Adding a client name to `sites` | A link is a claim he BUILT that site. Only the five sole-developer builds qualify; `lib/__tests__/projects.test.ts` pins the list to exactly those five so a maintained brand cannot drift in unnoticed |
| `<Image>` on a transparent cutout PNG | `drop-shadow` not `box-shadow`; size with `max-w-[Npx]` plus `style={{width:'auto',height:'auto'}}` — see AGENTS.md |

---

## Bugs Fixed

| Bug | Root cause | Fix |
|-----|-----------|-----|
| Footer CTA heading unmatchable by `getByRole` though it rendered correctly | A bare `<br />` contributes no space to the accessible name, so it computed as "Let's buildsomething great" | Explicit `{' '}` before the break. Captured in AGENTS.md |
| Terminal history wiped the recalled command when up was pressed past the oldest entry | Both ends of the walk took the same branch, so overrunning the oldest was treated like overrunning the newest | Only forward overflow returns to an empty line. Two boundary tests added |

---

## Last Session

- Added `sites` to the client project: five sole-developer builds now render as labelled links on the card, print in the terminal's `cat`, and are known to the chatbot (`D-client-sites`).
- Widened the page column 1024px → 1100px and extracted it into `PAGE_WIDTH_PX`/`PAGE_MAX_WIDTH` in `lib/ui.ts`, which `PAGE_MAIN`, the footer and StackField's gutter maths now all derive from.
- Review turned up two things worth carrying forward: the "the CV already names these" justification is false against the actual resume PDF, and the chat panel renders replies as plain text, so any URL the bot names is inert.

---

## Next Steps

**Claims that need a real basis**
- [ ] ⚠️ The published client names rest on a false premise. `lib/projects.ts` says the CV "names and links these five", but `public/resume.pdf` names none of them. Update the resume to match, or state the actual basis (client/employer sign-off) — and record which it was
- [ ] Nothing on the page or in the repo records that the clients consented to being named and linked publicly

**Content gaps a recruiter can see**
- [ ] Add `geofencing-app`'s `repoUrl` once FYP cleanup finishes (blocked — `tasks/portfolio/fyp-repo-cleanup/current.md`)
- [ ] Decide whether `finance-management` should state why it is unlinked
- [ ] Give each of the five sites a one-line note on what he built there — five identical amber links do not distinguish a full rebuild from a landing page, and none of the sites credit him
- [ ] TechStack still defaults to the Languages tab, which is 3 of 14 technologies. Frontend may serve the positioning better

**Next piece of work**
- [ ] PostHog instrumentation for real traffic — `tasks/portfolio/posthog-analytics/current.md`
