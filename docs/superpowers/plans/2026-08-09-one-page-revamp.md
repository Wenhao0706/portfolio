# One-Page Portfolio Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the portfolio from five routes to one scrolling page, rebuild the footer around a call-to-action layout, and add a signature reveal to the projects section.

**Architecture:** `app/page.tsx` becomes a thin orchestrator rendering five section components plus the footer. It owns one GSAP timeline and a data-driven scroll-trigger registry exported from `lib/reveals.ts`. The four other routes are deleted and replaced with 308 redirects to anchors. New sections are built before old routes are removed, so the site is never broken between tasks.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind v4, GSAP + ScrollTrigger, vitest + Testing Library, simple-icons.

## Global Constraints

Every task's requirements implicitly include this section.

- **NO `prefers-reduced-motion` guards anywhere.** The owner runs reduced motion at OS level; a guard silently disables animation for him. See `AGENTS.md` "React & Animation".
- **Amber is the only accent**: `#B5772E` light, `#D9A441` dark.
- **`border-b-2` amber nav treatment** is reserved for genuine "you are here" state only.
- **Every hover animation needs a keyboard-focus equivalent** (`onFocus`/`onBlur`, or `group-focus-visible:`).
- **No fabricated data may render on the page.** No seeded visit counts, no placeholder digits.
- **Prose written for the site avoids em dashes, colons and parenthetical asides.** Owner preference.
- **Match by `getByRole`, never `getByText`,** for any label split into per-letter spans.
- **`StackField`'s `COLUMN_WIDTH` (1024) must equal** the container width in `lib/ui.ts`'s `PAGE_MAIN` (`max-w-5xl`).
- Run `npx vitest run`, `npx tsc --noEmit`, and `npm run build` before any commit that touches components.
- Baseline to preserve: **246 tests passing**, lint clean, build green.

---

### Task 1: Extract the reveal registry

Pure refactor. No visible change. This exists so the blank-page failure mode becomes testable.

**Files:**
- Create: `lib/reveals.ts`
- Modify: `app/page.tsx:59-66` (remove the inline `scrollSections` array)
- Test: `lib/__tests__/reveals.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `REVEAL_SECTIONS: RevealSection[]` and `type RevealSection = { trigger: string; items: string }`, imported by `app/page.tsx` in Task 8.

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/reveals.test.ts
import { describe, expect, it } from 'vitest'
import { REVEAL_SECTIONS } from '@/lib/reveals'

describe('REVEAL_SECTIONS', () => {
  it('gives every entry a trigger and an items selector', () => {
    expect(REVEAL_SECTIONS.length).toBeGreaterThan(0)
    for (const section of REVEAL_SECTIONS) {
      expect(section.trigger).toMatch(/^\[data-reveal=/)
      expect(section.items.length).toBeGreaterThan(0)
    }
  })

  it('has no duplicate triggers', () => {
    const triggers = REVEAL_SECTIONS.map((s) => s.trigger)
    expect(new Set(triggers).size).toBe(triggers.length)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/reveals.test.ts`
Expected: FAIL, cannot resolve `@/lib/reveals`.

- [ ] **Step 3: Create the registry**

```ts
// lib/reveals.ts
/**
 * Scroll-reveal registry for the single-page layout.
 *
 * Exported as DATA rather than built inline in the page effect so a test can
 * assert every selector matches a real node. Sections start at opacity-0 and are
 * only revealed once these triggers are built, so a selector that silently stops
 * matching leaves a BLANK PAGE, not merely an unanimated one.
 *
 * Adding a section means adding a row here, nothing else.
 */
export type RevealSection = {
  /** Section wrapper that triggers the reveal when it nears the viewport. */
  trigger: string
  /** Children tweened to opacity 1. Staggered in document order. */
  items: string
}

export const REVEAL_SECTIONS: RevealSection[] = [
  { trigger: '[data-reveal="about"]', items: '[data-reveal="about"] > *' },
  { trigger: '[data-reveal="tech"]', items: '[data-reveal="tech"] > *' },
  {
    trigger: '[data-reveal="projects"]',
    items: '[data-reveal="projects-heading"], [data-reveal="project-card"]',
  },
  { trigger: '[data-reveal="contact"]', items: '[data-reveal="contact"] > *' },
]
```

- [ ] **Step 4: Point `app/page.tsx` at it**

In `app/page.tsx`, add to the imports:

```tsx
import { REVEAL_SECTIONS } from '@/lib/reveals'
```

Delete lines 59-66 (the inline `const scrollSections: { trigger: string; items: string }[] = [...]`) and replace every remaining `scrollSections` reference with `REVEAL_SECTIONS`. There are three: inside `buildScrollReveals`, inside `showEverythingAtRest`, and the declaration itself.

Note the `about` and `contact` entries do not match anything yet. That is intentional and safe, because `buildScrollReveals` already guards with `if (!el || !targets.length) return`.

- [ ] **Step 5: Verify**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS, 248 tests.

- [ ] **Step 6: Commit**

```bash
git add lib/reveals.ts lib/__tests__/reveals.test.ts app/page.tsx
git commit -m "refactor(home): extract the scroll-reveal registry into lib/reveals.ts"
```

---

### Task 2: Add project descriptions and reorder by strength

Data only. The detail-page fields stay for now so `app/projects/[slug]/page.tsx` keeps compiling; they are removed in Task 10.

**Files:**
- Modify: `lib/projects.ts`
- Test: `lib/__tests__/projects.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `Project.description: string` (required), and `PROJECTS` ordered `geofencing-app`, `tech-strongbox-project`, `ai-assisted-project`. Task 5 renders both.

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/projects.test.ts
import { describe, expect, it } from 'vitest'
import { PROJECTS } from '@/lib/projects'

describe('PROJECTS', () => {
  it('orders cards by strength, not by linkability', () => {
    expect(PROJECTS.map((p) => p.slug)).toEqual([
      'geofencing-app',
      'tech-strongbox-project',
      'ai-assisted-project',
    ])
  })

  it('gives every project a real description with no bracketed placeholder', () => {
    for (const project of PROJECTS) {
      expect(project.description.length).toBeGreaterThan(80)
      expect(project.description).not.toMatch(/[[\]]/)
    }
  })

  it('only exposes a repo link where one actually exists', () => {
    const linked = PROJECTS.filter((p) => p.repoUrl)
    expect(linked.map((p) => p.slug)).toEqual(['ai-assisted-project'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/projects.test.ts`
Expected: FAIL, `description` does not exist on type `Project`.

- [ ] **Step 3: Add the field, the copy, and the order**

In `lib/projects.ts`, add to the `Project` type after `hook`:

```ts
  /** 2-3 sentences rendered on the single-page projects card. */
  description: string
```

