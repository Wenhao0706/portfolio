# One-Page Portfolio Revamp Design

**Date**: 2026-08-09
**Status**: Approved, pending implementation plan

## Goal

Collapse the portfolio from five routes to a single scrolling page, rebuild the footer
around a call-to-action layout, and raise the animation craft without adding scroll
distance.

Two content debts are retired as a side effect. Deleting `/projects/[slug]` makes four
bracketed fields per project unused (twelve placeholders total), and the About narrative
shrinks from six unwritten paragraphs to one short section.

Analytics is deliberately **out of this spec**. See "Out of scope".

## Constraints

These are fixed by existing project rules and are not open for reinterpretation during
implementation.

| Constraint | Source |
|---|---|
| No `prefers-reduced-motion` guard anywhere. The owner runs reduced motion at OS level, so a guard silently disables animation for him | `AGENTS.md` "React & Animation" |
| Amber `#B5772E` light / `#D9A441` dark is the single accent in `components/header/*` | `AGENTS.md` "Header Conventions" |
| The `border-b-2` amber nav treatment is reserved for genuine "you are here" state | `AGENTS.md` "Header Conventions" |
| Hover animations need a keyboard-focus equivalent | `AGENTS.md` "Header Conventions" |
| `StackField`'s `COLUMN_WIDTH` must track the page container width in `lib/ui.ts` | `tasks/portfolio/site-chrome/current.md` |
| No fabricated data may render on the page | Owner decision, this session |

## Architecture

One route. `app/page.tsx` becomes a thin orchestrator that renders six sections in order
and owns a single GSAP timeline plus a data-driven scroll-trigger registry.

```
app/page.tsx  (orchestrator, target < 120 lines)
  ├── components/sections/Hero.tsx        #top      (existing markup, moved)
  ├── components/sections/About.tsx       #about    (new, 2-3 paragraphs)
  ├── components/sections/Projects.tsx    #projects (restructured, reordered)
  ├── components/TechStack.tsx            #stack    (unchanged)
  ├── components/sections/Contact.tsx     #contact  (wraps existing ContactForm)
  └── components/Footer.tsx                         (rebuilt, see below)
```

### Deleted

- `app/about/page.tsx`
- `app/projects/page.tsx`
- `app/projects/[slug]/page.tsx`
- `app/contact/page.tsx`
- `getProjectBySlug()` in `lib/projects.ts`, whose only caller was the detail route
- `Project` fields `introduction`, `purposeAndGoal`, `spotlight`, `lessonsLearned`

### Redirects

Permanent 308s in `next.config.ts`. These are load-bearing, not housekeeping. The resume
links to the site, and the chatbot's offline and rate-limit replies tell visitors to use
the contact form.

```
/about          -> /#about
/projects       -> /#projects
/projects/:slug -> /#projects
/contact        -> /#contact
```

### Navigation

`NavTabs.tsx` currently derives active state from `pathname === tab.href`. On a one-pager
`pathname` is always `/`, so every tab would render inactive forever.

It moves to an `IntersectionObserver` that tracks which section owns the viewport and sets
active state from that. The amber `border-b-2` treatment is retained unchanged, since
scroll-spy is still a genuine "you are here" signal and therefore within the header rule.

Tabs become `About`, `Projects`, `Contact`, matching the anchors.

### Retained chrome

`Backdrop`, `StackField` and `ScrollToTop` continue to render from `app/layout.tsx` and are
unchanged. `StackField` was already home-only, so on a single-route site it now applies
everywhere by definition. Its offsets are px-based and tuned to the current page height,
so a page that grows by two sections needs those offsets retuned and its clipping wrapper
verified. Bug B2 in `site-chrome` was exactly this failure and reappears if skipped.

## Projects section

Cards render in **strength order, not data order**:

1. Cleaning Service Booking App (FYP)
2. Tech Strongbox Client Work
3. Finance Management

Rationale: the strongest project cannot be linked (repo private, blocked on the owner's
local cleanup) and the only linkable one is the weakest. Ordering by linkability would put
the weakest work first.

Each card carries title, hook, a 2-3 sentence description, and stack chips.

A "View on GitHub" link renders **only when `repoUrl` is present**. Today that is Finance
Management alone. FYP lights up automatically when its `repoUrl` is added after
republication, with no code change required. Tech Strongbox will likely never have one and
is expected to stay link-free unless a `liveUrl` is supplied.

## Footer

Full rebuild, four stacked bands. Replaces the current identity-and-columns layout.

