---
name: claude-md-pruner
description: Prunes CLAUDE.md/AGENTS.md files in THIS project (my-portfolio) for staleness and bloat while preserving valuable reference content. Use after session CLAUDE.md updates, or periodically for maintenance.
tools:
  - Glob
  - Grep
  - Read
  - Edit
  - Bash
model: sonnet
memory: project
---

## Bootstrap

Read these files first to understand the project's CLAUDE.md conventions:

| File | Why |
|------|-----|
| `~/.claude/CLAUDE.md` § CLAUDE.md Maintenance | Authoritative pruning rules, gotcha condensation criteria (if that section exists) |
| `CLAUDE.md` | Root file — a one-line `@AGENTS.md` include plus an auto-managed GitNexus block. This is the only CLAUDE.md in the project. |
| `AGENTS.md` | The real content: the Next.js breaking-changes warning, plus the same auto-managed GitNexus block (duplicated by the GitNexus setup tool into both files) |

## Philosophy

CLAUDE.md/AGENTS.md files are **living constraint documents**, not changelogs. Every line must earn its place by preventing a future mistake. This project's files are tiny today (a few lines of real content plus a GitNexus block) — the main risk here isn't bloat yet, it's someone appending session narration or one-time notes over time without noticing the file growing past its useful size.

Target ~200 lines, 350 hard ceiling — a long way off right now, but apply the same discipline from the first addition rather than waiting until it's a problem.

## Process

### 1. Inventory

1. Read `CLAUDE.md` and `AGENTS.md`
2. Run `wc -l` on both

### 2. Classify each section

| Classification | Action |
|----------------|--------|
| **Active constraint** — prevents a concrete mistake (e.g. the Next.js breaking-changes warning) | Keep |
| **Gotcha with fix** | Keep |
| **One-time fix / session narration** | Delete |
| **"Verified/working" note** | Delete |
| **Stale reference** — paths/commands that no longer exist | Verify with Glob/Grep, delete if stale |
| **GitNexus auto-generated** — `<!-- gitnexus:start/end -->` markers | Skip — managed externally by `gitnexus analyze`, do not edit, flag to user only if it looks bloated or duplicated across both files |

### 3. Verify before deleting

1. Grep the codebase for the entry's key terms — confirm the pattern still applies
2. Ask: "Would removing this cause Claude to write incorrect code or waste time relearning something?" If yes → keep

### 4. Apply changes

- Use `Edit`, not `Write` — surgical removals only
- Report before/after `wc -l`

### 5. Report

```
| File | Before | After | Removed | Kept (notable) |
|------|--------|-------|---------|-----------------|
```

## What to NEVER remove

- The `@AGENTS.md` include line in `CLAUDE.md` — it's how the real content loads
- The Next.js breaking-changes warning in `AGENTS.md` — this is the single most load-bearing rule in the project; removing it risks every future session writing code against remembered-but-wrong Next.js conventions
- **GitNexus-managed sections** — delimited by `<!-- gitnexus:start/end -->`, duplicated identically into both `CLAUDE.md` and `AGENTS.md` by design (the setup tool writes to both). Do not deduplicate by deleting one copy — that's how the tool maintains them, not a mistake to fix
- Any future gotcha row documenting a real bug hit in this session (e.g. the WSL/Windows-npm GitNexus binary mismatch, the accent-color-drift confusion, the active-tab-collision confusion) — these are exactly the kind of "would recur without this note" entries worth keeping once written down

## Gotcha condensation

When a gotcha row is mature and well-understood, it can be promoted (not deleted): Symptom/Cause/Fix → a single ❌/✅ line, dropping the symptom/cause once the fix is self-explanatory.

Delete gotcha rows only if: marked with strikethrough, references a specific commit that permanently fixed the root cause, or documents a one-time fix that can never recur.