Add this `description` to the `geofencing-app` entry:

```ts
    description:
      "A home cleaning service booking platform with a Laravel API and a Flutter app. Customers book a cleaner, pay through Stripe, and get a notification the moment the cleaner arrives or leaves, using background geofencing. Built as my final year project, and the part that took longest was making those geofence triggers fire reliably while the phone was asleep.",
```

To `tech-strongbox-project`:

```ts
    description:
      "Client sites I work on as a junior developer at Tech Strongbox. Mostly WordPress, which means theme work, plugin customisation, and tracking down conflicts that only show up in production. The specifics stay with the clients, but this is where most of my day to day experience comes from.",
```

To `ai-assisted-project`:

```ts
    description:
      "A personal finance tracker for budgets, categories and transactions, with an Angular frontend and an ASP.NET Core API. I built it with heavy AI assistance from planning through to deployment. I mention that because the interesting part was learning where the help stops being useful and you have to understand the thing yourself.",
    repoUrl: 'https://github.com/Wenhao0706/Finance-management',
```

The array order already matches the required order. Confirm it does before moving on.

- [ ] **Step 4: Verify**

Run: `npx vitest run lib/__tests__/projects.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/projects.ts lib/__tests__/projects.test.ts
git commit -m "feat(projects): add card descriptions and the Finance Management repo link"
```

---

### Task 3: Extract the Hero section

Pure move. Markup is identical; only its location changes.

**Files:**
- Create: `components/sections/Hero.tsx`
- Modify: `app/page.tsx` (remove hero markup and `TypedWords`)

**Interfaces:**
- Consumes: nothing
- Produces: `export function Hero()`, rendering the `hi` / `name` / `tagline` / `cta` / `photo` reveal targets. Task 8 renders it.

- [ ] **Step 1: Create the component**

Move `TypedWords` (currently `app/page.tsx:14-36`) and the hero `<section>` (currently `app/page.tsx:164-214`) into a new file verbatim. `TypedWords` becomes local to this file since the hero is its only consumer.

```tsx
// components/sections/Hero.tsx
import Image from 'next/image'

function TypedWords({ text, offsetClass }: { text: string; offsetClass: string }) {
  const wordSpans = text.split(' ').map((word, wi) => (
    <span key={wi} className="inline-block whitespace-nowrap">
      {word.split('').map((char, ci) => (
        <span
          key={ci}
          data-letter
          className={`inline-block whitespace-pre opacity-0 ${offsetClass}`}
        >
          {char}
        </span>
      ))}
    </span>
  ))

  // Real breakable spaces go *between* word spans, not inside them, so
  // wrapping only ever happens at word boundaries, never mid-word.
  return wordSpans.reduce<React.ReactNode[]>((acc, el, i) => {
    if (i > 0) acc.push(' ')
    acc.push(el)
    return acc
  }, [])
}

export function Hero() {
  return (
    <section
      id="top"
      className="flex flex-col-reverse items-start gap-8 sm:flex-row sm:items-center sm:justify-between"
    >
      {/* Paste app/page.tsx lines 165-213 here unchanged: the text column div
          and the photo div. Do not alter classes, data-reveal attributes, or
          the Image sizing props. */}
    </section>
  )
}
```

Paste the two child `<div>`s from `app/page.tsx:165-213` in place of the comment, exactly as they are.

- [ ] **Step 2: Wire it into the page**

In `app/page.tsx`, delete the `TypedWords` function, delete the hero `<section>`, and replace it with `<Hero />`. Add `import { Hero } from '@/components/sections/Hero'`. Remove the now-unused `Image` import.

- [ ] **Step 3: Verify nothing changed**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: PASS, build green.

- [ ] **Step 4: Commit**

```bash
git add components/sections/Hero.tsx app/page.tsx
git commit -m "refactor(home): extract the hero into components/sections/Hero.tsx"
```

---

### Task 4: Add the About section

**Files:**
- Create: `components/sections/About.tsx`
- Test: `components/__tests__/About.test.tsx`

**Interfaces:**
- Consumes: `SECTION_HEADING` from `@/lib/ui`
- Produces: `export function About()` rendering `[data-reveal="about"]` with `id="about"`. Task 8 renders it.

- [ ] **Step 1: Write the failing test**

```tsx
// components/__tests__/About.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { About } from '@/components/sections/About'

describe('About', () => {
  it('renders an anchor target the nav can scroll to', () => {
    const { container } = render(<About />)
    expect(container.querySelector('#about')).not.toBeNull()
  })

  it('exposes itself to the reveal registry', () => {
    const { container } = render(<About />)
    const section = container.querySelector('[data-reveal="about"]')
    expect(section).not.toBeNull()
    expect(section!.children.length).toBeGreaterThan(0)
  })

  it('carries no bracketed placeholder copy', () => {
    render(<About />)
    expect(screen.queryByText(/\[.+\]/)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/__tests__/About.test.tsx`
Expected: FAIL, cannot resolve `@/components/sections/About`.

- [ ] **Step 3: Write the component**

Children start at `opacity-0 translate-y-2` because the registry tweens them to `opacity: 1, y: 0`. Anything without those baseline classes will simply appear un-animated rather than break.

```tsx
// components/sections/About.tsx
import { SECTION_HEADING } from '@/lib/ui'

const PARAGRAPHS = [
  "I'm a WordPress and PHP developer at Tech Strongbox, where most of my time goes to client sites. Theme work, plugin customisation, and the kind of bug that only ever shows up on someone else's hosting.",
  "I studied software engineering and built a cleaning service booking app as my final year project, a Laravel API with a Flutter app on top. It's still the thing I'm proudest of, mostly because of how much of it broke before it worked.",
  "Right now I'm learning React and Node, and this site is where I'm doing it. I'm looking for a junior developer role where I can keep building things I don't fully know how to build yet.",
]

export function About() {
  return (
    <section id="about" data-reveal="about" className="mt-20 scroll-mt-24">
      <h2 className={`${SECTION_HEADING} opacity-0 translate-y-2`}>A bit about me</h2>
      {PARAGRAPHS.map((text) => (
        <p
          key={text.slice(0, 24)}
          className="mt-4 max-w-2xl leading-relaxed text-[#7A7568] dark:text-[#8A9099] opacity-0 translate-y-2"
        >
          {text}
        </p>
      ))}
    </section>
  )
}
```

`scroll-mt-24` keeps the sticky header from covering the heading when the nav jumps to `#about`. Every section in this plan carries it.

- [ ] **Step 4: Verify**

Run: `npx vitest run components/__tests__/About.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add components/sections/About.tsx components/__tests__/About.test.tsx
git commit -m "feat(about): add the About section with real copy"
```

---

### Task 5: Rebuild the Projects section

