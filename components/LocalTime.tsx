'use client'

import { useSyncExternalStore } from 'react'
import { LOCATION_LABEL, TIMEZONE } from '@/lib/about'

/**
 * Every 20s rather than every second. The display is minute-precision, so a
 * per-second timer would be 59 wasted notifications out of 60.
 */
const TICK_MS = 20_000

/** Defined at module scope so the subscription identity is stable across renders. */
function subscribe(onStoreChange: () => void) {
  const timer = window.setInterval(onStoreChange, TICK_MS)
  return () => window.clearInterval(timer)
}

function readClock() {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE,
  }).format(new Date())
}

/** The server has no business guessing a clock, so it renders nothing. */
function readServerClock() {
  return null
}

/**
 * Man Hou's local time, not the visitor's.
 *
 * Pinned to a fixed IANA zone on purpose. A clock showing readers their own time
 * tells them nothing; showing them his answers the question a remote employer
 * actually has, which is how far apart the working hours are.
 *
 * useSyncExternalStore rather than useState plus useEffect. A clock IS an
 * external store, and the effect version has to setState on mount to avoid a
 * hydration mismatch, which is a cascading render React explicitly warns about.
 * The server snapshot is null, so the markup ships without a time and fills in on
 * hydration. The surrounding text reads correctly while it is still empty.
 */
export function LocalTime() {
  const time = useSyncExternalStore(subscribe, readClock, readServerClock)

  if (!time) return null

  return (
    <span>
      {LOCATION_LABEL} <span aria-hidden>·</span> {time} local
    </span>
  )
}
