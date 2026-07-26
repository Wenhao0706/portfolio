---
name: portfolio-deferred-vs-forgotten
description: How to tell a deliberately-deferred gap from a forgotten one on this portfolio — the task docs are the record, but bracketed [placeholder] copy shipped to prod is NOT always tracked
metadata:
  type: project
---

This project keeps living docs at `tasks/portfolio/<feature>/current.md` with an explicit `## Next Steps` section. Items listed there (e.g. the reCAPTCHA-blocked fallback, "clear form fields after a successful send") are deliberately deferred and awaiting the owner's decision — report them as deferred, do not re-flag as oversights.

**Why:** The owner works in bursts between travel and asks for outstanding work to be recorded rather than started. Re-raising a documented deferral as a new finding wastes the review.

**How to apply:** Before flagging, grep the relevant `current.md` `Next Steps` + `Last Session`. But the coverage has a hole: bracketed `[placeholder]` copy that shipped to production is only partly tracked — `tasks/portfolio/content-pages/current.md` names the About narrative and per-project sections, and NOT the `/contact` page's intro line or its secondary-links line, both of which have been live in prod as literal `[...]` editor's notes. Verify placeholders against the live site (`curl https://www.manhou.de/<route>`), not the doc's claim of what's still bracketed. Related: [[contact-form-stakes]]