The signature moment lives here. Cards render as a terminal-style listing that expands on reveal.

**Files:**
- Create: `components/sections/Projects.tsx`
- Test: `components/__tests__/Projects.test.tsx`
- Modify: `app/page.tsx` (remove the old projects `<section>`)

**Interfaces:**
- Consumes: `PROJECTS` from `@/lib/projects`, `SECTION_HEADING` and `SURFACE_INTERACTIVE` from `@/lib/ui`
- Produces: `export function Projects()` rendering `[data-reveal="projects"]`, `[data-reveal="projects-heading"]` and one `[data-reveal="project-card"]` per project.

- [ ] **Step 1: Write the failing test**

```tsx
// components/__tests__/Projects.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Projects } from '@/components/sections/Projects'
import { PROJECTS } from '@/lib/projects'

describe('Projects', () => {
  it('renders one card per project, strongest first', () => {
    const { container } = render(<Projects />)
    const cards = container.querySelectorAll('[data-reveal="project-card"]')
    expect(cards).toHaveLength(PROJECTS.length)
    expect(cards[0].textContent).toContain('Cleaning Service Booking App')
  })

  it('links only the projects that have a repo', () => {
    render(<Projects />)
    const links = screen.getAllByRole('link', { name: /view on github/i })
    expect(links).toHaveLength(PROJECTS.filter((p) => p.repoUrl).length)
    expect(links[0]).toHaveAttribute('href', 'https://github.com/Wenhao0706/Finance-management')
  })

  it('opens repo links safely in a new tab', () => {
    render(<Projects />)
    const link = screen.getAllByRole('link', { name: /view on github/i })[0]
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('never renders a dead "view project" affordance on a repo-less card', () => {
    render(<Projects />)
    expect(screen.queryByText(/view project/i)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/__tests__/Projects.test.tsx`
Expected: FAIL, cannot resolve `@/components/sections/Projects`.

- [ ] **Step 3: Write the component**

Cards are `<article>`, not `<Link>`. A whole-card link is wrong now that most cards have nowhere to go.

```tsx
// components/sections/Projects.tsx
import { siGithub } from 'simple-icons'
import { PROJECTS } from '@/lib/projects'
import { FOCUS_RING, SECTION_HEADING, SURFACE_INTERACTIVE } from '@/lib/ui'

export function Projects() {
  return (
    <section id="projects" data-reveal="projects" className="mt-20 scroll-mt-24">
      <h2
        data-reveal="projects-heading"
        className={`${SECTION_HEADING} opacity-0 translate-y-2`}
      >
        Some things I&apos;ve built
      </h2>

      <div className="mt-6 flex flex-col gap-4">
        {PROJECTS.map((project) => (
          <article
            key={project.slug}
            data-reveal="project-card"
            className={`rounded-[7px] p-5 opacity-0 translate-y-2 ${SURFACE_INTERACTIVE}`}
          >
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span
                aria-hidden
                className="font-mono text-xs text-[#B5772E] dark:text-[#D9A441]"
              >
                $
              </span>
              <h3 className="font-mono font-semibold text-[#2B2A26] dark:text-[#EDEFF2]">
                {project.title}
              </h3>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#7A7568] dark:text-[#8A9099]">
              {project.description}
            </p>

            <ul className="mt-4 flex flex-wrap gap-2">
              {project.stack.map((tech) => (
                <li
                  key={tech}
                  className="rounded-[4px] border border-[#DFD7C8] px-2 py-1 font-mono text-[11px] text-[#7A7568] dark:border-[#2A2F38] dark:text-[#8A9099]"
                >
                  {tech}
                </li>
              ))}
            </ul>

            {/* Rendered only when a repo actually exists. FYP lights up on its own
                the day its repoUrl is added, with no code change here. */}
            {project.repoUrl && (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-4 inline-flex items-center gap-2 font-mono text-xs text-[#B5772E] transition-colors hover:underline focus-visible:underline dark:text-[#D9A441] ${FOCUS_RING}`}
              >
                <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-current">
                  <path d={siGithub.path} />
                </svg>
                View on GitHub
              </a>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Remove the old section from the page**

In `app/page.tsx`, delete the projects `<section>` (currently lines 218-243) and the now-unused `PROJECTS`, `Link` and `SURFACE_INTERACTIVE` imports. Add `<Projects />` where the section was, plus `import { Projects } from '@/components/sections/Projects'`.

- [ ] **Step 5: Verify**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS, 4 new tests.

- [ ] **Step 6: Commit**

```bash
git add components/sections/Projects.tsx components/__tests__/Projects.test.tsx app/page.tsx
git commit -m "feat(projects): rebuild cards with descriptions and conditional repo links"
```

---

### Task 6: Add the Contact section

Wraps the existing `ContactForm` unchanged. The Server Action, reCAPTCHA and SMTP are untouched, since none of them are tied to the route.

**Files:**
- Create: `components/sections/Contact.tsx`
- Test: `components/__tests__/ContactSection.test.tsx`
- Modify: `app/page.tsx` (replace the `closing` section)

**Interfaces:**
- Consumes: `ContactForm` from `@/components/ContactForm`, `EMAIL` and `WHATSAPP_URL` from `@/lib/site`, `ACCENT_LINK` and `SECTION_HEADING` from `@/lib/ui`
- Produces: `export function Contact()` rendering `[data-reveal="contact"]` with `id="contact"`.

- [ ] **Step 1: Write the failing test**

```tsx
// components/__tests__/ContactSection.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/ContactForm', () => ({
  ContactForm: () => <form data-testid="contact-form" />,
}))

import { Contact } from '@/components/sections/Contact'

describe('Contact section', () => {
  it('renders an anchor target and the reveal hook', () => {
    const { container } = render(<Contact />)
    expect(container.querySelector('#contact')).not.toBeNull()
    expect(container.querySelector('[data-reveal="contact"]')).not.toBeNull()
  })

  it('mounts the real contact form', () => {
    render(<Contact />)
    expect(screen.getByTestId('contact-form')).toBeInTheDocument()
  })

  it('keeps the email and WhatsApp fallbacks', () => {
    render(<Contact />)
    expect(screen.getByRole('link', { name: /manhou688@gmail\.com/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /whatsapp/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/__tests__/ContactSection.test.tsx`
Expected: FAIL, cannot resolve `@/components/sections/Contact`.

- [ ] **Step 3: Write the component**

Copy is lifted from `app/contact/page.tsx` so nothing regresses.

