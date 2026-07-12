# IDE Tab-Bar Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved IDE-style header (title bar, name-as-file logo, nav tabs, resume CTA) with a working light/dark theme toggle, per `docs/header-design-spec.md`.

**Architecture:** A `ThemeProvider` client component manages a `dark`/`light` class on `<html>`, backed by `localStorage` and a `beforeInteractive` inline script (via `next/script`) to avoid a flash of the wrong theme. `Header` is a server component that composes `NavTabs` (client, uses `usePathname` for active-tab state) and `ThemeToggle` (client, flips the theme). Tailwind v4's dark variant is repointed from `prefers-color-scheme` to the `.dark` class via `@custom-variant` in `globals.css`.

**Tech Stack:** Next.js 16.2.10 (App Router), React 19.2.4, Tailwind CSS 4, TypeScript 5, Vitest + React Testing Library (new — being added in Task 1).

## Global Constraints

- No `src/` directory — app code lives at repo root (`app/`, and new `components/`, `lib/`). Path alias `@/*` maps to `./*` (tsconfig.json).
- Tailwind v4: no `tailwind.config.js`; theme/config lives in `app/globals.css` via `@theme` and `@import "tailwindcss"`.
- Colors/fonts must match `docs/header-design-spec.md` exactly (hex values below are copied from that spec).
- Monospace stack for wordmark/tabs: `ui-monospace, "JetBrains Mono", "Fira Code", monospace`. Body font: Inter.
- Nav tab routes (`/about`, `/projects`, `/contact`) do not have pages yet — link to them anyway; page content is out of scope for this plan.
- Every client component must start with `'use client'` (App Router requirement — server components are the default).

---

### Task 1: Install and configure Vitest + React Testing Library

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `components/__tests__/smoke.test.tsx`

**Interfaces:**
- Produces: `npm test` (single run) and `npm run test:watch` scripts that any later task's tests rely on.

- [ ] **Step 1: Install dependencies**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

- [ ] **Step 3: Create `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 4: Add test scripts to `package.json`**

In the `"scripts"` block of `package.json`, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Write a smoke test**

```tsx
// components/__tests__/smoke.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('vitest + RTL setup', () => {
  it('renders a basic element', () => {
    render(<p>hello header</p>)
    expect(screen.getByText('hello header')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test`
Expected: `1 passed` (the smoke test), no config errors.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts vitest.setup.ts components/__tests__/smoke.test.tsx
git commit -m "test: add vitest + react-testing-library setup"
```

---

### Task 2: Theme infrastructure (ThemeProvider + Tailwind dark variant)

**Files:**
- Create: `components/theme/ThemeProvider.tsx`
- Create: `components/theme/useTheme.ts`
- Create: `components/theme/__tests__/ThemeProvider.test.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `ThemeProvider` (wraps children, exposes context), `useTheme()` hook returning `{ theme: 'dark' | 'light', toggleTheme: () => void }`. Task 3 (`ThemeToggle`) and Task 4/5 consume `useTheme`.

- [ ] **Step 1: Write the failing test for `useTheme`/`ThemeProvider`**

```tsx
// components/theme/__tests__/ThemeProvider.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider } from '../ThemeProvider'
import { useTheme } from '../useTheme'

function Probe() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button onClick={toggleTheme} data-testid="probe">
      {theme}
    </button>
  )
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  it('defaults to dark theme when nothing is stored', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    )
    expect(screen.getByTestId('probe')).toHaveTextContent('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('toggles theme and updates the html class + localStorage', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    )
    fireEvent.click(screen.getByTestId('probe'))
    expect(screen.getByTestId('probe')).toHaveTextContent('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('reads an existing theme from localStorage on mount', () => {
    localStorage.setItem('theme', 'light')
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    )
    expect(screen.getByTestId('probe')).toHaveTextContent('light')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../ThemeProvider'` (files don't exist yet).

- [ ] **Step 3: Create `components/theme/useTheme.ts`**

```ts
'use client'

import { createContext, useContext } from 'react'

export type Theme = 'dark' | 'light'

export interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}
```

- [ ] **Step 4: Create `components/theme/ThemeProvider.tsx`**

```tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { ThemeContext, type Theme } from './useTheme'

const STORAGE_KEY = 'theme'

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'dark'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test`
Expected: `3 passed` in `ThemeProvider.test.tsx`.

- [ ] **Step 6: Point Tailwind's dark variant at the `.dark` class**

In `app/globals.css`, add this line directly after `@import "tailwindcss";`:

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));
```

- [ ] **Step 7: Run the full test suite and lint to confirm nothing broke**

Run: `npm test && npm run lint`
Expected: all tests pass, no lint errors.

- [ ] **Step 8: Commit**

```bash
git add components/theme app/globals.css
git commit -m "feat: add ThemeProvider with dark-class toggle and Tailwind dark variant"
```

---

### Task 3: ThemeToggle component

**Files:**
- Create: `components/header/ThemeToggle.tsx`
- Create: `components/header/__tests__/ThemeToggle.test.tsx`

**Interfaces:**
- Consumes: `useTheme()` from `components/theme/useTheme.ts` (Task 2).
- Produces: `ThemeToggle` component, default export not used — named export `ThemeToggle`, no props. Task 5 (`Header`) renders `<ThemeToggle />` inside a `<ThemeProvider>`.

- [ ] **Step 1: Write the failing test**

```tsx
// components/header/__tests__/ThemeToggle.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { ThemeToggle } from '../ThemeToggle'

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  it('shows a control labelled with the current theme', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )
    expect(screen.getByRole('button', { name: /dark/i })).toBeInTheDocument()
  })

  it('flips the label and html class when clicked', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: /dark/i }))
    expect(screen.getByRole('button', { name: /light/i })).toBeInTheDocument()
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../ThemeToggle'`.

