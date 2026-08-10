/**
 * The About copy, shared by the About section and the terminal's `cat about.md`.
 *
 * Lives here rather than inside the component because two surfaces now render the
 * same bio. A second copy is a bio that drifts, and the version a visitor reads in
 * the terminal is exactly the one an interviewer will quote back.
 */
export const ABOUT_PARAGRAPHS = [
  "I'm a WordPress and PHP developer at Tech Strongbox, where most of my time goes to client sites. Theme work, plugin customisation, and the kind of bug that only ever shows up on someone else's hosting.",
  "I studied software engineering and built a cleaning service booking app as my final year project, a Laravel API with a Flutter app on top. It's still the thing I'm proudest of, mostly because of how much of it broke before it worked.",
  "Right now I'm learning React and Node, and this site is where I'm doing it. I'm looking for a junior developer role where I can keep building things I don't fully know how to build yet.",
]

/** One-line answer for `whoami`. */
export const ROLE_LINE = 'junior developer, WordPress and PHP at Tech Strongbox'