```tsx
// components/sections/Contact.tsx
import { ContactForm } from '@/components/ContactForm'
import { EMAIL, WHATSAPP_URL } from '@/lib/site'
import { ACCENT_LINK, SECTION_HEADING } from '@/lib/ui'

export function Contact() {
  return (
    <section id="contact" data-reveal="contact" className="mt-20 scroll-mt-24">
      <h2 className={`${SECTION_HEADING} opacity-0 translate-y-2`}>Let&apos;s talk</h2>
      <p className="mt-3 max-w-2xl text-[#7A7568] dark:text-[#8A9099] opacity-0 translate-y-2">
        Open to junior developer roles, and available for freelance work. Either way, this
        reaches me directly.
      </p>

      <div className="opacity-0 translate-y-2">
        <ContactForm />
      </div>

      <p className="mt-10 text-sm text-[#7A7568] dark:text-[#8A9099] opacity-0 translate-y-2">
        Rather not use the form? Email{' '}
        <a href={`mailto:${EMAIL}`} className={ACCENT_LINK}>
          {EMAIL}
        </a>{' '}
        or{' '}
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={ACCENT_LINK}>
          message me on WhatsApp
        </a>
        .
      </p>
    </section>
  )
}
```

- [ ] **Step 4: Replace the closing section**

In `app/page.tsx`, delete the `closing` `<section>` (currently lines 245-258) and put `<Contact />` in its place. Add the import. Remove the now-unused `ACCENT_LINK` import if nothing else uses it.

- [ ] **Step 5: Verify**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS. The existing `ContactForm.test.tsx` suite must still pass untouched.

- [ ] **Step 6: Commit**

```bash
git add components/sections/Contact.tsx components/__tests__/ContactSection.test.tsx app/page.tsx
git commit -m "feat(contact): inline the contact form as a page section"
```

---

### Task 7: Add a reveal-integrity test

This is the defence against the blank-page failure mode. It must come after all sections exist and before the old routes are deleted.

**Files:**
- Test: `components/__tests__/reveal-integrity.test.tsx`

**Interfaces:**
- Consumes: `REVEAL_SECTIONS` from `@/lib/reveals`, all four section components
- Produces: nothing

- [ ] **Step 1: Write the test**

Rendering the sections directly, rather than the page, keeps GSAP out of the test entirely.

```tsx
// components/__tests__/reveal-integrity.test.tsx
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/ContactForm', () => ({
  ContactForm: () => <form />,
}))

import { About } from '@/components/sections/About'
import { Contact } from '@/components/sections/Contact'
import { Projects } from '@/components/sections/Projects'
import TechStack from '@/components/TechStack'
import { REVEAL_SECTIONS } from '@/lib/reveals'

/**
 * Sections ship at opacity-0 and are only revealed once these selectors match.
 * A selector that stops matching produces a BLANK SECTION in production with
 * nothing in the console. This test is the only thing that catches that.
 */
describe('reveal registry integrity', () => {
  it.each(REVEAL_SECTIONS)('$trigger matches a rendered node', ({ trigger, items }) => {
    const { container } = render(
      <div>
        <About />
        <TechStack />
        <Projects />
        <Contact />
      </div>
    )
    expect(container.querySelector(trigger)).not.toBeNull()
    expect(container.querySelectorAll(items).length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run it**

Run: `npx vitest run components/__tests__/reveal-integrity.test.tsx`
Expected: PASS, one case per registry entry (4).

If the `tech` case fails, `TechStack` renders its children through a wrapper and `[data-reveal="tech"] > *` no longer matches. Fix the selector in `lib/reveals.ts` to match the real DOM rather than loosening the test.

- [ ] **Step 3: Commit**

```bash
git add components/__tests__/reveal-integrity.test.tsx
git commit -m "test(home): assert every reveal selector matches a rendered node"
```

---

### Task 8: Rewrite `app/page.tsx` as an orchestrator

**Files:**
- Modify: `app/page.tsx` (full rewrite, target under 120 lines)

**Interfaces:**
- Consumes: `Hero`, `About`, `Projects`, `Contact`, `TechStack`, `StackField`, `HomeIntro`, `REVEAL_SECTIONS`
- Produces: nothing

- [ ] **Step 1: Rewrite the file**

The GSAP logic is unchanged in behaviour. Only the markup collapses to component calls and `scrollSections` becomes `REVEAL_SECTIONS`.

```tsx
'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { HomeIntro } from '@/components/HomeIntro'
import StackField from '@/components/StackField'
import TechStack from '@/components/TechStack'
import { About } from '@/components/sections/About'
import { Contact } from '@/components/sections/Contact'
import { Hero } from '@/components/sections/Hero'
import { Projects } from '@/components/sections/Projects'
import { REVEAL_SECTIONS } from '@/lib/reveals'
import { PAGE_MAIN } from '@/lib/ui'

gsap.registerPlugin(ScrollTrigger)

/** Fires when the section's top passes this far down the viewport. */
const REVEAL_START = 'top 85%'