- [ ] **Step 3: Implement `components/header/ThemeToggle.tsx`**

```tsx
'use client'

import { useTheme } from '@/components/theme/useTheme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      className="font-mono text-xs px-2 py-1 rounded border border-[#565C66] text-[#8A9099] hover:text-[#EDEFF2] hover:border-[#8A9099] transition-colors dark:border-[#565C66] dark:text-[#8A9099]"
    >
      {theme === 'dark' ? 'dark' : 'light'}
    </button>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: `2 passed` in `ThemeToggle.test.tsx`.

- [ ] **Step 5: Commit**

```bash
git add components/header/ThemeToggle.tsx components/header/__tests__/ThemeToggle.test.tsx
git commit -m "feat: add ThemeToggle button"
```

---

### Task 4: NavTabs component with active-route styling

**Files:**
- Create: `components/header/NavTabs.tsx`
- Create: `components/header/__tests__/NavTabs.test.tsx`

**Interfaces:**
- Consumes: `usePathname` from `next/navigation`, `Link` from `next/link`.
- Produces: `NavTabs` component, no props, renders `<nav>` with three `<Link>` tabs (`about`, `projects`, `contact`). Task 5 (`Header`) renders `<NavTabs />`.

- [ ] **Step 1: Write the failing test**

Mock `next/navigation`'s `usePathname` so the test can assert active-tab behavior without a real router.

```tsx
// components/header/__tests__/NavTabs.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const mockUsePathname = vi.fn()
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

import { NavTabs } from '../NavTabs'

