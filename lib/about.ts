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

/**
 * The footer sign-off, set large.
 *
 * Lifted verbatim from the closing clause of the third About paragraph rather
 * than written fresh. A footer statement invented for the footer is a slogan; his
 * own sentence, repeated as the last thing on the page, is a position. Change the
 * paragraph and this should change with it.
 */
export const SIGNOFF = "Building things I don't fully know how to build yet."

/**
 * IANA zone rather than a city name. Malaysia has a single timezone and the
 * WhatsApp country code (+60) is the only location fact this repo actually has,
 * so the label says "Malaysia" and never guesses a city.
 */
export const TIMEZONE = 'Asia/Kuala_Lumpur'
export const LOCATION_LABEL = 'Malaysia'