export default function Home() {
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const ctx = gsap.context(() => {
      const hiLetters = root.querySelectorAll('[data-reveal="hi"] [data-letter]')
      const nameLetters = root.querySelectorAll('[data-reveal="name"] [data-letter]')
      const taglineLetters = root.querySelectorAll('[data-reveal="tagline"] [data-letter]')
      const ctaButtons = root.querySelectorAll('[data-reveal="cta"] > *')
      const photo = root.querySelector('[data-reveal="photo"]')

      /* Deliberately NO prefers-reduced-motion guard here. The site owner runs with
         reduced motion enabled at OS level, so a guard silently snaps every reveal
         to its end state and the page looks unanimated. Same explicit decision as
         components/header/* — see AGENTS.md. */

      /* Created AFTER the intro finishes, never at mount. Sections near the fold
         already satisfy `top 85%` on load, so a trigger built at mount fires behind
         the still-covering overlay and the section is revealed before anyone
         scrolls to it. Deferring also lets ScrollTrigger measure a settled layout. */
      let scrollRevealsBuilt = false
      const buildScrollReveals = () => {
        if (scrollRevealsBuilt) return
        scrollRevealsBuilt = true

        REVEAL_SECTIONS.forEach(({ trigger, items }) => {
          const el = root.querySelector(trigger)
          const targets = root.querySelectorAll(items)
          if (!el || !targets.length) return

          gsap.to(targets, {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.1,
            ease: 'power2.out',
            scrollTrigger: { trigger: el, start: REVEAL_START, once: true },
          })
        })

        ScrollTrigger.refresh()
      }

      const tl = gsap.timeline({ paused: true, onComplete: buildScrollReveals })

      tl.to(photo, { opacity: 1, y: 0, duration: 1.1, ease: 'bounce.out' }, 0)
        .to(hiLetters, { opacity: 1, y: 0, duration: 0.3, stagger: 0.06, ease: 'power2.out' }, '-=0.15')
        .to(nameLetters, { opacity: 1, y: 0, duration: 0.35, stagger: 0.07, ease: 'power2.out' }, '-=0.05')
        .to(taglineLetters, { opacity: 1, y: 0, duration: 0.2, stagger: 0.006, ease: 'power2.out' }, '-=0.1')
        .to(ctaButtons, { opacity: 1, y: 0, duration: 0.35, stagger: 0.12, ease: 'power2.out' }, '-=0.15')

      /* Repeat visits skip the choreography and land on the finished page. The
         letter-by-letter reveal runs several seconds, charming once and a wait
         every time after. Matches HomeIntro's first-session rule. */
      const showEverythingAtRest = () => {
        const heroTargets = [hiLetters, nameLetters, taglineLetters, ctaButtons, photo]
        heroTargets.forEach((t) => t && gsap.set(t, { opacity: 1, y: 0 }))
        REVEAL_SECTIONS.forEach(({ items }) =>
          gsap.set(root.querySelectorAll(items), { opacity: 1, y: 0 })
        )
        scrollRevealsBuilt = true
      }

      /* Safety net: if the intro never dispatches, the timeline never runs and its
         onComplete never builds the reveals, leaving every section below the fold
         at opacity-0 forever. Better a late reveal than a blank page. */
      const fallback = window.setTimeout(() => {
        tl.play()
        buildScrollReveals()
      }, 4000)

      const play = (event: Event) => {
        window.clearTimeout(fallback)
        const firstVisit =
          (event as CustomEvent<{ firstVisit?: boolean }>).detail?.firstVisit ?? true
        if (firstVisit) tl.play()
        else showEverythingAtRest()
      }
      window.addEventListener('home-intro-opening', play)

      return () => {
        window.removeEventListener('home-intro-opening', play)
        window.clearTimeout(fallback)
      }
    }, root)

    return () => ctx.revert()
  }, [])

  return (
    <main ref={rootRef} className={`relative ${PAGE_MAIN}`}>
      <StackField />
      <HomeIntro />
      <Hero />
      <About />
      <TechStack />
      <Projects />
      <Contact />
    </main>
  )
}
```

- [ ] **Step 2: Verify in a real browser**

Run: `npm run dev`, open `http://localhost:3000`.

Check all five of these:
1. The intro plays and the hero types in on a fresh session (clear `sessionStorage` first).
2. Scrolling down reveals About, tech stack, Projects and Contact in turn.
3. Reload. The page lands finished with no re-typing.
4. No horizontal scrollbar.
5. No dead scroll space past the footer.

Item 5 is expected to FAIL here. `StackField` is retuned in Task 13.

- [ ] **Step 3: Verify the suite**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: PASS, build green.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "refactor(home): reduce page.tsx to a section orchestrator"
```

---

### Task 9: Build the projects signature reveal

The spec's one showpiece. Cards arrive as a compact terminal listing and expand, with stack chips staggering in after.

This replaces the generic projects tween rather than layering on top of it, so the two never fight over the same nodes.

**Files:**
- Modify: `lib/reveals.ts` (remove the projects row, add a dedicated builder)
- Modify: `components/sections/Projects.tsx` (add reveal hooks to body and chips)
- Modify: `app/page.tsx` (call the builder)
- Modify: `components/__tests__/reveal-integrity.test.tsx` (cover the new selectors)

**Interfaces:**
- Consumes: `gsap` (passed in, never imported by `lib/reveals.ts`)
- Produces: `PROJECTS_REVEAL: { trigger: string; card: string; body: string; chip: string }` and `buildProjectsReveal(root: HTMLElement, gsapInstance: typeof gsap, start: string): void`

- [ ] **Step 1: Extend the registry module**

Remove the `projects` row from `REVEAL_SECTIONS`, then append:

```ts
/**
 * The projects showpiece. Kept separate from REVEAL_SECTIONS because it runs a
 * three-stage timeline rather than one staggered tween, and two tweens fighting
 * over the same nodes produces a half-revealed card.
 *
 * Selectors are exported so the integrity test can assert they still match. The
 * blank-card failure mode is identical to the one REVEAL_SECTIONS guards.
 */
export const PROJECTS_REVEAL = {
  trigger: '[data-reveal="projects"]',
  heading: '[data-reveal="projects-heading"]',
  card: '[data-reveal="project-card"]',
  body: '[data-reveal="project-body"]',
  chip: '[data-reveal="project-chip"]',
} as const

/** gsap is injected so this module stays importable from a test without GSAP. */
export function buildProjectsReveal(
  root: HTMLElement,
  gsapInstance: typeof import('gsap').default,
  start: string
) {
  const trigger = root.querySelector(PROJECTS_REVEAL.trigger)
  const cards = root.querySelectorAll(PROJECTS_REVEAL.card)
  if (!trigger || !cards.length) return

  const tl = gsapInstance.timeline({
    scrollTrigger: { trigger, start, once: true },
  })

  tl.to(root.querySelectorAll(PROJECTS_REVEAL.heading), {
    opacity: 1,
    y: 0,
    duration: 0.4,
    ease: 'power2.out',
  })
    /* Stage 1: the listing lands, still compact. */
    .to(
      cards,
      { opacity: 1, y: 0, duration: 0.45, stagger: 0.12, ease: 'power2.out' },
      '-=0.1'
    )
    /* Stage 2: each card expands into its description. */
    .to(
      root.querySelectorAll(PROJECTS_REVEAL.body),
      { opacity: 1, height: 'auto', duration: 0.4, stagger: 0.12, ease: 'power2.out' },
      '-=0.2'
    )
    /* Stage 3: chips tick in like output. Fast and tight, so it reads as a
       terminal printing rather than as another fade. */
    .to(
      root.querySelectorAll(PROJECTS_REVEAL.chip),
      { opacity: 1, y: 0, duration: 0.2, stagger: 0.03, ease: 'power2.out' },
      '-=0.15'
    )
}
```

- [ ] **Step 2: Add the hooks to the component**

In `components/sections/Projects.tsx`, wrap everything below the title row in a body element and mark the chips.

Replace the description paragraph and the `<ul>` with:

```tsx
            <div
              data-reveal="project-body"
              className="h-0 overflow-hidden opacity-0"
            >
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#7A7568] dark:text-[#8A9099]">
                {project.description}
              </p>

              <ul className="mt-4 flex flex-wrap gap-2">
                {project.stack.map((tech) => (
                  <li
                    key={tech}
                    data-reveal="project-chip"
                    className="translate-y-1 rounded-[4px] border border-[#DFD7C8] px-2 py-1 font-mono text-[11px] text-[#7A7568] opacity-0 dark:border-[#2A2F38] dark:text-[#8A9099]"
                  >
                    {tech}
                  </li>
                ))}
              </ul>
            </div>
