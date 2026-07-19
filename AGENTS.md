<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Gotchas {#general-gotchas}

| Symptom | Cause | Fix |
|---------|-------|-----|
| Next.js `<Image>` console warning "has either width or height modified, but not the other" persists even after adding `style={{ height: 'auto' }}` | Tailwind Preflight's `img { height: auto }` already overrides the `height` attribute; fixing `width` to a px value while only `height` is `'auto'` reproduces the same one-axis-overridden mismatch | Set **both** `width: 'auto'` and `height: 'auto'` in the `style` prop so the browser derives the ratio from the `width`/`height` attributes instead |

## Header Component Conventions {#header-conventions}

| ❌ NEVER | ✅ ALWAYS |
|----------|----------|
| Introduce a second accent color in `components/header/*` | Reuse amber (`#B5772E` light / `#D9A441` dark) — the site's single deliberate accent |
| Apply the active nav-tab's `border-b-2` amber treatment to a non-active element at rest | Reserve it for `NavTabs.tsx`'s route-matched state only — reusing it elsewhere reads as a false "you are here" signal |
| Start a new GSAP tween/timeline (including inside a mouse-leave handler) without killing/tracking the previous one | Store every tween in a ref and kill it before starting a new one — see `AnimatedName.tsx` |
| Add a `prefers-reduced-motion` guard to a header hover animation | Header animations must always play regardless of OS motion settings — explicit user decision, do not reintroduce `matchMedia('(prefers-reduced-motion: reduce)')` checks or `motion-reduce:` variants here |
| Ship a hover-only animation (GSAP tween or CSS `group-hover:`) without a keyboard-focus equivalent | Mirror `onMouseEnter`/`onMouseLeave` with `onFocus`/`onBlur`, or use `group-focus-visible:` for CSS — see `ResumeDownload.tsx`/`NavTabs.tsx` |

### Gotchas

| Symptom | Cause | Fix |
|---------|-------|-----|
| `<html>` hydration mismatch console warning on load | The `beforeInteractive` no-flash theme script in `app/layout.tsx` mutates `document.documentElement.classList` before React hydrates | Expected — `suppressHydrationWarning` on `<html>` is intentional, do not remove it or the script |
| `getByRole('link', { name: /.../ })` / `getByText(...)` can't match a spaced or multi-word string even though it visibly renders correctly | Testing Library's text matching can't assemble a string split across sibling `<span>` elements (one per letter) | Match by accessible name via `getByRole`, not `getByText`, when a label is split into individual letter spans (see `AnimatedName.tsx`, `NavTabs.tsx`) |
| SVG `<filter>` (e.g. glow/blur) applied to a thin `<line>` or other zero-height/zero-width shape renders nothing — the element vanishes | Default `filterUnits="objectBoundingBox"` sizes the filter region as a percentage of the element's own bounding box; a zero-height line has a zero-height bbox, so the region collapses to zero and clips all output | Set `filterUnits="userSpaceOnUse"` with explicit absolute `x`/`y`/`width`/`height` on the `<filter>` instead of percentages |

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **portfolio** (153 symbols, 162 relationships, 1 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/portfolio/context` | Codebase overview, check index freshness |
| `gitnexus://repo/portfolio/clusters` | All functional areas |
| `gitnexus://repo/portfolio/processes` | All execution flows |
| `gitnexus://repo/portfolio/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