describe('NavTabs', () => {
  it('renders all three tabs with .tsx suffixes', () => {
    mockUsePathname.mockReturnValue('/')
    render(<NavTabs />)
    expect(screen.getByText('about')).toBeInTheDocument()
    expect(screen.getByText('projects')).toBeInTheDocument()
    expect(screen.getByText('contact')).toBeInTheDocument()
  })

  it('marks the tab matching the current pathname as active', () => {
    mockUsePathname.mockReturnValue('/projects')
    render(<NavTabs />)
    const projectsLink = screen.getByRole('link', { name: /projects/i })
    expect(projectsLink).toHaveAttribute('aria-current', 'page')
    const aboutLink = screen.getByRole('link', { name: /about/i })
    expect(aboutLink).not.toHaveAttribute('aria-current')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../NavTabs'`.

- [ ] **Step 3: Implement `components/header/NavTabs.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/about', label: 'about' },
  { href: '/projects', label: 'projects' },
  { href: '/contact', label: 'contact' },
] as const

export function NavTabs() {
  const pathname = usePathname()

  return (
    <nav className="flex items-stretch">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={`font-mono text-sm px-[18px] py-4 border-b-2 transition-colors ${
              isActive
                ? 'text-[#EDEFF2] border-[#D9A441] dark:text-[#EDEFF2] dark:border-[#D9A441]'
                : 'text-[#8A9099] border-transparent hover:text-[#EDEFF2]'
            }`}
          >
            {tab.label}
            <span className="text-[#565C66]">.tsx</span>
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: `2 passed` in `NavTabs.test.tsx`.

- [ ] **Step 5: Commit**

```bash
git add components/header/NavTabs.tsx components/header/__tests__/NavTabs.test.tsx
git commit -m "feat: add NavTabs with active-route styling"
```

---

### Task 5: Header component (title bar, logo, tabs, resume CTA)

**Files:**
- Create: `components/header/Header.tsx`
- Create: `components/header/__tests__/Header.test.tsx`

**Interfaces:**
- Consumes: `ThemeProvider` (Task 2), `ThemeToggle` (Task 3), `NavTabs` (Task 4, which internally uses `usePathname` — must be mocked in this test too).
- Produces: `Header` component, no props, default export. `app/layout.tsx` (Task 6) renders `<Header />`.

- [ ] **Step 1: Write the failing test**

```tsx
// components/header/__tests__/Header.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

import Header from '../Header'

describe('Header', () => {
  it('renders the logo, title bar text, nav tabs, and resume CTA', () => {
    render(<Header />)
    expect(screen.getByText('wenhao')).toBeInTheDocument()
    expect(screen.getByText(/wenhao\.dev/)).toBeInTheDocument()
    expect(screen.getByText('about')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /resume/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dark|light/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../Header'`.

- [ ] **Step 3: Implement `components/header/Header.tsx`**

```tsx
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { ThemeToggle } from './ThemeToggle'
import { NavTabs } from './NavTabs'

export default function Header() {
  return (
    <ThemeProvider>
      <header className="rounded-lg overflow-hidden border border-[#2A2F38]">
        <div className="bg-[#1A1E24] dark:bg-[#1A1E24] px-[14px] py-[6px] flex items-center gap-2 font-mono text-xs text-[#6B7280]">
          <span className="flex gap-[6px] mr-[6px]">
            <span className="w-[9px] h-[9px] rounded-full bg-[#E5534B]" />
            <span className="w-[9px] h-[9px] rounded-full bg-[#DCA131]" />
            <span className="w-[9px] h-[9px] rounded-full bg-[#3FB950]" />
          </span>
          wenhao.dev — portfolio.tsx
        </div>
        <div className="bg-[#14171C] dark:bg-[#14171C] flex items-center justify-between px-[18px]">
          <div className="font-mono font-bold text-[15px] py-4 text-[#EDEFF2] flex items-center gap-[2px]">
            wenhao
            <span className="inline-block w-[7px] h-4 bg-[#4FA88F] ml-[2px] animate-pulse" />
          </div>
          <NavTabs />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a
              href="/resume.pdf"
              download
              className="font-mono text-xs bg-transparent border border-[#D9A441] text-[#D9A441] px-3 py-2 rounded-[5px] hover:bg-[#D9A441] hover:text-[#14171C] transition-colors"
            >
              $ resume --download
            </a>
          </div>
        </div>
      </header>
    </ThemeProvider>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: `1 passed` in `Header.test.tsx`, and full suite still green: `npm test` shows all files passing.

- [ ] **Step 5: Commit**

```bash
git add components/header/Header.tsx components/header/__tests__/Header.test.tsx
git commit -m "feat: assemble Header from title bar, NavTabs, ThemeToggle, resume CTA"
```

---

### Task 6: Wire Header into the root layout with correct fonts and no-flash theme script

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `Header` (Task 5).
- Produces: the live site — no further tasks depend on this one.

- [ ] **Step 1: Replace the Geist fonts with JetBrains Mono + Inter in `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import Header from "@/components/header/Header";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wenhao — Software Developer",
  description: "Portfolio of Wenhao, a software and web developer.",
};

const NO_FLASH_THEME_SCRIPT = `
(function () {
  try {
    var stored = window.localStorage.getItem('theme');
    var theme = stored === 'light' || stored === 'dark' ? stored : 'dark';
    document.documentElement.classList.toggle('dark', theme === 'dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script
          id="no-flash-theme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }}
        />
        <Header />
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Update font tokens and theme colors in `app/globals.css`**

Task 2 already added `@custom-variant dark (&:where(.dark, .dark *));` right after the `@import "tailwindcss";` line — leave that line as-is. Replace everything **after** it (the `:root`, `@theme inline`, `@media (prefers-color-scheme: dark)`, and `body` blocks) with:

```css
:root {
  --background: #F7F4EE;
  --foreground: #2B2A26;
}

.dark {
  --background: #14171C;
  --foreground: #EDEFF2;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
}

body {
  background: var(--background);
  color: var(--foreground);
}
```

The full file should now read: `@import`, `@custom-variant dark`, `:root`, `.dark`, `@theme inline`, `body` — with no `@media (prefers-color-scheme: dark)` block (the class-based `.dark` selector replaces it).

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: all tests still pass (layout isn't unit-tested here, but this confirms the refactor didn't break `Header`/`ThemeProvider`/`NavTabs`/`ThemeToggle`).

- [ ] **Step 4: Manually verify in the browser**

Run: `npm run dev`, open `http://localhost:3000`.
Expected:
- Header renders with title bar dots, `wenhao` logo with blinking teal cursor, three nav tabs, theme toggle button, and resume CTA.
- Clicking the theme toggle flips the whole page between the dark and light palettes from the spec, with no flash on reload.
- Reloading the page preserves the last-picked theme (check `localStorage.theme` in devtools).
- Navigating to `/about`, `/projects`, `/contact` underlines the matching tab (pages will 404 — expected, out of scope).

- [ ] **Step 5: Run lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx app/globals.css
git commit -m "feat: wire Header into root layout with JetBrains Mono/Inter fonts and no-flash theme script"
```

---

## Post-plan note (not a task)

`components/header/Header.tsx` links to `/resume.pdf` with a `download` attribute. No file exists at `public/resume.pdf` yet — add the actual resume PDF there before shipping; the link will 404 until then.