| Band | Content |
|---|---|
| 1. Call to action | Oversized display heading with terminal cursor. Consistent with the existing `$ resume --download` terminal register in the header |
| 2. Social tiles | Bordered squares for GitHub and Email. LinkedIn included only if a URL is supplied |
| 3. Nav row | Single row of section anchors, replacing the multi-column layout |
| 4. Traffic panel | Layout **reserves the band**; the panel itself is built in the analytics phase |

The current footer builds a Projects column from `lib/projects.ts`. On a one-pager those
would be three links to the same `#projects` anchor, so the column is cut and replaced by
one nav-row link.

The traffic band is designed for and spaced into the footer now, so the analytics phase
drops a component into a reserved slot rather than reopening the layout. No component is
built in this phase, because a component nothing renders is dead code. No placeholder
digits ever appear on a page recruiters read.

## Animation

Direction chosen: **one signature moment plus polished section reveals**. Pinned or
scrubbed scroll-story treatments were rejected because they buy their effect with scroll
distance, which contradicts the goal of a short page.

The existing typed-letter intro in `HomeIntro` is retained.

The signature moment is the projects section. Cards begin as a compact terminal-style
listing and expand into full cards as the section enters view, with stack chips staggering
in afterwards. This reuses the terminal language already established by `HomeIntro` and the
resume button, so the page reads as one idea rather than an unrelated set piece.

### Reveal registry

The current implementation hand-writes trigger objects inside the effect. This becomes an
exported array:

```ts
export const REVEAL_SECTIONS = [
  { trigger: '[data-reveal="about"]',    items: '[data-reveal="about"] > *' },
  { trigger: '[data-reveal="projects"]', items: '[data-reveal="projects-heading"], [data-reveal="project-card"]' },
  // ...
]
```

Adding a section becomes a one-line change rather than another hand-written trigger.

## Error handling

The dominant failure mode is inherited and gets worse on a longer page. Sections start at
`opacity-0` and the scroll triggers are only built after the intro timeline completes. If
that chain fails to fire, the result is a **blank page**, not an unanimated one.

Three defences, in order of reliability:

1. The existing timeout fallback that builds triggers even if `onComplete` never runs. Retained.
2. `ScrollTrigger.refresh()` after construction. Retained.
3. **New**: a test asserting every `trigger` and `items` selector in `REVEAL_SECTIONS`
   matches at least one node in the rendered page. This converts a silent blank-page
   regression into a test failure.

Defence 3 is the reason the registry is exported data rather than inline logic.

## Testing

| Area | Assertion |
|---|---|
| Reveal registry | Every selector in `REVEAL_SECTIONS` matches a rendered node |
| Redirects | Each deleted route returns 308 to its anchor |
| Projects | A project without `repoUrl` renders no GitHub link; one with `repoUrl` renders exactly one |
| Project order | Cards render FYP, Tech Strongbox, Finance Management |
| Nav | Scroll-spy sets active state; accessible names still resolve via `getByRole`, since letters are split into per-letter spans |
| Contact | The existing form suite passes unchanged after the move into a section |
| Footer | No traffic numbers render anywhere in the footer |

Existing suite is 246 tests passing, lint clean, build green. That must hold.

## Copy

Drafted by Claude from sources already in the repo (`lib/chat/knowledge.ts`, the verified
GitHub sources, prior resume work), then edited by the owner.

Prose written for the site avoids em dashes, colons and parenthetical asides, per standing
owner preference.

## Open items

Neither blocks implementation.

- LinkedIn URL, or confirmation to drop the tile. Blocked in `site-chrome` since July.
  `simple-icons` has no LinkedIn icon over trademark, so this needs an inline SVG or a
  text label
- A `liveUrl` for Tech Strongbox, if any client work is publicly viewable

## Out of scope

Deferred to a second piece of work, by owner decision this session:

- PostHog instrumentation for private session replay
- Upstash-backed public counters for the traffic panel (total visits, link clicks, most
  used, last visit)
- The privacy notice and PostHog input masking that session replay requires before it may
  record real visitors
- Rotating the exposed Firebase key and republishing `Wenhao0706/FYP`

Note for the analytics phase: Upstash is already a blocking item in
`tasks/portfolio/chatbot/current.md`. All three chat rate-limit tiers and the contact
form's limiter are inert without it. One Upstash setup closes all three.

PostHog undercounts by design, since `posthog-js` is client-side and blocked by common
privacy extensions at a high rate among technical visitors. It is suitable for behavioural
replay, not for a public visit counter. The counters should be server-side.
