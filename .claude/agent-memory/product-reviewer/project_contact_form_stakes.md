---
name: contact-form-stakes
description: The /contact form is the portfolio's ONLY contact channel — false positives on any anti-spam gate cost a job opportunity, so judge gates by false-positive cost, not spam-blocked rate
metadata:
  type: project
---

The contact form on `manhou.de/contact` is the single contact channel on the whole site — as of 2026-07-27 there is no `mailto:`, no LinkedIn, no GitHub link anywhere in `app/`, `components/`, or `lib/`. The visitor is typically a recruiter or hiring manager.

**Why:** The owner is actively job hunting. A message silently dropped or wrongly rejected by an anti-spam gate is a lost job opportunity; a piece of spam getting through costs nothing but an inbox line. The asymmetry is extreme and one-directional.

**How to apply:** When product-reviewing anything on the contact path (honeypot, rate limit, email deliverability, reCAPTCHA, mailer), rank findings by *false-positive cost to a real visitor*, not by spam efficacy. Silent-success failure modes (honeypot fake-success, fail-open gates that stopped working) outrank noisy rejections. Always ask "does this visitor have any other way to reach him?" — currently the answer is no. Related: [[portfolio-deferred-vs-forgotten]]
