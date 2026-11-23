import { hours } from '../data/site'

export { toKey, fromKey } from '../demo/bookings'

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
const toTime = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

/** Availability now comes from the demo booking service (real bookings in this browser). */
export { nextFreeChair } from '../demo/bookings'

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
