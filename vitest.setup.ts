import '@testing-library/jest-dom/vitest'

/**
 * jsdom ships no IntersectionObserver, and two shipped components now build one
 * at mount (TerminalHeading's decode trigger, NavTabs' scroll spy). Without this
 * every test that renders a section throws on mount, which reads as a component
 * bug rather than a missing browser API.
 *
 * Deliberately inert: it observes nothing and never invokes its callback, so a
 * test sees the pre-intersection state. A test that needs the intersected state
 * should capture the callback and drive it explicitly.
 */
if (!('IntersectionObserver' in globalThis)) {
  class NoopIntersectionObserver implements IntersectionObserver {
    readonly root = null
    readonly rootMargin = ''
    readonly thresholds: ReadonlyArray<number> = []
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return []
    }
  }

  globalThis.IntersectionObserver =
    NoopIntersectionObserver as unknown as typeof IntersectionObserver
}
