<!--LLM-CONTEXT
Status: 🔨 In Progress — site live on www.manhou.de; bare-domain DNS record still missing
Domain: portfolio
Gotchas (critical — full list in ## Critical Gotchas below):
  - Judge live-site reachability from www.manhou.de, never the .vercel.app alias
  - NEXT_PUBLIC_* env vars are baked in at build time, so adding one needs a redeploy
Related: tasks/portfolio/contact-form/current.md, tasks/portfolio/content-pages/current.md
Last updated: 2026-07-26
-->

# Portfolio — Deployment & Domain Summary

## Quick Start (read this first in next session)

**Where we are**: The portfolio is live and publicly reachable at `https://www.manhou.de`, served by Vercel from `main`. The generated `portfolio-mr-no-name.vercel.app` alias also works as a fallback. Vercel Deployment Protection was switched off this session so the fallback stays usable if the custom domain ever lapses.

**Immediate next actions (in order)**:
1. Add an apex DNS record so `manhou.de` without `www` resolves — it currently returns nothing at all. Add an A record for `216.198.79.1` at the registrar, then add `manhou.de` in Vercel and set it to redirect to `www`.

**Key facts for cold start**:
- Check reachability with `curl -s -o /dev/null -w "%{http_code}" https://www.manhou.de/`.
- Check DNS with `getent hosts <domain>` — this WSL image has no `dig`.
- Production env vars for the contact form live in Vercel's dashboard, 5 of them, all set. See `tasks/portfolio/contact-form/current.md`.

**Gotchas that will trip you**:
- A 302 from the `.vercel.app` URL to `vercel.com/sso-api` means Deployment Protection is on, not that the site is broken — real visitors on the custom domain are unaffected.
- The site owner's browser is logged into Vercel, so a protected site looks perfectly fine to them and to nobody else. Test in a private window.

---

## Overview

Hosting, domain, and environment configuration for the portfolio site. Vercel builds `main` automatically on push; there is no separate deploy step.

---

## Files

**External (not in this repo)**
- Vercel project dashboard — environment variables, domains, Deployment Protection
- Domain registrar for `manhou.de` — DNS records
- `Wenhao0706/portfolio` on GitHub — repo homepage field, now pointing at `https://www.manhou.de`

---

## Task Status

| # | Task | Status |
|---|------|--------|
| 1 | Site building and deploying from `main` via Vercel | ✅ |
| 2 | Custom domain `www.manhou.de` serving publicly | ✅ |
| 3 | Contact form env vars set in Vercel and verified live | ✅ |
| 4 | Deployment Protection switched off so the `.vercel.app` alias stays usable | ✅ |
| 5 | GitHub repo homepage pointed at the custom domain | ✅ |
| 6 | Apex `manhou.de` DNS record | ⬜ Not started |

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Deployment Protection turned off rather than left on preview-only | Keeps the generated `.vercel.app` URL reachable as a fallback if the custom domain expires or is not renewed. Accepted consequence: both addresses are now indexable, so search engines may surface either one |

---

## Critical Gotchas

### Hosting
| Issue | Rule |
|-------|------|
| Vercel Deployment Protection gates preview and generated `.vercel.app` URLs but leaves the custom production domain public | Judge whether the site is reachable from `www.manhou.de`, never from the `.vercel.app` alias — the alias can 302 to an SSO login while visitors are served fine |
| A protected deployment looks healthy to the account owner | Their browser carries a Vercel session, so the gate waves them through. Verify in a private window or from an unauthenticated request |

### Build
| Issue | Rule |
|-------|------|
| `NEXT_PUBLIC_*` env vars are inlined into the client bundle at build time, not read at runtime | Adding or changing one requires a redeploy before it takes effect. Server-side vars are read per request and need no rebuild |

---

## Bugs Fixed

No deployment bugs logged — the SSO redirect investigated this session turned out to be Deployment Protection behaving as designed.

---

## Last Session

- Traced a suspected production outage to Vercel Deployment Protection; the custom domain was serving normally the whole time.
- Verified the deployed bundle carries the reCAPTCHA site key, closing the contact form's env-var unknown.
- Updated the GitHub repo homepage from the `.vercel.app` alias to `https://www.manhou.de`.
- Found the apex domain has no DNS record at all.

---

## Next Steps

**DNS**
- [ ] Add an apex A record for `manhou.de` pointing at `216.198.79.1`, add the domain in Vercel, and set it to redirect to `www` — typing the bare domain currently fails to connect
