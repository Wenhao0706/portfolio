# Header Design Spec — IDE Tab Bar

Approved concept from brainstorming session (2 days ago). Header styled as a code editor: title bar with traffic-light dots, tab bar with name-as-file, nav-as-tabs, resume as a runnable command.

## Structure

- **Title bar** (optional, thin strip above tab bar): three dots (red/amber/green), text `wenhao.dev — portfolio.tsx`
- **Tab bar**: logo/name on the left, nav tabs in the middle, resume CTA on the right
  - Logo: `wenhao` + blinking teal cursor (dark theme only; static in light theme)
  - Nav tabs: `about.tsx`, `projects.tsx`, `contact.tsx` — active tab has a 2px bottom border in the accent color, inactive tabs dimmed
  - Resume CTA: `$ resume --download`, outlined button, fills solid on hover

## Theme tokens

| Token | Dark | Light |
|---|---|---|
| Title bar bg | `#1A1E24` | `#EDE9E0` |
| Title bar text | `#6B7280` | `#8A8272` |
| Tab bar bg | `#14171C` | `#F7F4EE` |
| Tab (inactive) | `#8A9099` | `#7A7568` |
| Tab (active) text | `#EDEFF2` | `#2B2A26` |
| Tab (active) underline | `#D9A441` (amber) | `#B5772E` (burnt amber) |
| Logo text | `#EDEFF2` | `#2B2A26` |
| Cursor accent | `#4FA88F` (teal) | — (no blink in light) |
| CTA border/text | `#D9A441` | `#B5772E` |
| CTA hover bg | `#D9A441` (text flips to `#14171C`) | `#B5772E` (text flips to `#F7F4EE`) |

## Typography

- Wordmark + tab labels: monospace — `ui-monospace, "JetBrains Mono", "Fira Code", monospace`
- Body copy elsewhere on the site: `Inter`, sans-serif

## Behavior

- Live light/dark toggle switch in the header (user requirement — not just a fixed theme)
- Active tab reflects current route
- Border radius 8px on the whole header container, 1px border `#2A2F38` (dark) around it

## Not yet decided

- Exact toggle switch placement/style (left of resume CTA vs far right — pick during implementation)
- Mobile/responsive collapse behavior for the tab bar