```

Move the `repoUrl` anchor inside this body div, after the `</ul>`.

- [ ] **Step 3: Call the builder from the page**

In `app/page.tsx`, import `buildProjectsReveal` alongside `REVEAL_SECTIONS`, and inside `buildScrollReveals`, after the `REVEAL_SECTIONS.forEach(...)` loop and before `ScrollTrigger.refresh()`:

```tsx
        buildProjectsReveal(root, gsap, REVEAL_START)
```

In `showEverythingAtRest`, add the projects nodes so repeat visits still land finished:

```tsx
        gsap.set(root.querySelectorAll(PROJECTS_REVEAL.heading), { opacity: 1, y: 0 })
        gsap.set(root.querySelectorAll(PROJECTS_REVEAL.card), { opacity: 1, y: 0 })
        gsap.set(root.querySelectorAll(PROJECTS_REVEAL.body), { opacity: 1, height: 'auto' })
        gsap.set(root.querySelectorAll(PROJECTS_REVEAL.chip), { opacity: 1, y: 0 })
```

Import `PROJECTS_REVEAL` for those four lines.

- [ ] **Step 4: Extend the integrity test**

Append to `components/__tests__/reveal-integrity.test.tsx`:

```tsx
import { PROJECTS_REVEAL } from '@/lib/reveals'

describe('projects showpiece selectors', () => {
  it.each(Object.entries(PROJECTS_REVEAL))('%s matches a rendered node', (_key, selector) => {
    const { container } = render(<Projects />)
    expect(container.querySelectorAll(selector).length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 5: Verify**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS, 5 new cases. Task 7's `REVEAL_SECTIONS` suite drops from 4 cases to 3, since the projects row moved out of the registry. That is the expected count, not a regression.

Then in the browser, scroll to projects on a fresh session. Confirm the three stages read as one sequence, and that reloading lands the cards fully expanded with no animation.

If a card's body stays collapsed, `height: 'auto'` failed to resolve because the element had no measurable content. Confirm the wrapper is `h-0 overflow-hidden` and not `hidden`, which cannot be animated.

- [ ] **Step 6: Commit**

```bash
git add lib/reveals.ts components/sections/Projects.tsx app/page.tsx components/__tests__/reveal-integrity.test.tsx
git commit -m "feat(projects): add the three-stage terminal expand reveal"
```

---

### Task 10: Convert NavTabs to scroll-spy

**Files:**
- Modify: `components/header/NavTabs.tsx`
- Test: `components/header/__tests__/NavTabs.test.tsx` (modify if it exists, create if not)

**Interfaces:**
- Consumes: section ids `about`, `projects`, `contact` from Tasks 4, 5, 6
- Produces: nothing

- [ ] **Step 1: Write the failing test**

`IntersectionObserver` does not exist in jsdom and must be stubbed.

```tsx
// components/header/__tests__/NavTabs.test.tsx
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NavTabs } from '@/components/header/NavTabs'

beforeEach(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    }
  )
})

describe('NavTabs', () => {
  it('points every tab at an on-page anchor', () => {
    render(<NavTabs />)
    for (const label of ['About', 'Projects', 'Contact']) {
      const link = screen.getByRole('link', { name: label })
      expect(link.getAttribute('href')).toBe(`#${label.toLowerCase()}`)
    }
  })

  it('marks no tab current before any section is observed', () => {
    render(<NavTabs />)
    expect(screen.queryByRole('link', { current: 'true' })).toBeNull()
  })
})
```

Note the `getByRole` matching. Labels are split into per-letter spans, so `getByText` cannot assemble them. See `AGENTS.md`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/header/__tests__/NavTabs.test.tsx`
Expected: FAIL, hrefs are `/about` not `#about`.

- [ ] **Step 3: Rewrite the component**

```tsx
'use client'

import { useEffect, useState } from 'react'

const TABS = [
  { id: 'about', label: 'About' },
  { id: 'projects', label: 'Projects' },
  { id: 'contact', label: 'Contact' },
] as const

export function NavTabs() {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    const sections = TABS.map((tab) => document.getElementById(tab.id)).filter(
      (el): el is HTMLElement => el !== null
    )
    if (!sections.length) return

    /* Bottom margin pulls the detection band up to the top third of the viewport,
       so a section counts as active once it OWNS the screen, not the instant its
       first pixel appears. Without it, two adjacent sections both qualify while
       scrolling and the tab flickers between them. */
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)
        if (!visible.length) return
        const top = visible.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b
        )
        setActiveId(top.target.id)
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  return (
    <nav className="flex items-stretch">
      {TABS.map((tab) => {
        const isActive = activeId === tab.id
        return (
          <a
            key={tab.id}
            href={`#${tab.id}`}
            aria-current={isActive ? 'true' : undefined}
            className={`group font-mono text-sm px-[18px] py-4 border-b-2 outline-none focus-visible:ring-2 focus-visible:ring-[#B5772E] dark:focus-visible:ring-[#D9A441] ${
              isActive
                ? 'text-[#2B2A26] border-[#B5772E] dark:text-[#EDEFF2] dark:border-[#D9A441]'
                : 'border-transparent'
            }`}
          >
            {tab.label.split('').map((char, i) => (
              <span
                key={i}
                className={`inline-block transition-colors duration-150 ${
                  isActive
                    ? ''
                    : 'text-[#7A7568] group-hover:text-[#2B2A26] group-focus-visible:text-[#2B2A26] dark:text-[#8A9099] dark:group-hover:text-[#EDEFF2] dark:group-focus-visible:text-[#EDEFF2]'
                }`}
                style={{ transitionDelay: `${i * 20}ms` }}
              >
                {char}
              </span>
            ))}
          </a>
        )
      })}
    </nav>
  )
}
```

`aria-current` moves from `"page"` to `"true"`. `"page"` means "this is the current page", which is no longer true when every tab targets the same page.

- [ ] **Step 4: Add smooth scrolling**

In `app/globals.css`, add:

```css
html {
  scroll-behavior: smooth;
}
```

Do NOT wrap this in a `prefers-reduced-motion` media query. See Global Constraints.

- [ ] **Step 5: Verify**

Run: `npx vitest run && npx tsc --noEmit`

Then in the browser: click each tab, confirm it scrolls to the right section, the heading is not hidden under the sticky header, and the amber underline follows as you scroll manually.

- [ ] **Step 6: Commit**

```bash
git add components/header/NavTabs.tsx components/header/__tests__/NavTabs.test.tsx app/globals.css
git commit -m "feat(header): drive nav tabs from scroll position instead of pathname"
```

---

### Task 11: Rebuild the footer

**Files:**
- Modify: `components/Footer.tsx` (full rewrite)
- Test: `components/__tests__/Footer.test.tsx`

**Interfaces:**
- Consumes: `EMAIL`, `GITHUB_URL`, `WHATSAPP_URL` from `@/lib/site`
- Produces: nothing

- [ ] **Step 1: Write the failing test**

```tsx
// components/__tests__/Footer.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Footer from '@/components/Footer'

