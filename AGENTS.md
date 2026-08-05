<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Gotchas {#general-gotchas}

| Symptom | Cause | Fix |
|---------|-------|-----|
| Next.js `<Image>` console warning "has either width or height modified, but not the other" persists even after adding `style={{ height: 'auto' }}` | Tailwind Preflight's `img { height: auto }` already overrides the `height` attribute; fixing `width` to a px value while only `height` is `'auto'` reproduces the same one-axis-overridden mismatch | Set **both** `width: 'auto'` and `height: 'auto'` in the `style` prop so the browser derives the ratio from the `width`/`height` attributes instead. Applies to RESPONSIVE images only — see the fixed-size row below |
| An `<Image>` that must be a fixed size (avatar, icon) ignores its `h-N w-N` classes and renders at some other size | The `style={{ width: 'auto', height: 'auto' }}` fix above is for responsive images; on a fixed-size one the inline style outranks the sizing classes, so the element has no fixed dimensions at all | Use `fill` inside a sized `relative` wrapper (`<div className="relative h-16 w-16 overflow-hidden">`) with `object-cover`. `fill` needs no `width`/`height` props, so the aspect-ratio warning never arises |
| Empty space below the last section that scrolls but contains nothing | An absolutely positioned element (background decoration) adds nothing to its parent's HEIGHT but still extends the document's SCROLLABLE area, so anything parked past the end of the content invents scroll depth. Invisible at low opacity | Clip the decoration to its container (`inset-y-0` + `overflow-hidden` on a wrapper) rather than trusting its offsets to stay inside the content — see `components/StackField.tsx` |
| Columns look unevenly spaced even though every grid gap is identical | A grid gives equal gaps between column EDGES, but the gutter a reader sees is the space between the last character of one column and the first of the next. A column of long strings fills its cell while a column of short ones leaves most of its cell empty | Size the columns to their content and put one real gap between them (flex + `gap-x-N`), rather than equal `1fr` cells — see `components/Footer.tsx` |
| A brand logo from `simple-icons` is invisible in dark mode, or the icon does not exist at all | The package stores true brand values, and several are near-black (Next.js `#000000`, Angular `#0F0F11`). It also carries no C# or LinkedIn icon — both were removed over trademark, and `siSharp` is an unrelated electronics brand | Give near-black brands an explicit dark-mode substitute (see `TechStack.tsx`'s `darkHex`); for a missing icon render a text glyph or plain label, never a lookalike from another brand |
| An element injected by a third-party script (e.g. reCAPTCHA's `.grecaptcha-badge`) is styled correctly on its own page but reappears unstyled on every other page after client-side navigation | The script appends the element to `<body>`, outside React's tree, where it survives navigation — but a `<style>` tag rendered inside the component unmounts along with the component | Declare the rule in `app/globals.css`, never in a `<style>` element inside the component that triggers the script |
| `vi.mock(...)` factory throws a "Cannot access 'x' before initialization" (temporal dead zone) error even though `x` is declared above it | vitest hoists `vi.mock` calls to the top of the file, above any top-level `const` the factory closes over | Wrap the value in `vi.hoisted(() => ...)` and reference that from the factory instead of a plain top-level `const` |
| A `vi.fn()` mock used as a constructor (`new Foo()`) throws "X is not a constructor" | An arrow function can never be called with `new` — `vi.fn()` defaults to one under the hood in some mock setups | Give the mock a `function` expression body, or mock the module with a class/constructor-shaped object, when the real export is instantiated with `new` |
| A Server Action logs `POST 200` in Vercel, but the submission was actually rejected | A Server Action returns 200 whenever it executes without throwing; every user-facing error state travels in the response payload, not the status code. Only an unhandled throw yields 500 | Judge success from the action's own log lines and the real side effect (inbox, DB row), never from the HTTP status |
| A fail-open validation gate never blocks anything, and its own logs look healthy | A wrapper library that catches errors and re-buckets them by its own taxonomy can destroy the distinction the gate depends on — `node-email-verifier` folds `ENODATA` ("this domain has no mail server", a verdict about the DOMAIN) in with `ECONNREFUSED`/`ETIMEDOUT` and returns one `DNS_LOOKUP_FAILED`, which any correct fail-open gate waves through | Resolve the underlying signal yourself when a gate's decision hinges on WHOSE fault a failure is. `dns.resolveMx` THROWS `ENODATA` rather than resolving to an empty array, so the library's only blocking code was unreachable — see `lib/contact/email-verify.ts` |
| A gate's block branch has never once fired in production | Read as "nobody has triggered it yet". Usually means the branch is unreachable | Treat an unfired block branch as a defect to disprove: feed it the input it exists for and watch for its log line. A gate that only ever logs `degraded` is not a quiet gate |
| An IP-keyed gate never fires locally, or an IP-derived value renders as `::1` | `next dev` DOES set `x-forwarded-for`, to the IPv6 loopback — so "no proxy in front means no header" is wrong, and the empty-IP branch you wrote for local dev never runs | Match loopback explicitly against `::1`, `127.0.0.1` and `::ffff:127.0.0.1` (`LOOPBACK_IPS` in `lib/chat/ratelimit.ts`), never by testing for an absent header |
| An `// eslint-disable-next-line <rule> -- reason` comment suppresses nothing | A `--` explanation wrapped onto further `//` lines makes the *next line* another comment rather than the code, so the directive lands one line short | Put the prose above and leave the bare directive as the last line before the code |
| JSX stops parsing after a comment is added beside an attribute | `//` is not valid inside an opening tag's attribute list; only `{/* */}` is | Move the note above the element or into the component docblock — a `//` line among attributes is a syntax error, not a stray comment |
| A hidden honeypot field silently swallows real users' submissions | Naming it after an autofill category (`company`, `organization`, `address`, `phone`) makes password managers and Chrome fill it — `autocomplete="off"` is ignored for address-type fields — and a tripped honeypot usually returns fake success, so the loss is invisible | Name the field something no filler recognises, render no `<label>`, and add `data-1p-ignore` + `data-lpignore="true"`. See `lib/contact/honeypot.ts` |

## React & Animation {#react-animation}

⚠️ **No animation anywhere in this project takes a `prefers-reduced-motion` guard.** The site owner runs reduced motion at OS level, so a guard silently snaps every reveal to its end state and the page looks unanimated with nothing in the console. This is a deliberate accessibility trade-off the owner has made twice — do not reintroduce `matchMedia('(prefers-reduced-motion: reduce)')` or `motion-reduce:` anywhere.

| Symptom | Cause | Fix |
|---------|-------|-----|
| An animation plays for everyone except the site owner | `app/globals.css`'s `.animate-float` utility is the one animation still carrying a `prefers-reduced-motion` guard, contradicting the rule above and snapping it flat at OS level for the owner | Give a new animation its own keyframes instead of reusing `animate-float` (see `.chat-launcher`), or delete that guard so the file matches the stated rule |
| An element that should be hidden on some loads flashes visible on every load before disappearing | Its hidden state lives only in `useEffect`, which runs after first paint. The server cannot know which branch applies, so the markup ships visible | Put the hidden state in the MARKUP as the baseline class (`opacity-0`) and have the effect UNDO it on the branch that shows it — see `HomeIntro.tsx`'s terminal and seam |
| A `useEffect` reacting to a `useActionState` result runs after the first successful action and never again | The Server Action returns a module-scoped frozen state object BY REFERENCE on every success (`SUCCESS_STATE` in `app/contact/actions.ts`), so a `[state]` dependency never changes after the first one | Key post-action side effects on the pending edge instead — `wasPending.current && !isPending && state.status === 'success'` — which flips once per submission regardless. See `ContactForm.tsx`'s `form.reset()` |
| A `sessionStorage` "first visit only" gate skips its content on a genuine first visit, in dev only | React StrictMode double-invokes effects; a read-then-write gate has already written the flag by the second pass, which then reads it back as "seen" | Decide once into a `useRef` (`if (ref.current === null) { ref.current = read(); write() }`) — a ref survives the double-invoke because it is the same instance |
| A parent's effect reads a flag a child component wrote and always sees the written value | Child effects run BEFORE parent effects, so the child's write always precedes the parent's read | Have the child pass the value on the event it already dispatches (`new CustomEvent(name, { detail })`), never re-read shared storage in the listener |
| A ScrollTrigger reveal never appears to run, and the section is already visible when scrolled to | A trigger created at mount for a section near the fold satisfies its start condition immediately and fires behind whatever is still covering the screen | Build scroll triggers AFTER the intro completes (`timeline.onComplete`), then `ScrollTrigger.refresh()`. Keep a timeout fallback — sections start at `opacity-0`, so a chain that never fires leaves a blank page |

## Deployment {#deployment}

Production is **`https://www.manhou.de`**. `portfolio-mr-no-name.vercel.app` is the generated fallback alias.

| Symptom | Cause | Fix |
|---------|-------|-----|
| Every route on the `.vercel.app` URL 302s to `vercel.com/sso-api` while real visitors reach the site fine | Vercel Deployment Protection gates preview and generated `.vercel.app` URLs but leaves the custom production domain public | Judge live-site reachability from `www.manhou.de`, not the `.vercel.app` alias |
| A newly added env var (or a newly connected Vercel Storage integration) has no effect in production | Env vars bind to a deployment when it is built, so a function deployed earlier keeps running without them. Nothing errors — a fail-open gate just stays silently inert | Redeploy after adding or connecting anything env-related; `git commit --allow-empty` is enough to trigger one |
| A server-side round trip is unexpectedly slow, or a region-sensitive service is far away | Vercel's default Function Region is `iad1` (Washington DC), independent of where the domain's visitors or any provisioned database live | Set the region in Settings → Functions (`sin1` for this project) and confirm it from the `x-vercel-id:` response header, whose prefix names the region that served the request |
| A domain added in Vercel serves the site instead of redirecting to the canonical one | Vercel serves every added domain directly by default; a redirect is a separate opt-in setting on that domain's row (308 for permanent). The account-level Domains page has no such setting at all — only Project → Settings → Domains does | Add the domain, then Edit its row and set "Redirect to". Confirm with `curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://<bare-domain>/` |
| The contact form starts failing every submission after the site moves to a different hostname | reCAPTCHA console domain matching is DOWNWARD only: a key registered for `www.example.com` covers its subdomains but NOT the apex `example.com`. A mismatch fails verification with a 200 response and no log line | Register both the apex and `www` in the reCAPTCHA console before changing which hostname serves the site |
| Cloudflare's free proxy (orange cloud) in front of Vercel adds ~300–500 ms TTFB | `cf-cache-status: DYNAMIC` means Cloudflare passes HTML through uncached, so every request pays visitor → CF edge → Vercel edge with nothing saved; free plans have no Argo routing. Vercel also warns it disables their own DDoS/bot mitigation | Measure before committing to it: compare `time_starttransfer` on the custom domain against the `.vercel.app` alias, which bypasses Cloudflare. If proxying anyway, SSL/TLS must be **Full (strict)** BEFORE the flip or the site redirect-loops |
| A Vercel function cannot reach a Cloudflare-proxied hostname, but the same URL works fine from your own machine | Bot Fight Mode challenges datacenter IPs with a JS interstitial, so the call gets a 403 `Just a moment…` page and nothing reaches the origin. A browser or home-connection `curl` passes, which makes it look like an application bug | Probe from INSIDE the caller and read the actual status/body before touching app code. Then Security → Bots → Bot Fight Mode off, safe when the main site is a DNS-only record and the tunnel hostname is the only proxied one |
| React hydration breaks only in production after a Cloudflare setting is enabled | Email Address Obfuscation and "Replace insecure JavaScript libraries" rewrite the HTML/JS at the edge, so what React hydrates no longer matches what it rendered. Hotlink Protection separately breaks social link-preview crawlers | Leave all three off. Cloudflare features that rewrite response bodies are incompatible with this app |
| Need to confirm a deploy actually went live when the build output is byte-identical (e.g. an empty commit, or an env-only change) | Asset hashes don't change, so the usual chunk-hash fingerprint is useless, and a green dashboard only says the build finished | Poll Next.js's buildId, which changes every build: `curl -s <url> -H "RSC: 1" \| grep -oE '"b":"[^"]+"'` |

## Header Component Conventions {#header-conventions}

| ❌ NEVER | ✅ ALWAYS |
|----------|----------|
| Introduce a second accent color in `components/header/*` | Reuse amber (`#B5772E` light / `#D9A441` dark) — the site's single deliberate accent |
| Apply the active nav-tab's `border-b-2` amber treatment to a non-active element at rest | Reserve it for `NavTabs.tsx`'s route-matched state only — reusing it elsewhere reads as a false "you are here" signal |
| Start a new GSAP tween/timeline (including inside a mouse-leave handler) without killing/tracking the previous one | Store every tween in a ref and kill it before starting a new one — see `AnimatedName.tsx` |
| Add a `prefers-reduced-motion` guard to a header hover animation | Header animations always play regardless of OS motion settings — this is the site-wide rule, see `## React & Animation` |
| Ship a hover-only animation (GSAP tween or CSS `group-hover:`) without a keyboard-focus equivalent | Mirror `onMouseEnter`/`onMouseLeave` with `onFocus`/`onBlur`, or use `group-focus-visible:` for CSS — see `ResumeDownload.tsx`/`NavTabs.tsx` |

### Gotchas

| Symptom | Cause | Fix |
|---------|-------|-----|
| `<html>` hydration mismatch console warning on load | The `beforeInteractive` no-flash theme script in `app/layout.tsx` mutates `document.documentElement.classList` before React hydrates | Expected — `suppressHydrationWarning` on `<html>` is intentional, do not remove it or the script |
| `getByRole('link', { name: /.../ })` / `getByText(...)` can't match a spaced or multi-word string even though it visibly renders correctly | Testing Library's text matching can't assemble a string split across sibling `<span>` elements (one per letter) | Match by accessible name via `getByRole`, not `getByText`, when a label is split into individual letter spans (see `AnimatedName.tsx`, `NavTabs.tsx`) |
| SVG `<filter>` (e.g. glow/blur) applied to a thin `<line>` or other zero-height/zero-width shape renders nothing — the element vanishes | Default `filterUnits="objectBoundingBox"` sizes the filter region as a percentage of the element's own bounding box; a zero-height line has a zero-height bbox, so the region collapses to zero and clips all output | Set `filterUnits="userSpaceOnUse"` with explicit absolute `x`/`y`/`width`/`height` on the `<filter>` instead of percentages |

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **portfolio** (308 symbols, 364 relationships, 1 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

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
