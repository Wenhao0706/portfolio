<!--LLM-CONTEXT
Status: 📋 Planning — NEXT SESSION'S WORK. No account, no code, tool confirmed
Domain: portfolio
Gotchas (critical — full list in ## Critical Gotchas below):
  - The site is ONE route now, so automatic pageview capture fires once per visit and measures nothing. Section engagement needs explicit events
  - PostHog undercounts by design (ad-blockers); it can never back a public visitor counter
  - Session replay records real visitors — disclosure before shipping, not after
Related: tasks/portfolio/content-pages/current.md, tasks/portfolio/deployment/current.md, tasks/portfolio/site-chrome/current.md, tasks/portfolio/terminal/current.md
Last updated: 2026-08-10
-->

# Portfolio — PostHog Analytics Summary

## Quick Start (read this first in next session)

**Where we are**: Nothing built. No PostHog account, no API key, no code. The tool is confirmed (session replay + product analytics), and this is the agreed next piece of work.

What changed since this doc was written: the site collapsed from five routes to one scrolling page. That invalidates the obvious instrumentation plan — route-based pageviews now measure a single event per visit.

**Immediate next actions (in order)**:
1. User signs up at posthog.com, creates a project, supplies the Project API Key.
2. Add `posthog-js` in `app/layout.tsx` behind `NEXT_PUBLIC_POSTHOG_KEY`, and **disable automatic pageview capture** — it is meaningless on a one-page site.
3. Instrument what actually answers the question: which sections a visitor reaches, whether they touch the terminal, which commands they run, whether they submit the contact form, whether they download the resume.
4. Decide on the reverse-proxy setup so ad-blockers do not drop the script.
5. Add the privacy disclosure BEFORE enabling replay.

**Key facts for cold start**:
- Section ids to key engagement events off: `terminal`, `about`, `tech`, `projects`, `contact`. They live in `lib/sections.ts`.
- `components/header/useActiveSection.ts` already runs one IntersectionObserver over those sections. Reuse it rather than adding a second.
- The terminal is the highest-signal thing to measure — command frequency tells you what recruiters actually want to know.
- Env vars bind at build time on Vercel, so adding the key needs a redeploy (see `tasks/portfolio/deployment/current.md`).

**Gotchas that will trip you**:
- `NEXT_PUBLIC_*` is public. Only the Project API Key belongs there, never a personal API key.
- The footer has a reserved slot for a public traffic band. Do not fill it from PostHog — see the decision below.

---

## Overview

Two separate goals that keep getting conflated, and the split is the main thing this doc exists to record.

**Private analytics** — how real visitors use the site, for the owner's eyes. PostHog does this well: session replay, funnels, event counts.

**Public traffic counters** — a visitor-facing "N visits" band in the footer. PostHog cannot back this honestly, because it undercounts by design.

---

## Key Technical Decisions

### D-split-private-public — PostHog for private replay, a server-side store for any public counter
**Problem**: The revamp design included a footer traffic band. The obvious source is PostHog, since it will already be installed.
**Decision**: PostHog powers private analytics only. Any public number needs a server-side counter (Upstash was the candidate).
**Rejected**: Reading counts from PostHog — its client script is blocked by ad-blockers and privacy browsers, so the figure would be a systematic undercount presented to recruiters as fact. Wrong by an unknown margin is worse than absent.
**Consequences**: The footer band stays unbuilt until a server-side store exists. `components/Footer.tsx` reserves the slot and its docblock says why nothing may be seeded there.
**Status**: decided, not yet implemented

### D-no-auto-pageviews — Turn off automatic pageview capture
**Problem**: One route means one pageview per visit, regardless of whether the visitor read everything or bounced off the hero.
**Decision**: Disable auto-capture; emit explicit section-reached and interaction events instead.
**Rejected**: Leaving it on as a visit counter — it would double as a misleading engagement metric in the PostHog UI.
**Consequences**: Every metric worth having has to be instrumented deliberately. The section ids and the existing scroll-spy observer make that cheap.
**Status**: decided, not yet implemented

---

## Critical Gotchas

### Frontend
| Issue | Rule |
|-------|------|
| One-route site | Automatic pageview capture measures nothing. Disable it and instrument section reach explicitly, keyed off `lib/sections.ts` |
| Duplicate observers | `useActiveSection` already observes every section. Reuse it; a second IntersectionObserver over the same nodes is the defect the `/done` review just removed from the header |
| Public numbers | PostHog undercounts. Never render a PostHog figure to visitors — see D-split-private-public |
| Session replay | Records real people. Ship the disclosure first, and check what the contact form's fields would capture before enabling input recording |
| Vercel env vars | Bind at build time; adding the key requires a redeploy or it stays silently inert |

---

## Next Steps

**Blocked on the user**
- [ ] Create the PostHog account and project, supply the Project API Key

**Instrumentation**
- [ ] Add `posthog-js` in `app/layout.tsx`, auto-pageviews off
- [ ] Section-reached events keyed off `lib/sections.ts`, reusing `useActiveSection`'s observer
- [ ] Terminal events: opened, command run (with the command name), suggestion button vs typed
- [ ] Conversion events: resume download, contact form submit, repo link clicked
- [ ] Reverse-proxy setup so ad-blockers do not drop the script

**Before enabling replay**
- [ ] Privacy disclosure, and confirm what the contact form fields would record

**Deferred**
- [ ] The footer's public traffic band, which needs a server-side counter rather than PostHog
