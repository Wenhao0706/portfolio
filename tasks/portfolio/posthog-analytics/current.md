<!--LLM-CONTEXT
Status: 📋 Planning — no account, no code, tool confirmed
Domain: portfolio
Gotchas: Session replay of real visitors has privacy/consent implications — flag before shipping
Related: None
Last updated: 2026-07-24
-->

# Portfolio — PostHog Analytics Summary

## Quick Start (read this first in next session)

**Where we are**: User wants to add PostHog (session replay + product analytics) to the portfolio to watch how visitors use the site. Confirmed as PostHog specifically from a screenshot of its session-replay UI ("Replay vision watches them for you and surfaces what matters"). Nothing built yet — no PostHog account, no API key, no code.

**Immediate next actions (in order)**:
1. User signs up at posthog.com and creates a project to get a Project API Key.
2. Decide instrumentation approach: `posthog-js` client SDK loaded in `app/layout.tsx` (simplest) vs a Next.js-specific wrapper.
3. Decide whether to route through PostHog's reverse-proxy setup so ad-blockers don't block the script (PostHog supports this natively).

**Key facts for cold start**:
- Nothing implemented — this doc is a placeholder for when the user is ready to start.
- Likely touches `app/layout.tsx` (site-wide instrumentation), plus a new env var (e.g. `NEXT_PUBLIC_POSTHOG_KEY`).

**Gotchas that will trip you**:
- Session replay records real visitor behavior — before shipping, add a privacy-policy mention/consent notice; don't ship silent recording without disclosure.

---

## Overview

Add PostHog for session replay and product analytics on the portfolio site, so the user can see how visitors (recruiters, etc.) actually use it.

---

## Next Steps

- [ ] User creates PostHog account + project, gets API key
- [ ] Decide instrumentation approach (client SDK in `app/layout.tsx` vs wrapper)
- [ ] Decide on reverse-proxy setup to avoid ad-blocker interference
- [ ] Add a privacy-policy/consent notice before enabling session replay on real visitors
