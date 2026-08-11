<!--LLM-CONTEXT
Status: ✅ Shipped — interactive terminal section live on the home page, 33 registry tests + 15 component tests
Domain: portfolio
Gotchas (critical — full list in ## Critical Gotchas below):
  - `lib/terminal/commands.ts` is PURE — it returns described effects, it never touches the DOM, theme or router. Keep it that way or the tests need a browser
  - Every fact it prints is imported from `lib/`; never hardcode a string the page also renders
  - It is deliberately NOT wired to the chatbot. Unknown input points at the chat widget instead of forwarding
Related: tasks/portfolio/content-pages/current.md, tasks/portfolio/chatbot/current.md, tasks/portfolio/site-chrome/current.md
Last updated: 2026-08-11
-->

# Portfolio — Interactive Terminal Summary

## Quick Start (read this first in next session)

**Where we are**: A working shell sits between the Hero and About sections at `#terminal`. Thirteen commands, tab completion, arrow-key history, and a row of one-click buttons for visitors who have never used a shell. All output is read from the same `lib/` modules the page renders from.

**Immediate next actions (in order)**:
1. Nothing is outstanding. The next agreed work is PostHog, not this.
2. If extending: add a command by appending to `COMMANDS` in `lib/terminal/commands.ts`. `help` renders itself from the registry, and a test asserts every command appears in `help`, so there is nothing else to update.

**Key facts for cold start**:
- Registry: `lib/terminal/commands.ts`. UI: `components/sections/TerminalDemo.tsx`.
- `runCommand(input)` returns `{ lines, effect? }`. The component executes effects (`clear`, `theme`, `scroll`, `open`, `download`); the registry only describes them.
- Commands: `help whoami ls cat projects skills contact open goto resume theme clear sudo`.
- `npx vitest run lib/terminal` is 33 tests and needs no DOM.

**Gotchas that will trip you**:
- Adding an effect kind means updating the `TerminalEffect` union AND `applyEffect`'s switch. TypeScript catches the second; nothing catches a described effect nobody executes.
- `SUGGESTED_COMMANDS` fire from a single click, so a test asserts none of them carries an effect. Do not add `clear`, `theme` or `resume` to that list.
- Tab is intercepted for completion, which traps focus in the input. Escape blurs; the field's `sr-only` label says so.

---

## Overview

The site's whole identity is an IDE/terminal, but that vocabulary stopped at the intro overlay. The terminal makes the metaphor real and gives a frontend candidate something an interviewer can play with, which a fade-up reveal does not. Built after the one-page revamp, placed after the Hero so every visitor sees it without it blocking the page.

Deliberately separate from the LLM chat widget. Placement and separation were both chosen by the user (options presented, "own section after the hero" and "keep them fully separate").

---

## Files

- `lib/terminal/commands.ts` — the registry. Pure. Exports `runCommand`, `complete`, `COMMAND_NAMES`, `SUGGESTED_COMMANDS`, `GOTO_TARGETS`, `PROMPT`.
- `lib/terminal/__tests__/commands.test.ts` — 33 tests, no DOM.
- `components/sections/TerminalDemo.tsx` — transcript, input, history, tab completion, effect execution.
- `components/__tests__/TerminalDemo.test.tsx` — 15 tests including history boundaries and effect dispatch.
- `lib/{about,projects,tech,site}.ts` — where every printed fact comes from.

---

## Task Status

| # | Task | Status |
|---|------|--------|
| 1 | Pure command registry + effect protocol | ✅ |
| 2 | Terminal UI: transcript, prompt, focus-on-click, scroll pinning | ✅ |
| 3 | Tab completion over commands, files, project slugs, goto targets | ✅ |
| 4 | Arrow-key history, including both boundary behaviours | ✅ |
| 5 | Non-technical on-ramp: one-click command buttons | ✅ |
| 6 | Forgiving input: bare project slugs, `projects/` with or without slash | ✅ |
| 7 | `theme` command sharing the header's context | ✅ — required hoisting `ThemeProvider` to `app/layout.tsx` |

---

## Key Technical Decisions

### D-pure-registry — The command registry is pure; the component executes effects
**Problem**: The interesting part of a terminal is parsing and output, and that is exactly the part a DOM-coupled implementation makes hard to test.
**Decision**: `runCommand` returns lines plus an optional described `TerminalEffect`. The component owns all side effects.
**Rejected**: Letting commands call `document`/`window` directly — simpler to write, needs jsdom and mocks for every assertion.
**Consequences**: 33 registry tests run with no browser. Adding an effect kind requires touching two places, and only one of them is type-checked.
**Status**: shipped 2026-08-10

### D-separate-from-chat — Unknown input points at the chat widget rather than forwarding to it
**Problem**: The site already has an LLM chat widget, so two "type at me" surfaces risk reading as redundant.
**Decision**: The terminal stays deterministic and offline. `command not found` names the chat widget as the place for open questions.
**Rejected**: Falling through to the chat backend for unrecognised input — the most impressive option, but it makes the terminal's behaviour depend on a rate limit the visitor cannot see, and inherits the chat's failure modes.
**Consequences**: The two surfaces stay explainable. A visitor typing a sentence gets a dead end plus a pointer, not an answer.
**Status**: shipped 2026-08-10, user's explicit choice

### D-click-to-run — Lead with buttons, not a bare prompt
**Problem**: A blinking cursor is an invitation only to people who already use shells. The audience includes non-technical recruiters, for whom an empty prompt reads as a test.
**Decision**: A row of one-click buttons above the terminal runs `help`, `whoami`, `projects`, `skills`, `contact`.
**Rejected**: A typed auto-demo on scroll — shows the same output but proves nothing is interactive, which is the entire point of the section.
**Consequences**: The set must stay non-destructive, since one click is the whole confirmation. A test asserts no suggested command carries an effect.
**Status**: shipped 2026-08-10

| Decision | Rationale |
|----------|-----------|
| Dark terminal palette in BOTH site themes | A terminal that turns cream in light mode stops reading as a terminal |
| `cat` accepts a bare slug as well as `projects/<slug>` | Nobody outside a shell thinks to type the prefix; refusing it is pedantry aimed at the visitor least able to recover |
| `open` on a repo-less project refuses and then points at `cat <slug>` | Same no-dead-links rule the cards follow, but every other error in the file offers a next step |
| `open` falls back to the first live site when a project has no repo, and says so | One slug now has several destinations; silently picking one lets a visitor conclude the other four do not exist |

---

## Critical Gotchas

### Frontend
| Issue | Rule |
|-------|------|
| Effect union vs executor | Adding a `TerminalEffect` kind needs `applyEffect`'s switch updated too. A described effect nobody executes fails silently |
| One-click commands | `SUGGESTED_COMMANDS` run with no confirmation. Never add a destructive or state-changing command; the test asserting `effect === undefined` is the guard |
| Tab key | Intercepted for completion, which traps focus. Escape blurs — keep that documented in the input's `sr-only` label |
| `theme` command | Depends on `ThemeProvider` wrapping the whole tree from `app/layout.tsx`. Moving the provider back inside Header breaks it with a thrown `useTheme` error |
| History recall | Overrunning the OLDEST entry must stay put; only overrunning the newest returns to an empty line. Treating both the same wipes what the visitor was about to run |
| Test fixtures for "nothing to open" | Select them through `openTarget(project)`, never a hand-written `!p.repoUrl`. The inverse-of-the-rule copy silently stopped discriminating the day `sites` was added — see AGENTS.md |

---

## Bugs Fixed

| Bug | Root cause | Fix |
|-----|-----------|-----|
| ArrowUp past the oldest history entry cleared the input | `next < 0` and `next >= length` shared one branch | Split the two boundaries; clamp at the oldest. Found by the `/done` reviewer, boundary was untested |
| `open <repo-less project>` dead-ended with no next step | The refusal was correct but stopped there, unlike every other error path in the file | Appends a `cat <slug>` suggestion. Found by the product reviewer |

---

## Last Session

- `open` gained a repo→site fallback via `openTarget(project)`, which returns the destination plus how many others exist; the extra-destinations line is driven off that count rather than re-deriving the precedence rule.
- `cat <slug>` now prints the five client sites under a "built from scratch, sole developer" heading, column-aligned on a width derived from the longest label.
- Both test files' "nowhere to go" fixtures were re-derived from `openTarget` after the hand-written `!p.repoUrl` predicate stopped selecting what it claimed to.

---

## Next Steps

**Nothing outstanding.** Ideas parked, none agreed:
- [ ] A `history` command, now that history is already tracked
- [ ] Persist the transcript across a page reload