describe('Footer', () => {
  it('leads with the call to action', () => {
    render(<Footer />)
    expect(screen.getByRole('heading', { name: /let's build something great/i })).toBeInTheDocument()
  })

  it('renders social tiles with accessible names', () => {
    render(<Footer />)
    expect(screen.getByRole('link', { name: /github/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /email/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /whatsapp/i })).toBeInTheDocument()
  })

  it('points nav links at on-page anchors', () => {
    render(<Footer />)
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '#about')
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '#projects')
  })

  it('renders no traffic numbers until real counters exist', () => {
    render(<Footer />)
    expect(screen.queryByText(/total visits/i)).toBeNull()
  })
})
```

The last assertion is the guard against fabricated data reaching a recruiter. Do not delete it in the analytics phase. Invert it to assert real numbers instead.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/__tests__/Footer.test.tsx`
Expected: FAIL, no such heading.

- [ ] **Step 3: Rewrite the footer**

```tsx
/**
 * Site footer: a call to action, social tiles, and section links.
 *
 * The traffic band from the design is deliberately ABSENT rather than seeded.
 * It arrives in the analytics phase backed by real Upstash counters. Nothing
 * here may render an invented number.
 *
 * `siLinkedin` no longer exists in simple-icons (trademark removal), so LinkedIn
 * is absent rather than filled with a lookalike from another brand.
 */
import { siGithub, siWhatsapp } from 'simple-icons'
import { EMAIL, GITHUB_URL, WHATSAPP_URL } from '@/lib/site'
import { FOCUS_RING } from '@/lib/ui'

function MailIcon({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  )
}

const NAV = [
  { href: '#about', label: 'About' },
  { href: '#projects', label: 'Projects' },
  { href: '#contact', label: 'Contact' },
]

const tileClass =
  'flex h-14 w-14 items-center justify-center rounded-[7px] border border-[#DFD7C8] text-[#7A7568] transition-colors hover:border-[#B5772E] hover:text-[#B5772E] focus-visible:border-[#B5772E] focus-visible:text-[#B5772E] dark:border-[#2A2F38] dark:text-[#8A9099] dark:hover:border-[#D9A441] dark:hover:text-[#D9A441] dark:focus-visible:border-[#D9A441] dark:focus-visible:text-[#D9A441]'

const navLinkClass =
  'font-mono text-sm uppercase tracking-wide text-[#7A7568] transition-colors hover:text-[#B5772E] focus-visible:text-[#B5772E] dark:text-[#8A9099] dark:hover:text-[#D9A441] dark:focus-visible:text-[#D9A441]'

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-[#DFD7C8] dark:border-[#2A2F38]">
      <div className="mx-auto w-full max-w-5xl px-[18px] py-16">
        <p className="font-mono text-xs uppercase tracking-widest text-[#B5772E] dark:text-[#D9A441]">
          // let&apos;s talk
        </p>

        <div className="mt-6 flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="font-mono text-4xl font-bold leading-tight text-[#2B2A26] sm:text-5xl dark:text-[#EDEFF2]">
            Let&apos;s build
            <br />
            something great
            <span
              aria-hidden
              className="ml-1 inline-block h-[0.12em] w-[0.5em] translate-y-[-0.1em] bg-[#B5772E] align-middle dark:bg-[#D9A441]"
            />
          </h2>

          <div className="flex gap-3">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub profile"
              className={`${tileClass} ${FOCUS_RING}`}
            >
              <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6 fill-current">
                <path d={siGithub.path} />
              </svg>
            </a>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Message on WhatsApp"
              className={`${tileClass} ${FOCUS_RING}`}
            >
              <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6 fill-current">
                <path d={siWhatsapp.path} />
              </svg>
            </a>
            <a
              href={`mailto:${EMAIL}`}
              aria-label="Email Yoon Man Hou"
              className={`${tileClass} ${FOCUS_RING}`}
            >
              <MailIcon className="h-6 w-6" />
            </a>
          </div>
        </div>

        <nav className="mt-12 flex flex-wrap gap-x-8 gap-y-3">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className={`${navLinkClass} ${FOCUS_RING}`}>
              {item.label}
            </a>
          ))}
        </nav>

        {/* Traffic band slot. Reserved by the mt-12 border below so the analytics
            phase drops a component in without reopening this layout. */}

        <div className="mt-12 border-t border-[#DFD7C8] pt-6 dark:border-[#2A2F38]">
          <p className="font-mono text-[11px] text-[#7A7568] dark:text-[#8A9099]">
            © 2026 Yoon Man Hou. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
```

Note `PROJECTS` and `Image` are no longer imported. The Projects column is gone, since three links to `#projects` is not navigation.

- [ ] **Step 4: Verify**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS. Check the footer in both light and dark mode in the browser.

- [ ] **Step 5: Commit**

```bash
git add components/Footer.tsx components/__tests__/Footer.test.tsx
git commit -m "feat(footer): rebuild around a call to action and social tiles"
```

---

### Task 12: Delete the old routes, add redirects, trim the data model

Last structural task. Everything that replaces these routes now exists.

**Files:**
- Delete: `app/about/page.tsx`, `app/projects/page.tsx`, `app/projects/[slug]/page.tsx`, `app/contact/page.tsx`
- Modify: `next.config.ts`, `lib/projects.ts`
- Test: `lib/__tests__/projects.test.ts` (extend)

**Interfaces:**
- Consumes: nothing
- Produces: nothing

- [ ] **Step 1: Write the failing test**

```ts
// append to lib/__tests__/projects.test.ts
import { PROJECTS } from '@/lib/projects'

describe('project data model', () => {
  it('carries no detail-page fields now the detail route is gone', () => {
    const dead = ['introduction', 'purposeAndGoal', 'spotlight', 'currentStatus', 'lessonsLearned']
    for (const project of PROJECTS) {
      for (const field of dead) {
        expect(project).not.toHaveProperty(field)
      }
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/projects.test.ts`
Expected: FAIL, the properties still exist.

- [ ] **Step 3: Delete the routes**

```bash
git rm app/about/page.tsx app/projects/page.tsx app/contact/page.tsx
git rm -r "app/projects/[slug]"
```

- [ ] **Step 4: Trim `lib/projects.ts`**

Remove `introduction`, `purposeAndGoal`, `spotlight`, `currentStatus`, `lessonsLearned` from the `Project` type and from all three entries. Remove `role` as well, since nothing renders it. Remove `getProjectBySlug`, whose only caller was the deleted detail route.

The type becomes:

```ts
export type Project = {
  slug: string
  title: string
  hook: string
  /** 2-3 sentences rendered on the single-page projects card. */
  description: string
  stack: string[]
  liveUrl?: string
  repoUrl?: string
}
```

Keep `hook`, which the chatbot knowledge base and any future card variant may still want. Keep `liveUrl`, which is the intended slot for Tech Strongbox client work.

- [ ] **Step 5: Add the redirects**

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* The site collapsed from five routes to one. These paths are still live in
     the wild: the resume links to them, and the chatbot's offline and rate-limit
     replies tell visitors to use the contact form. 308 so they are cached as
     permanent and search engines transfer any accumulated signal. */
  async redirects() {
    return [
      { source: '/about', destination: '/#about', permanent: true },
      { source: '/projects', destination: '/#projects', permanent: true },
      { source: '/projects/:slug', destination: '/#projects', permanent: true },
      { source: '/contact', destination: '/#contact', permanent: true },
    ]
  },
};

