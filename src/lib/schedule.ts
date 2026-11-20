import { hours } from '../data/site'
import { barbers } from '../data/content'

export const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const fromKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
const toTime = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

/** Small deterministic hash so demo availability is stable between renders. */
function hash(str: string) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

export function isShopOpen(date: Date) {
  return hours[date.getDay()] !== null
}

export function barberWorks(barberId: string | null, date: Date) {
  if (!isShopOpen(date)) return false
  if (!barberId || barberId === 'any') return true
  const b = barbers.find((x) => x.id === barberId)
  return b ? !b.daysOff.includes(date.getDay()) : false
}

/** Upcoming days shown in the date picker. */
export function upcomingDays(count = 21, from = new Date()) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  return Array.from({ length: count }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
}

export interface Slot {
  time: string
  available: boolean
}

function slotsForBarber(barberId: string, date: Date, duration: number, now: Date): Slot[] {
  const day = hours[date.getDay()]
  if (!day || !barberWorks(barberId, date)) return []
  const open = toMin(day.open)
  const close = toMin(day.close)
  const isToday = toKey(date) === toKey(now)
  const nowMin = now.getHours() * 60 + now.getMinutes() + 30 // 30 min booking buffer
  const out: Slot[] = []
  for (let m = open; m + duration <= close; m += 15) {
    if (m % 30 !== 0 && duration >= 30) continue
    const taken = hash(`${barberId}|${toKey(date)}|${m}`) < 0.38
    const past = isToday && m < nowMin
    out.push({ time: toTime(m), available: !taken && !past })
  }
  return out
}

/**
 * Demo availability. For "any" barber a slot is free when at least one
 * barber working that day is free.
 */
export function getSlots(barberId: string | null, date: Date, duration: number, now = new Date()): Slot[] {
  if (!barberId || barberId === 'any') {
    const lists = barbers.map((b) => slotsForBarber(b.id, date, duration, now)).filter((l) => l.length)
    if (!lists.length) return []
    const longest = lists.reduce((a, b) => (b.length > a.length ? b : a))
    return longest.map((s) => ({
      time: s.time,
      available: lists.some((l) => l.find((x) => x.time === s.time)?.available),
    }))
  }
  return slotsForBarber(barberId, date, duration, now)
}

/** Which barber would take an "any barber" slot (first free one). */
export function assignBarber(date: Date, time: string, duration: number) {
  for (const b of barbers) {
    if (slotsForBarber(b.id, date, duration, new Date()).find((s) => s.time === time && s.available)) return b
  }
  return null
}

export const endTime = (time: string, duration: number) => toTime(toMin(time) + duration)

export type OpenStatus =
  | { open: true; until: string }
  | { open: false; opens: { offset: number; date: Date; time: string } | null }

/** Whether the shop is open now, and if not, when it next opens. Formatted by the UI per language. */
export function openStatus(now = new Date()): OpenStatus {
  const day = hours[now.getDay()]
  const min = now.getHours() * 60 + now.getMinutes()
  if (day && min >= toMin(day.open) && min < toMin(day.close)) return { open: true, until: day.close }
  for (let i = 0; i < 8; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    const h = hours[d.getDay()]
    if (!h) continue
    if (i === 0 && min >= toMin(h.open)) continue
    return { open: false, opens: { offset: i, date: d, time: h.open } }
  }
  return { open: false, opens: null }
}

/** Earliest free demo slot from now (any barber, standard 45 min cut). */
export function nextFreeChair(now = new Date()) {
  for (let i = 0; i < 8; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    const slot = getSlots('any', d, 45, now).find((s) => s.available)
    if (slot) return { offset: i, date: d, time: slot.time }
  }
  return null
}
