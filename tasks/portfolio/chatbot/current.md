<!--LLM-CONTEXT
Status: 🔨 In Progress — the whole Vercel side is built, tested and verified end-to-end against a local agent; the EC2 half is the only thing between here and live
Domain: portfolio
Gotchas (critical — full list in ## Critical Gotchas below):
  - `claude -p` MUST run with --safe-mode, and must NEVER run with --bare
  - Nothing serverless can hold the Claude login — Vercel, Lambda and Amplify are ruled out by the same constraint
  - The knowledge base is PUBLIC TEXT — anything in it can be recited to a visitor
  - Cost is flat monthly, NOT per message; the real per-message cost is Claude quota
Related: tasks/portfolio/deployment/current.md, tasks/portfolio/contact-form/current.md
Last updated: 2026-08-05
-->

# Portfolio — Chatbot Summary

## Quick Start (read this first in next session)

**Where we are**: Every Vercel-side piece exists and passes — gate chain, widget, 3-tier rate limiter, knowledge base. Verified end-to-end against `agent/server.mjs` running on localhost, with real `claude -p` answers in ~6s. **Not deployed anywhere**: the EC2 box has no agent server, no systemd unit and no tunnel, so production would answer "I'm offline" to every message.

**Immediate next actions (in order)**:
1. `ssh -i ~/.ssh/claude-agent-key.pem ubuntu@56.10.8.219`
2. Deploy `agent/server.mjs` + systemd + Cloudflare Tunnel — follow `agent/README.md`, which is a complete unexecuted runbook
3. Set `CHAT_AGENT_URL` / `CHAT_AGENT_SECRET` in Vercel, then **redeploy** (env binds at build time)
4. Confirm `curl https://chat.manhou.de/health` answers from outside before shipping the widget

**Run it locally meanwhile**:
```bash
CHAT_AGENT_SECRET="$(grep '^CHAT_AGENT_SECRET=' .env.local | cut -d= -f2)" \
  node agent/server.mjs        # terminal 1
npm run dev                    # terminal 2
```
`.env.local` already holds a throwaway dev value and points `CHAT_AGENT_URL` at
`http://localhost:8787`. The server refuses to start with the secret unset.

**Gotchas that will trip you**:
- Never add `--bare` to the CLI args; `--safe-mode` is mandatory. See Critical Gotchas
- `lib/chat/knowledge.ts` is public text and still needs the owner's factual review
- Root MFA, IAM admin user and billing alarms are **still not set up**

**Success looks like**: `POST /api/chat` on production returns a real answer in <10s, and `[chat-gate]` lines appear in Vercel logs only on blocks or degradation.

---

## Overview

A chat widget in the bottom-right corner answering recruiter-style questions about the site owner — background, skills, projects, availability — with light humour, declining anything unrelated, in whatever language the visitor writes.

Runs the Claude Code CLI under a personal Claude subscription. **There is no `ANTHROPIC_API_KEY` and no pay-per-token billing anywhere in this design**; that constraint dictates the architecture.

---

## Architecture

```
Browser  ──POST /api/chat──▶  Vercel route handler       ──HTTPS+Bearer──▶  EC2
(ChatWidget)                  · shape + size checks        (Cloudflare      · queue (1 at a time)
                              · 3-tier rate limit           Tunnel)         · claude -p --safe-mode
                              · builds system prompt                        · tools OFF
                              · caps history                                · returns JSON
```

Conversation state is stateless server-side — the client sends trimmed history each turn and Vercel rebuilds the prompt. Nothing persists on EC2; history lives in the visitor's own `localStorage`.

| Component | Where | Holds |
|-----------|-------|-------|
| Site + gating | Vercel | Rate limit, validation, system prompt, knowledge base |
| Claude execution | EC2 | `~/.claude` credentials, `claude -p`, request queue |
| Transport | Cloudflare Tunnel | Outbound-only, no inbound ports opened |
| Chat history | Visitor's browser | `localStorage`, capped at 20 messages |

### Rate limiting

Three tiers, checked cheapest-first. Tier order is load-bearing: each `.limit()` call consumes a slot, so a visitor refused at burst never spends the global budget on the way to being refused.

| Tier | Limit | Key | Stops |
|------|-------|-----|-------|
| Burst | 20 / 10 min | `chat:burst:<ip>` | One visitor hammering |
| Daily | 40 / day | `chat:day:<ip>` | The same visitor grinding all day |
| Global | 400 / day | `chat:global:day` | Everything else, including VPN hopping |

Loopback skips all three, gated on `NODE_ENV !== 'production'`. All tiers fail OPEN; the agent call fails CLOSED.

### Cost model

Flat monthly, **not** per message: ~$9.60 t3.micro + ~$1.54 gp3 ≈ **$11**. Claude calls are $0 on the subscription. The real per-message cost is **quota**, drawn from the same weekly Claude Code allowance used for development — which is what the global tier exists to bound.

---

## Files

**Vercel side**
- `lib/chat/knowledge.ts` — the only facts the bot may use, plus its "Off limits" block. Treat as public text
- `lib/chat/prompt.ts` — `buildSystemPrompt()`, `buildTranscript()`
- `lib/chat/validate.ts` — `validateChatInput()`; caps history at 12 messages × 1000 chars
- `lib/chat/ratelimit.ts` — 3 tiers, `maskIp()`, `LOOPBACK_IPS`
- `lib/chat/agent.ts` — `askAgent()`, fails closed, 40s timeout
- `lib/chat/gate-log.ts` — `logChatGate()`, own `[chat-gate]` prefix
- `app/api/chat/route.ts` — the gate chain; `maxDuration = 60`
- `app/api/chat/ip/route.ts` — returns the caller's own address for the panel header
- `components/chat/` — `ChatWidget` (state) · `ChatPanel` · `ChatLauncher` · `ChatMessage` · `BotAvatar` · `useChatHistory`

**EC2 side**
- `agent/server.mjs` — dependency-free Node server: bearer auth, single-slot queue, spawns `claude -p`
- `agent/README.md` — box runbook: deploy, systemd unit, tunnel, verification, gotchas

**Shared / touched**
- `lib/ui.ts` — gained `FOCUS_RING` + `RAISED_SURFACE`
- `lib/contact/ratelimit.ts` — `isConfigured` exported as `isUpstashConfigured`
- `app/layout.tsx` · `components/ScrollToTop.tsx` · `app/globals.css` · `.env.local.example`

---

## Task Status

| # | Task | Status |
|---|------|--------|
| 1-4 | AWS account, instance, security group, SSH verified | ✅ |
| 5 | Root MFA + IAM admin user + billing alarms | ⬜ Not started |
| 6-7 | Box prepared (swap, Node, CLI) + `claudeagent` login surviving reboot | ✅ |
| 8 | `agent/server.mjs` written and verified locally | ✅ |
| 9 | Deploy to EC2: systemd unit + Cloudflare Tunnel | ⬜ **Ship-blocker** |
| 10 | Vercel gate (`lib/chat/*`, `app/api/chat/*`) | ✅ |
| 11 | Chat UI (`components/chat/*`) | ✅ |
| 12 | Knowledge base written — **owner review still outstanding** | 🔨 |
| 13 | Tests — 246 passing, lint clean, build green | ✅ |

---

## Key Technical Decisions

### D1 — Claude Code CLI on a rented server, not the Anthropic API — committed — 2026-08-05

**Problem** — The chatbot needs to call Claude, but per-token API billing was ruled out as unaffordable.

**Decision** — Run `claude -p` under a personal subscription login on an always-on server, called from Vercel over HTTPS. No per-message cost; hosting is flat (~$11/mo) regardless of traffic.

**Rejected**
- Anthropic API from Vercel. Pay-per-token, out of budget.
- `claude -p` directly on Vercel/Lambda/Amplify. No shell for `claude /login`, and a read-only ephemeral filesystem cannot hold `~/.claude/.credentials.json` or its rotations.
- Local machine + tunnel. Owner will not leave a laptop running 24/7.

**Consequences** — Visitor traffic consumes the same weekly quota used for development, so rate limits protect the owner's own capacity as much as they prevent abuse. A leaked subscription token exposes the whole personal Claude account, which is why tool-disabling and the unprivileged service user are non-negotiable.

**Status**: committed · **Reversible**: yes — swapping to the API touches `lib/chat/agent.ts` only

### D2 — AWS EC2 over Lightsail, Oracle and Hetzner — committed — 2026-08-05

**Problem** — The always-on host needed a provider; cost, reliability and CV value pulled differently.

**Decision** — EC2 t3.micro in `ap-southeast-1`. AWS is the cloud name that appears in job listings, and the hardening/IAM/systemd work is résumé material. Singapore matches the site's audience and the `sin1` function region.

**Rejected**
- Oracle Cloud Always Free. Reclaims idle instances and terminates free accounts — bad for the box holding the credentials.
- Hetzner (~€4/mo). Most reliable and simplest, but not a recognised CV name.
- Lightsail. Easier UI, less recognised product name.

**Consequences** — Steeper learning curve. The account landed on the credits-based Free plan with a hard expiry (see Critical Gotchas). `t4g.micro` was intended; the wizard was left on x86 so `t3.micro` was taken — functionally identical, ~$2/mo more.

**Status**: committed · **Reversible**: yes, but re-running `claude /login` on a new box

### D3 — Separate `lib/chat/ratelimit.ts` rather than extending the contact limiter — shipped — 2026-08-05

**Problem** — The chat gate needs per-IP rate limiting, which `lib/contact/ratelimit.ts` already does.

**Decision** — A new module with its own limiters and `chat:` keyspace, importing `clientIpFromForwardedFor`, `formatRetryAfter` and `isUpstashConfigured` from the contact module.

**Rejected** — Parameterise `checkRateLimit` with a limiter argument. Touches the contact gate's blast radius for no gain, and the three chat tiers need a different return shape (`scope`) anyway.

**Consequences** — Two limiter sets against one Upstash database; the `chat:` prefix is what keeps the keyspaces apart.

**Status**: shipped · **Reversible**: yes

### D4 — A global daily cap, instead of trying to identify devices — shipped — 2026-08-05

**Problem** — Per-IP limits alone are defeated by a VPN, incognito or a botnet, and the failure mode is a drained weekly Claude allowance.

**Decision** — Add a per-IP daily tier AND a **global** 400/day tier counting every visitor into one bucket. The global tier is the only one that cannot be defeated by changing address, so identifying a *person* stops being necessary.

**Rejected**
- Browser fingerprinting. Privacy-invasive, GDPR/PDPA consent obligations, defeated by a different browser anyway, and a bad look on a portfolio a recruiter is inspecting.
- Signed ID cookie alongside IP. Cleared by incognito or one devtools click, so it adds complexity while catching only the laziest abuser.
- Per-IP daily only. Leaves no upper bound: 100 distinct IPs × 40 is 4,000 messages/day, all legitimate by that rule.

**Consequences** — One busy day can lock the bot for everyone until tomorrow; the global message deliberately blames nobody, since the visitor reading it may have sent nothing. Prefer raising the number to removing the tier.

**Status**: shipped · **Reversible**: yes

### D5 — Infrastructure facts removed from the knowledge base, not merely forbidden — shipped — 2026-08-05

**Problem** — The knowledge base described the deployment as a portfolio talking point, and the live bot recited the backend topology to a visitor and then invented reassurances about how secure it was.

**Decision** — Delete the facts from `lib/chat/knowledge.ts` entirely, then add an "Off limits" block and prompt rules on top, plus a regression test asserting the terms never return. What remains is that the owner built and hardened the infrastructure himself and will detail it in an interview.

**Rejected** — Keep the facts and forbid disclosure in the prompt. A prompt rule is a request the model can be argued past; a string that is not in the file cannot be recited.

**Consequences** — `lib/chat/knowledge.ts` must be treated as **public text**. The regression test must be updated deliberately, never relaxed to make a build pass.

**Status**: shipped · **Reversible**: yes, but see the rejected option

---

## Critical Gotchas

### Agent / EC2

| Issue | Rule |
|-------|------|
| `claude -p` narrates its own scaffolding into a visitor's reply | Without `--safe-mode` the CLI injects CLAUDE.md, skills, plugins and hooks into the run; a real answer came back opening with "This isn't a coding task, so no skills needed here". `--safe-mode` disables customizations only and leaves the OAuth login alone |
| ⚠️ `--bare` looks like the right lockdown flag and destroys the whole design | It forces auth to `ANTHROPIC_API_KEY` and never reads the OAuth login, which is the one thing this architecture exists to use. Never add it |
| A serverless host cannot hold a Claude login | `claude /login` needs a browser flow and writes a ROTATING token to `~/.claude/.credentials.json`. Vercel, Lambda, Amplify and App Runner have no shell and a read-only ephemeral filesystem, so a hand-copied token breaks at the first refresh |
| Claude Code gets OOM-killed on t3.micro | 1 GB RAM, idling at 26%. The 2 GB swap file and its `/etc/fstab` line are mandatory, and the agent must serialise to **one** `claude` process — two concurrent ones exhaust the box |
| The login fails a few hours after it was verified | The credentials file rotates, so `ProtectHome=read-only` in the systemd unit blocks the write. Keep `/home/claudeagent/.claude` in `ReadWritePaths` |
| `claude` works as `ubuntu` but not under systemd | `Environment=` replaces the shell env, and `HOME` is how `claude` finds its credentials. `server.mjs` passes `HOME` through to the child explicitly — do not strip it |
| ⚠️ Free-plan account closes automatically | At 6 months or credit exhaustion, whichever is first. AWS retains data 90 days. Upgrading to Paid is lossless but must happen before the deadline or the instance and its login are destroyed |
| CloudWatch billing metric cannot be found | Billing metrics exist only in `us-east-1` regardless of where instances run. AWS Budgets is the easier route; the credit balance itself is console-only, with no API |
| `apt` 503s from `ap-southeast-1.ec2.archive.ubuntu.com` | The AWS regional mirror goes down for hours and apt retries the same host forever. Repoint at `archive.ubuntu.com` in `/etc/apt/sources.list.d/ubuntu.sources` (26.04 uses deb822) |
| The `.pem` is rejected as too permissive | WSL cannot hold Unix permissions on `/mnt/c`, so `chmod 400` silently does nothing there. Copy the key into `~/.ssh` first, then `chmod` |
| SSH stops working after a few days | The security-group rule is pinned to "My IP" and a home router reconnect changes it |

### Application (Vercel / Next.js)

| Issue | Rule |
|-------|------|
| The knowledge base is a disclosure surface, not just content | Anything in `lib/chat/knowledge.ts` can be recited verbatim to any visitor, in any language. If it would not go on the homepage, it does not belong there. See D5 |
| The bot invents security assurances if allowed to reason | It claimed the architecture "cuts off common attack surfaces" — a sentence in no source file. The prompt must forbid assessing security outright; there is no correct improvised answer |
| Guard rails weaken in languages they were not written in | The gate must state that the language never changes what may be disclosed, and refusals must be delivered in the visitor's own language. Verified against Malay, Tamil, Japanese, Arabic, Spanish, Vietnamese and Korean |
| Prompt injection is a code-execution risk, not just a content risk | The box holds the account credentials, so "don't run commands" in a prompt is a request, not a boundary. Tools are disabled at the flag level, `cwd` is an empty dir, and the process runs unprivileged |
| The chat gate fails **closed**, unlike the contact gates | `lib/contact/*` fails open because losing a real message costs more than admitting spam. A dead agent has no such tradeoff — say "I'm offline, use the contact form". The rate limiter is the one exception and fails open, because a broken Upstash must not turn visitors away from a working bot |
| The client-side `blocked` flag is UX, never security | The server re-checks every request, so clearing it in devtools earns a second identical refusal. It exists so a visitor is not invited to keep typing into a form whose every submission is already decided |
| An IP-keyed gate looks inert locally for two separate reasons | `next dev` sets `x-forwarded-for` to `::1` (not absent, as it appears), and `.env.local` carries no Upstash credentials. The `[chat-gate] ratelimit degraded` line names which one fired |
| `lib/projects.ts` and `app/about/page.tsx` are `[placeholder]` text | The bot cannot be fed site content and produce accurate project answers, which is why `knowledge.ts` is hand-written and must be reviewed by the owner |
| Env vars bind at build time | `CHAT_AGENT_URL` and `CHAT_AGENT_SECRET` need a redeploy after being set in Vercel |
| No `prefers-reduced-motion` guard anywhere | Site-wide rule, see `AGENTS.md`. `.animate-float` in `globals.css` is the one violation of it, so the launcher uses its own keyframes |

---

## Bugs Fixed

| Bug | Root cause | Fix |
|-----|-----------|-----|
| The bot disclosed the backend topology to a visitor and volunteered a security assessment | `knowledge.ts` listed the provider, tunnel and open-port posture as a portfolio talking point; the security claim was improvised from them | Removed the facts, added an "Off limits" block and prompt rules, plus a regression test asserting the terms never return. See D5 |
| Replies opened with "This isn't a coding task, so no skills needed here" | `claude -p` injects its agent scaffolding into the run and the model narrates it | Added `--safe-mode`, plus an OUTPUT RULE stating the output is rendered verbatim |
| `reset()` deleted the stored history and it immediately came back as `[]` | The save effect re-ran on the now-empty array and wrote over the delete | The save effect removes the key when the transcript is empty instead of storing `[]` |
| A leak-regression test failed on the word "portfolio" | The forbidden-term check used substring matching, and `port` is inside `portfolio` | Word-boundary matching — a check that cries wolf gets deleted, taking the real protection with it |

---

## Last Session

- Built the entire Vercel side and the EC2 agent server; verified end-to-end against real `claude -p` (~6s answers), including auth, validation and queue paths.
- Found and fixed an information-disclosure defect in the live bot (D5), then probed the fix in seven languages plus two social-engineering framings.
- Replaced the single rate limit with three tiers after establishing the burst window alone permitted ~2,880 messages/day from one address (D4).
- Confirmed by grepping the built client bundle that the prompt, knowledge base and secrets are server-only, with positive controls.
- Code review found one convention miss (a hover animation without its focus equivalent); the simplifier extracted `useChatHistory`, `FOCUS_RING` and `RAISED_SURFACE`.

---

## Next Steps

### Blocking go-live
- [ ] 🔴 Deploy `agent/server.mjs` to EC2: systemd unit, Cloudflare Tunnel, then Vercel env vars + redeploy (`agent/README.md`)
- [ ] 🔴 Owner to read `lib/chat/knowledge.ts` end to end — every fact the bot states about him comes from that file
- [ ] 🟠 Verify from outside that nothing but SSH answers on the public IP

### Blocking Phase 0 completion
- [ ] 🟠 Root MFA, IAM admin user, stop using root for daily work
- [ ] 🟠 AWS Budgets at $10 and $20 plus a zero-spend budget; credit balance is console-only

### Decisions the owner owes
- [ ] 🟠 The panel header shows the visitor's **unmasked** IP as `you@<ip>`, while `maskIp()` masks it everywhere else. Product review flagged this as reading invasive to recruiters and inconsistent with the codebase's own privacy reasoning. Deliberate choice by the owner; masking keeps the joke
- [ ] 🟡 Resolve `globals.css`'s `prefers-reduced-motion` guard on `.animate-float` against the site-wide rule in `AGENTS.md` — one of the two is wrong

### Product gaps (from review, not yet scoped)
- [ ] 🟡 Nothing outside the widget tells a recruiter an AI assistant exists; discovery depends on a 2.6s hint window
- [ ] 🟡 "New chat" while rate-limited clears the transcript but leaves the composer locked with no explanation

### Refactor — file size, for future sessions
Large files cost a future session (human or AI) real effort to load and reason about, and these crossed the line while the feature was being built. None is urgent; all are worth splitting before the next substantial change to them.

| File | Lines | Suggested split |
|------|-------|-----------------|
| `agent/server.mjs` | 269 | Extract the queue and `runClaude` into `agent/lib/` modules, leaving the HTTP handler thin |
| `lib/chat/__tests__/ratelimit.test.ts` | 246 | Split the tier-order and fail-open suites from the `maskIp` suite |
| `components/__tests__/ChatWidget.test.tsx` | 244 | Split persistence and IP-header suites into their own files |
| `components/chat/ChatPanel.tsx` | 225 | Extract the title bar and the composer into sibling components |
| `lib/chat/ratelimit.ts` | 222 | Move `maskIp` + `LOOPBACK_IPS` into `lib/chat/ip.ts` |

This doc is also near its own 300-line budget — run `condense-task-doc` before the next large addition rather than after.

### Deferred / accepted
- [ ] 🟡 Calendar reminder ~January 2027 to upgrade the AWS account to Paid before it auto-closes
- [ ] 🟡 Serving a public chatbot from a personal Claude subscription is outside what Pro/Max intends; the API is the licensed path. Owner informed and proceeding deliberately on cost grounds
