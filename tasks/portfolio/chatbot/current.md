<!--LLM-CONTEXT
Status: 🔨 In Progress — EC2 box provisioned and Claude login verified across reboot; no application code yet
Domain: portfolio
Gotchas (critical — full list in ## Critical Gotchas below):
  - Nothing serverless can hold the Claude login — Vercel, Lambda and Amplify are all ruled out by the same constraint
  - Cost is flat monthly, NOT per message — EC2 bills for uptime and the Claude calls are $0 on subscription
Related: tasks/portfolio/deployment/current.md, tasks/portfolio/contact-form/current.md
Last updated: 2026-08-05
-->

# Portfolio — Chatbot Summary

## Quick Start (read this first in next session)

**Where we are**: The EC2 box is fully provisioned and `claude -p` answers as the `claudeagent` user **after a reboot** — the credential-persistence gate the whole architecture depends on has passed. Nothing else exists: no agent server, no tunnel, no application code.

**Immediate next actions (in order)**:
1. SSH in: `ssh -i ~/.ssh/claude-agent-key.pem ubuntu@56.10.8.219`
2. Write `agent/server.mjs` — bearer auth, single-process queue, tools disabled, ~45s timeout
3. systemd unit bound to `127.0.0.1`, then `cloudflared` for an HTTPS hostname
4. Separately, buildable now against a stub: `lib/chat/*`, `app/api/chat/route.ts`, `components/chat/*`

**Key facts for cold start**:
- Instance `i-09a415608db4bf1d9` — t3.micro, x86_64, Ubuntu 26.04 LTS, 16 GiB gp3, `ap-southeast-1`
- Installed and verified: 2 GB swap (persists), Node 22, npm 10.9.8, Claude Code 2.1.221
- ~608 Mi RAM available and 9.2 G disk free at rest
- Public IP `56.10.8.219`, changes on stop/start (not reboot). Only affects SSH; the service uses an outbound tunnel
- Re-verify the login any time: `sudo -u claudeagent -i` then `claude -p "say OK"`

**Gotchas that will trip you**:
- Apt on the AWS regional mirror 503s — see Critical Gotchas before debugging any install
- The AWS account self-destructs at 6 months unless upgraded — see Critical Gotchas
- Root MFA, the IAM admin user, and billing alarms are **still not set up**

---

## Overview

A chat widget in the portfolio's bottom-right corner answering recruiter-style questions about the site owner — background, skills, projects, availability — with light humour, declining anything unrelated.

Runs on the Claude Code CLI under a personal Claude subscription. **There is no `ANTHROPIC_API_KEY` and no pay-per-token API billing anywhere in this design**; that constraint is what dictates the architecture below.

---

## Architecture

```
Browser  ──POST /api/chat──▶  Vercel route handler       ──HTTPS+Bearer──▶  EC2
(ChatWidget)                  · length + shape checks       (Cloudflare      · queue (1 at a time)
                              · per-IP rate limit            Tunnel)         · claude -p
                              · builds system prompt                         · tools OFF
                              · caps history                                 · returns JSON
```

Conversation state is stateless server-side — the client sends trimmed history each turn and Vercel rebuilds the prompt. Nothing persists on EC2, so the knowledge base stays version-controlled in this repo.

| Component | Where | Holds |
|-----------|-------|-------|
| Site + gating | Vercel | Rate limit, validation, system prompt, knowledge base |
| Claude execution | EC2 | `~/.claude` credentials, `claude -p`, request queue |
| Transport | Cloudflare Tunnel | Outbound-only, no inbound ports opened |

### Cost model

Flat monthly, **not** per message. EC2 bills for uptime, so the box costs the same at 0 or 10,000 messages — the opposite of Vercel and Lambda. Claude calls are $0 because they run on the subscription.

| Item | Monthly |
|------|---------|
| t3.micro 24/7 | ~$9.60 |
| 16 GB gp3 | ~$1.54 |
| Data transfer | ~$0 (first 100 GB free) |
| **Total** | **~$11 flat** |

The real per-message cost is **quota**, drawn from the same weekly Claude Code allowance used for development.

---

## Files

**Planned — none of these exist yet**

- `agent/server.mjs` — dependency-free Node HTTP server on EC2; bearer auth, request queue, spawns `claude -p`
- `agent/README.md` — box runbook: swap, Node, service user, systemd, Cloudflare Tunnel
- `lib/chat/knowledge.ts` — hand-written profile the bot answers from
- `lib/chat/prompt.ts` — `buildSystemPrompt()`
- `lib/chat/validate.ts` — `validateChatInput()`, mirrors `lib/contact/validate.ts`
- `lib/chat/ratelimit.ts` — own Upstash limiter, `chat:<ip>` keyspace
- `lib/chat/agent.ts` — `askAgent()`, fails closed
- `app/api/chat/route.ts` — the gate chain
- `components/chat/ChatWidget.tsx` + `ChatLauncher` / `ChatPanel` / `ChatMessage`

**Existing files that will be touched**

- `app/layout.tsx` — mount `<ChatWidget />` beside `<ScrollToTop />`
- `components/ScrollToTop.tsx` — move `bottom-6` → `bottom-24` so the launcher can take that slot
- `.env.local.example` — add `CHAT_AGENT_URL`, `CHAT_AGENT_SECRET`

**External**

- AWS console — instance, security group, billing alerts
- Cloudflare — tunnel hostname

---

## Task Status

| # | Task | Status |
|---|------|--------|
| 1 | AWS account created (Free plan), EC2 confirmed accessible | ✅ |
| 2 | Instance launched — t3.micro, Ubuntu 26.04, 16 GiB, `ap-southeast-1` | ✅ |
| 3 | Security group: SSH from My IP only, HTTP/HTTPS closed | ✅ |
| 4 | Key pair created, copied to `~/.ssh`, SSH verified | ✅ |
| 5 | Root MFA + IAM admin user + billing alarms | ⬜ Not started |
| 6 | Box prepared — 2 GB swap, Node 22, npm 10.9.8, Claude Code 2.1.221 | ✅ |
| 7 | `claudeagent` user + `claude /login` + reboot survival test | ✅ |
| 8 | `agent/server.mjs` + systemd + Cloudflare Tunnel | ⬜ Not started |
| 9 | Vercel gate (`lib/chat/*`, `app/api/chat/route.ts`) | ⬜ Not started |
| 10 | Chat UI (`components/chat/*`) | ⬜ Not started |
| 11 | Knowledge base content written | ⬜ Not started |
| 12 | Tests | ⬜ Not started |

Phases 9–11 are testable locally against a stub agent, so they do not block on the box being finished.

---

## Key Technical Decisions

### D1 — Claude Code CLI on a rented server, not the Anthropic API — committed — 2026-08-05

**Problem**
The chatbot needs to call Claude. The obvious path is the Anthropic API from a Vercel route handler, but per-token API billing was ruled out as unaffordable.

**Decision**
Chosen: run `claude -p` under a personal Claude subscription login on an always-on server, called from Vercel over HTTPS.
- No per-message cost; the subscription is already paid for
- Hosting cost is flat and predictable (~$11/month) regardless of traffic

**Rejected**
- Anthropic API from Vercel. Why not: pay-per-token billing, explicitly out of budget.
- `claude -p` directly on Vercel. Why not: no shell to run `claude /login`, and the read-only ephemeral filesystem cannot hold `~/.claude/.credentials.json` or its rotations. Same for Lambda, Amplify and App Runner.
- Local machine + tunnel. Why not: owner will not leave a laptop running 24/7.
- Scripted non-LLM Q&A widget. Why not: much weaker as a portfolio piece.

**Consequences**
A second always-on host now exists and must be maintained. Visitor traffic consumes the same weekly Claude Code quota used for development, so rate limits protect the owner's own capacity as much as they prevent abuse. A leaked subscription token exposes the whole personal Claude account, where an API key would be scoped and revocable — this is why tool-disabling and the unprivileged service user are non-negotiable.

**Status**: committed · **Reversible**: yes — swapping to the API is a change to `lib/chat/agent.ts` only

### D2 — AWS EC2 over Lightsail, Oracle and Hetzner — committed — 2026-08-05

**Problem**
The always-on host from D1 needed a provider. Cost, reliability and CV value all pulled differently.

**Decision**
Chosen: AWS EC2 t3.micro in `ap-southeast-1`.
- AWS is the cloud name that actually appears in job listings; the instance hardening, IAM, security-group and systemd work is résumé material
- Singapore matches the site's audience and the existing `sin1` Vercel function region

**Rejected**
- Oracle Cloud Always Free. Why not: permanently free and generous specs, but Oracle reclaims idle free instances and terminates free accounts — a bad property for the box holding the credentials.
- Hetzner (~€4/mo). Why not: most reliable and simplest, but not a recognised name on a CV.
- AWS Lightsail. Why not: much easier UI and flat pricing, but a less recognised product name than EC2.

**Consequences**
Steeper learning curve, and the AWS console UX cost real time during setup. The account landed on the credits-based Free plan rather than the old 12-month tier, which carries a hard expiry — see Critical Gotchas. `t4g.micro` (ARM) was intended for the lower price; the launch wizard was left on x86 so `t3.micro` was taken instead — functionally identical here, ~$2/month more.

**Status**: committed · **Reversible**: yes, but re-running `claude /login` on a new box

### D3 — Separate `lib/chat/ratelimit.ts` rather than extending the contact limiter — planned — 2026-08-05

**Problem**
The chat gate needs per-IP rate limiting. `lib/contact/ratelimit.ts` already does this against Upstash.

**Decision**
Chosen: a new module with its own limiter and `chat:<ip>` keyspace, importing `clientIpFromForwardedFor` and `formatRetryAfter` from the contact module.
- `checkRateLimit` has a single hardcoded limiter the contact form depends on; parameterising it means editing a symbol under another feature
- The two need different limits anyway (3 per 10 min vs ~20 per 10 min)

**Rejected**
- Parameterise `checkRateLimit` with a limiter argument. Why not: touches the contact gate's blast radius for no gain, and the shared helpers are already importable without it.

**Consequences**
Two limiter instances against the same Upstash database. Keyspaces must not collide, hence the `chat:` prefix.

**Status**: planned · **Reversible**: yes

---

## Critical Gotchas

### Infrastructure (AWS / EC2)

| Issue | Rule |
|-------|------|
| A serverless host cannot hold a Claude login | `claude /login` needs a browser flow and writes a rotating token to `~/.claude/.credentials.json`. Vercel, Lambda, Amplify and App Runner all have no shell and a read-only ephemeral filesystem, so a hand-copied token breaks the first time it refreshes. Only a persistent machine works |
| Claude Code gets OOM-killed on t3.micro | 1 GB RAM, and the instance idles at 26% before anything is installed. A 2 GB swap file is mandatory, and the `/etc/fstab` line is what makes it survive a reboot. The agent must also serialise to **one** `claude` process at a time — two concurrent ones exhaust the box |
| `t4g` instance types missing from the launch wizard | `t4g` is ARM. The AMI's Architecture dropdown defaults to 64-bit x86, which filters them out. Set Architecture **before** picking the instance type, or accept `t3.micro` (x86) instead |
| The public IPv4 address changes | Stop/start assigns a new one; reboot does not. Breaks the SSH command, not the service — Cloudflare Tunnel dials outbound so it never needs a fixed address |
| SSH stops working after a few days | The security group rule is pinned to "My IP", and a home router reconnect changes it. Fix in EC2 → Security Groups → Edit inbound rules |
| ⚠️ Free-plan account closes automatically | At 6 months or credit exhaustion, whichever is first. AWS retains data 90 days. Upgrading to Paid is lossless and carries remaining credits, but must happen before the deadline or the instance and its `claude` login are destroyed |
| CloudWatch billing metric cannot be found | Billing metrics only exist in `us-east-1`, regardless of where the instances run. Switch region before creating the alarm |
| The `.pem` is rejected as too permissive | WSL cannot hold Unix permissions on the `/mnt/c` Windows mount, so `chmod 400` silently does nothing there. Copy the key into `~/.ssh` first, then `chmod` |
| `apt` fails with `503 Service Unavailable` from `ap-southeast-1.ec2.archive.ubuntu.com` | The AWS regional mirror goes down for hours at a time and apt retries the same host forever. Repoint at the global archive: `sudo sed -i 's\|ap-southeast-1.ec2.archive.ubuntu.com\|archive.ubuntu.com\|g' /etc/apt/sources.list.d/ubuntu.sources` (26.04 uses the deb822 `.sources` file, not `sources.list`) |
| Installing Node via Ubuntu's `nodejs`+`npm` packages | Pulls ~100 separate `.deb` dependencies (`node-ws`, `node-tap`, …) and ships npm 9, so a single mirror hiccup kills the whole install. Use NodeSource instead — its `nodejs` package bundles npm and downloads from `deb.nodesource.com`. If NodeSource's setup script itself dies on `apt-transport-https`, add the repo by hand; that package is a transitional stub modern apt does not need |
| `fallocate: Text file busy` when creating the swap file | Means `/swapfile` already exists and is active swap — this is success, not failure. Confirm with `free -h` rather than retrying |

### Application (Vercel / Next.js)

| Issue | Rule |
|-------|------|
| Prompt injection is a code-execution risk, not just a content risk | Claude Code ships Bash and file tools, and the box holds the account credentials. A visitor can ask it to read `~/.claude/.credentials.json`. A system prompt saying "don't run commands" is a request, not a boundary — disable tools at the CLI flag level, set `cwd` to an empty scratch dir, and run as an unprivileged user |
| The chat gate must fail **closed**, unlike the contact gates | `lib/contact/*` deliberately fails open because losing a real message costs more than admitting spam. A dead agent has no such tradeoff — say "I'm offline, use the contact form" rather than silently passing |
| `lib/projects.ts` is entirely `[placeholder]` text | The bot cannot be fed site content and produce accurate project answers. `lib/chat/knowledge.ts` must be hand-written from `public/resume.pdf` and reviewed by the owner, or it will confidently invent project details |
| Env vars bind at build time | `CHAT_AGENT_URL` and `CHAT_AGENT_SECRET` need a redeploy after being set in Vercel — see `tasks/portfolio/deployment/current.md` |
| No `prefers-reduced-motion` guard anywhere | Site-wide rule, see `AGENTS.md`. The owner runs reduced motion at OS level, so a guard makes every animation snap to its end state |

---

## Bugs Fixed

None yet — no application code written.

---

## Last Session

- Established that `claude -p` cannot run on Vercel; settled the split architecture (Vercel gates, EC2 executes) after several rounds clarifying why no serverless host can hold the login.
- Compared Oracle / Hetzner / Lightsail / EC2 and chose EC2 for CV value (D2).
- Launched instance `i-09a415608db4bf1d9`, verified SSH from WSL, created 2 GB swap.
- Lost time to the AWS regional apt mirror 503ing; fixed by switching to `archive.ubuntu.com` and installing Node from NodeSource rather than Ubuntu's package.
- **Phase 0 gate passed**: `claude -p` answers as `claudeagent` after a reboot, so the credentials persist to disk.

---

## Next Steps

### Blocking Phase 0 completion
- [ ] 🟠 Root MFA, IAM admin user, and stop using root for daily work
- [ ] 🟠 Billing alarms at $10 and $20 (create in `us-east-1`), plus Free tier usage alerts

### Blocking the agent going live
- [ ] 🔴 Write `agent/server.mjs` with bearer auth, single-process queue, tools disabled, hard timeout
- [ ] 🔴 systemd unit bound to `127.0.0.1`, then Cloudflare Tunnel for an HTTPS hostname with no inbound ports
- [ ] 🟠 Verify from outside that nothing but SSH answers on the public IP

### Buildable now, no dependency on the box
- [ ] 🟠 `lib/chat/*` — validate, ratelimit, prompt, agent (against a stub)
- [ ] 🟠 `app/api/chat/route.ts` gate chain, logging via the existing `logGate`
- [ ] 🟠 `components/chat/*` widget, plus moving `ScrollToTop` to `bottom-24`
- [ ] 🟠 Tests mirroring `lib/contact/__tests__/` patterns

### Blocked on the owner
- [ ] 🔴 Write `lib/chat/knowledge.ts` content — needs real project detail that does not exist anywhere in the repo yet

### Deferred / accepted
- [ ] 🟡 Calendar reminder ~January 2027 to decide on upgrading the AWS account to Paid before it auto-closes
- [ ] 🟡 Serving a public chatbot from a personal Claude subscription is outside what Pro/Max is intended for; the API is the licensed path. Owner informed and proceeding deliberately on cost grounds