export default nextConfig;
```

- [ ] **Step 6: Verify the redirects for real**

Run `npm run build && npm run start`, then in a second terminal:

```bash
for p in /about /projects /projects/geofencing-app /contact; do
  printf '%s -> ' "$p"
  curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' "http://localhost:3000$p"
done
```

Expected: four lines, each `308` with the matching `/#anchor`.

A `200` means the route file still exists. A `404` means the redirect source pattern is wrong.

- [ ] **Step 7: Verify the suite**

Run: `npx vitest run && npx tsc --noEmit && npx eslint .`
Expected: PASS. Any test still importing `getProjectBySlug` or a deleted route must be updated, not deleted.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(site): collapse to a single route with redirects from the old paths"
```

---

### Task 13: Retune StackField and verify the whole page

The page grew by two sections. `StackField`'s offsets are px-based and were tuned to the old height. Bug B2 in `tasks/portfolio/site-chrome/current.md` was exactly this and recurs if skipped.

**Files:**
- Modify: `components/StackField.tsx:71-81` (the `STACK` array `top` values)

**Interfaces:**
- Consumes: nothing
- Produces: nothing

- [ ] **Step 1: Measure the real page height**

Run `npm run dev`, open the site, and in the browser console:

```js
document.querySelector('main').getBoundingClientRect().height
```

Record the number. The current `top` values run 80 to 1290.

- [ ] **Step 2: Redistribute the offsets**

Spread the ten `top` values across the measured height, leaving roughly 10% clear at top and bottom so no logo sits behind the hero photo or past the last section. Keep them non-uniform, since evenly spaced decoration reads as a pattern rather than as scatter.

Example for a 3200px page:

```ts
const STACK: Placed[] = [
  { icon: siPhp, side: 'left', top: 180, depth: 0.42, size: 78, delay: 0, duration: 7 },
  { icon: siWordpress, side: 'right', top: 460, depth: 0.06, size: 60, delay: 1.2, duration: 8 },
  { icon: siNextdotjs, side: 'right', top: 820, depth: 0.55, size: 46, delay: 3.4, duration: 8 },
  { icon: siLaravel, side: 'left', top: 1100, depth: 0.02, size: 56, delay: 2.4, duration: 6.5 },
  { icon: siFlutter, side: 'right', top: 1380, depth: 0.3, size: 52, delay: 0.6, duration: 7.5 },
  { icon: siAngular, side: 'left', top: 1720, depth: 0.5, size: 66, delay: 3, duration: 8.5 },
  { icon: siTailwindcss, side: 'left', top: 2040, depth: 0.1, size: 50, delay: 1.5, duration: 6.8 },
  { icon: siDotnet, side: 'right', top: 2360, depth: 0.48, size: 58, delay: 1.8, duration: 6 },
  { icon: siReact, side: 'left', top: 2660, depth: 0.26, size: 70, delay: 2.1, duration: 9 },
  { icon: siTypescript, side: 'right', top: 2900, depth: 0.14, size: 48, delay: 0.9, duration: 7 },
]
```

Substitute your measured height. Do not change `depth`, `size`, `delay` or `duration`.

- [ ] **Step 3: Confirm no dead scroll space**

In the browser at a viewport at least 1280px wide, so the field is visible at all:

1. Scroll to the very bottom. The footer's last line must be the last thing on the page, with no empty region past it.
2. Confirm no horizontal scrollbar at 1280px, 1440px and 1920px.
3. Confirm no logo overlaps body text at any of those widths.

If empty space remains below the footer, a `top` value still exceeds the content height. The `overflow-hidden` wrapper clips the visual but the document height is set by `main`, so reduce the largest offsets.

- [ ] **Step 4: Full verification**

```bash
npx vitest run && npx tsc --noEmit && npx eslint . && npm run build
```

Expected: all green, test count above the 246 baseline.

- [ ] **Step 5: Manual acceptance pass**

1. Clear `sessionStorage`, reload. Intro plays, hero types in, sections reveal on scroll.
2. Reload again. Page lands finished, no re-typing.
3. Every nav tab scrolls to its section and the amber underline follows on manual scroll.
4. Submit the contact form. Confirm the success state and that the email arrives.
5. Open the chat widget. Confirm it still opens and answers.
6. Toggle dark mode. Check the footer tiles, project cards and chips in both.
7. At 375px wide, confirm no horizontal scroll and that cards stack.

Item 4 matters most. The form moved files, and a Server Action returns 200 even when it rejects, so judge it by the inbox and not the network tab. See `AGENTS.md`.

- [ ] **Step 6: Commit**

```bash
git add components/StackField.tsx
git commit -m "fix(chrome): retune StackField offsets for the taller single page"
```

---

## Out of Scope

Deferred to a second piece of work, per the spec:

- PostHog instrumentation for private session replay
- Upstash-backed public counters for the footer traffic band
- The privacy notice and PostHog input masking that session replay requires
- Rotating the exposed Firebase key and republishing `Wenhao0706/FYP`

## Open Items

Neither blocks this plan:

- LinkedIn URL, or confirmation to drop the tile
- A `liveUrl` for Tech Strongbox, if any client work is publicly viewable

## Follow-Up Documentation

After Task 13, `/done` should update:

- `tasks/portfolio/content-pages/current.md` — routes collapsed, placeholders deleted, About written
- `tasks/portfolio/site-chrome/current.md` — footer rebuilt, StackField retuned, B2 recurrence risk
- `tasks/portfolio/chatbot/current.md` — `/contact` is now an anchor, so the bot's refusal copy points at a redirect
- `tasks/portfolio/deployment/current.md` — the site is now a single indexable URL
- `tasks/portfolio/posthog-analytics/current.md` — record the undercount finding and the split between private replay and public counters
