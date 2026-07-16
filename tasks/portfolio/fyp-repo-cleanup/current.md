<!--LLM-CONTEXT
Status: 🔨 In Progress — GitHub history squashed and secret removed, repo private; user doing further local cleanup before republishing
Domain: portfolio
Gotchas (critical — full list in ## Critical Gotchas below):
  - Never assume a repo's visibility history matches its current state — check before trusting it
  - A gitlink (160000 mode entry) with no .gitmodules is a broken/orphaned submodule reference, not a real submodule
Related: tasks/portfolio/content-pages/current.md
Last updated: 2026-07-16
-->

# Portfolio — FYP GitHub Repo Cleanup Summary

## Quick Start (read this first in next session)

**Where we are**: `Wenhao0706/FYP` (the final-year-project cleaning-service booking app — Laravel backend + Flutter frontend — referenced by the portfolio's `geofencing-app` card) had a broken submodule setup and an exposed Firebase API key in old commit history. History was squashed into one clean commit (`backend/` + `frontend/`, secrets gitignored), force-pushed as the new `main`, old `main`/`master` refs deleted. Repo is private and staying that way until the user finishes further local cleanup.

**Immediate next actions (in order)**:
1. No agent action needed until the user asks — they're doing further cleanup on `/mnt/d/Flutter/Projects/fyp` locally first.
2. When the user is ready: rotate/restrict the exposed Firebase key `AIzaSyCcgjC5TxbJlOBlIFmzh5LILAodOplxUdo` in Google Cloud Console (cheap insurance, not urgent — see Bugs Fixed B1).
3. Once the user pushes updated code and is comfortable, make `Wenhao0706/FYP` public again and add its `repoUrl` to `lib/projects.ts`'s `geofencing-app` entry (see `tasks/portfolio/content-pages/current.md`).

**Key facts for cold start**:
- `Wenhao0706/FYP` is currently **private** (`gh repo view Wenhao0706/FYP --json isPrivate`).
- Default branch is `main`, single squashed commit (was `eaaf763` as of this session). Old `master` branch was deleted.
- The user's real, most up-to-date Flutter source lives locally at `/mnt/d/Flutter/Projects/fyp` (WSL path into a Windows D: drive) — it has substantial uncommitted work beyond what was pushed.
- `lib/projects.ts`'s `geofencing-app` entry has no `repoUrl` set — intentional, pending the user's cleanup.

**Gotchas that will trip you**:
- `git status` saying "up to date with origin/main" only reflects the last `fetch` — it does NOT mean the remote hasn't changed since. Run `git ls-remote` for a live check before trusting it.
- Before making any private repo public, run a full-history secret scan first (see Critical Gotchas) — don't assume "it's always been private" means "it's safe to flip."

---

## Overview

While sourcing accurate content for the portfolio's `geofencing-app` project card, investigation of the user's GitHub (`gh` CLI, authenticated as the user) revealed the referenced repo (`FYP`) had a confusing history: its `main` branch was actually orphaned Flutter frontend source, while `master` had a Laravel backend plus a broken gitlink pointing back at that same orphaned Flutter commit. Making the repo public to link it from the portfolio surfaced a real exposed API key in that history, which was immediately reverted and then properly cleaned up.

---

## Files

**External (not in this portfolio repo)**
- `Wenhao0706/FYP` (GitHub, private) — cleaned repo: `backend/` (Laravel API — auth, bookings, scheduling, roles) + `frontend/` (Flutter app — Firebase auth, Stripe payments, Pusher realtime, geofenced arrival/departure alerts)
- `/mnt/d/Flutter/Projects/fyp` (local, WSL path) — the real, most current Flutter source; git remote already points at `Wenhao0706/FYP`, has uncommitted local progress beyond what's pushed
- `Wenhao0706/Finance-management` (GitHub, public) — separate repo, identified this session as the portfolio's `ai-assisted-project` card subject (Angular + ASP.NET Core personal finance tracker)

---

## Task Status

| # | Task | Status |
|---|------|--------|
| 1 | Locate the real source for the portfolio's "geofencing app" card via `gh` | ✅ |
| 2 | Discover local Flutter project matches the orphaned submodule commit | ✅ |
| 3 | Full-history secret scan on both branches (backend + frontend) | ✅ — found one exposed key, no `.env`/DB password/Stripe key |
| 4 | Squash history into one clean commit, gitignore secrets, force-push as new `main` | ✅ |
| 5 | Delete old `main`/`master` refs, set `main` as default | ✅ |
| 6 | Rotate/restrict the exposed Firebase key | ⬜ User's action, not urgent |
| 7 | User finishes further local Flutter cleanup | ⬜ In progress, user-owned |
| 8 | Push updated code, make repo public, wire `repoUrl` into portfolio | ⬜ Blocked on #6/#7 |

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Squash the whole repo into one orphan commit rather than `git filter-repo` on specific blobs | Guarantees no old commit anywhere carries the secret forward; simpler and more certain than surgically rewriting two divergent, tangled branch histories |
| Combine backend + frontend into one repo with `backend/`/`frontend/` folders instead of a real git submodule | The original submodule setup was already broken (gitlink with no `.gitmodules`) and directly contributed to the confusion that led to the exposed secret; a single repo removes that failure mode entirely |
| Keep the repo private after cleanup instead of immediately republishing | User wants to finish further local Flutter cleanup first; the portfolio's project card works fine without a live `repoUrl` link in the meantime |

---

## Critical Gotchas

### Backend
| Issue | Rule |
|-------|------|
| Presence of `.env.example` doesn't prove absence of a real committed `.env` | Verify via full-history content grep (`git log --all -p \| grep -iE "AIza\|sk_live\|DB_PASSWORD="`), not just a filename search — a renamed or differently-named secret file would pass a filename check |

### Frontend
| Issue | Rule |
|-------|------|
| A `160000`-mode tree entry (gitlink) with no accompanying `.gitmodules` file | This is a broken/orphaned submodule reference, likely from `git add <nested-git-dir>` by accident rather than intentional `git submodule add` — check if the referenced SHA is independently reachable (`gh api repos/OWNER/REPO/git/commits/SHA`, `git ls-remote`) before assuming the code behind it is lost |
| `git status`'s "up to date with origin/main" | Reflects the last local `fetch`, not a live remote check — a repo untouched for months can have a stale cached ref while the actual remote has diverged or been restructured |

---

## Bugs Fixed

| ID | Severity | Issue | Fix |
|----|----------|-------|-----|
| B1 | High | Real Google/Firebase API key (`AIzaSyCcgjC5TxbJlOBlIFmzh5LILAodOplxUdo`) committed in `android/app/google-services.json`'s history on `FYP`'s `main` branch, briefly exposed when the repo was made public to add a portfolio link | Squashed repo history into one secret-free commit, added the file to `.gitignore`, reverted repo to private. Repo had been private the entire time before this session except the ~2 minutes it was flipped public — real-world exposure risk assessed as low but not zero. Rotating the key in Google Cloud Console is still recommended |

---

## Last Session

- Investigated `Wenhao0706`'s GitHub via authenticated `gh` CLI to source real content for the portfolio's project cards.
- Found `FYP`'s `main` branch was orphaned Flutter source and `master` was backend + a broken gitlink pointing at that same commit; traced the local Flutter checkout at `/mnt/d/Flutter/Projects/fyp` to the exact same commit SHA.
- Made `FYP` public, immediately found an exposed Firebase API key in `main`'s history via full-history content grep, reverted to private within ~2 minutes.
- Scanned both branches' full history for other secret patterns — found nothing else real (`.env.example` only, blank values).
- Rebuilt the repo as one clean squashed commit combining current backend (from `master`) + current local Flutter source (from disk, more up to date than any pushed commit), with secrets properly gitignored; force-pushed as new `main`, deleted old `main`/`master` refs.
- Also identified `Finance-management` as the real subject of the portfolio's `ai-assisted-project` card (Angular + ASP.NET Core).

---

## Next Steps

- [ ] User finishes further cleanup on `/mnt/d/Flutter/Projects/fyp` locally
- [ ] Rotate/restrict the exposed Firebase key in Google Cloud Console (not urgent)
- [ ] Push updated local Flutter progress once ready
- [ ] Make `Wenhao0706/FYP` public again and add its `repoUrl` to `lib/projects.ts`'s `geofencing-app` entry
