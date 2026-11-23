/**
 * DEMO DATABASE — browser localStorage only.
 *
 * One JSON document holds the whole demo (accounts, barbers, clients,
 * appointments, …) so the public website, the customer area and the staff
 * Command Center all read and write the same data in this browser. Nothing
 * leaves the device and nothing is shared between browsers or people.
 *
 * Swap point for the real backend: replace readDb/updateDb with calls to the
 * API / database (see docs/command-center-architecture.md). Screens use the
 * services in auth.ts and bookings.ts, never localStorage directly.
 */
import { useSyncExternalStore } from 'react'
import { createDemoData, DATA_VERSION } from '../admin/data/seed'
import type { DemoData } from '../admin/data/types'

const KEY = 'noir.demo.db'
const EVENT = 'noir-demo-db'

let cache: DemoData | null = null
/** used when localStorage is blocked (private mode etc.): data lasts for this tab only */
let memoryOnly = false

function storage(): Storage | null {
  if (memoryOnly) return null
  try {
    const s = window.localStorage
    const probe = '__noir_probe__'
    s.setItem(probe, '1')
    s.removeItem(probe)
    return s
  } catch {
    memoryOnly = true
    return null
  }
}

function load(): DemoData {
  const s = storage()
  if (s) {
    try {
      const raw = s.getItem(KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as DemoData
        if (parsed && parsed.version === DATA_VERSION && Array.isArray(parsed.accounts)) return parsed
      }
    } catch {
      /* corrupt data: fall through and re-seed */
    }
  }
  const fresh = createDemoData()
  persist(fresh)
  return fresh
}

function persist(d: DemoData) {
  const s = storage()
  if (!s) return
  try {
    s.setItem(KEY, JSON.stringify(d))
  } catch {
    // quota exceeded: keep working in memory for this tab
    memoryOnly = true
  }
}

/** Current data (seeded on first use). Treat as read-only; change it with updateDb. */
export function readDb(): DemoData {
  if (!cache) cache = load()
  return cache
}

/**
 * Apply a change on top of the latest stored data (re-read first, so another
 * tab's changes are not lost), save it and notify every subscriber.
 */
export function updateDb<T>(fn: (d: DemoData) => T): T {
  cache = null
  const next = structuredClone(readDb())
  const out = fn(next)
  cache = next
  persist(next)
  window.dispatchEvent(new Event(EVENT))
  return out
}

/** Back to the original sample data and the two built-in logins. Signs everyone out. */
export function resetDb() {
  const fresh = createDemoData()
  cache = fresh
  persist(fresh)
  try {
    window.localStorage.removeItem('noir.demo.session')
    window.sessionStorage.removeItem('noir.booking.draft')
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT))
}

export function subscribeDb(cb: () => void) {
  const onLocal = () => cb()
  // another tab changed the data
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) {
      cache = null
      cb()
    }
  }
  window.addEventListener(EVENT, onLocal)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, onLocal)
    window.removeEventListener('storage', onStorage)
  }
}

/** React hook: re-renders whenever the demo data changes (this tab or another). */
export function useDb(): DemoData {
  return useSyncExternalStore(subscribeDb, readDb, readDb)
}

export const isMemoryOnly = () => {
  readDb()
  return memoryOnly
}

/** Short random id / reference, e.g. "NB-7K3QXM". */
export function shortId(prefix: string, len = 6) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const buf = new Uint32Array(len)
  crypto.getRandomValues(buf)
  return `${prefix}${Array.from(buf, (n) => chars[n % chars.length]).join('')}`
}
