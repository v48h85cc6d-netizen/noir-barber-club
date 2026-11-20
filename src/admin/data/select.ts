import type { Appointment, BarberRecord, DemoData } from './types'

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
export const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
export const hhmm = (iso: string | Date) => {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
export const endOf = (a: Appointment) => new Date(new Date(a.start).getTime() + a.duration * 60000)
export const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))

/** Monday-based start of week. */
export const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7))

export function inRange(list: Appointment[], from: Date, to: Date) {
  const a = from.getTime()
  const b = to.getTime()
  return list.filter((x) => {
    const t = new Date(x.start).getTime()
    return t >= a && t < b
  })
}

export const isLive = (a: Appointment) => a.status !== 'cancelled'
export const revenueOf = (list: Appointment[]) => list.filter((a) => a.status === 'completed').reduce((s, a) => s + a.price, 0)

/** Minutes a barber is scheduled to work on a date (0 when off). */
export function workMinutes(b: BarberRecord, d: Date) {
  const h = b.hours[d.getDay()]
  if (!h || !b.active) return 0
  if (b.timeOff.some((t) => new Date(t.from) <= d && d <= new Date(t.to))) return 0
  return toMin(h.end) - toMin(h.start)
}

/** Booked share of available chair time between two dates. */
export function utilization(data: DemoData, from: Date, to: Date) {
  let avail = 0
  for (let d = startOfDay(from); d < to; d = addDays(d, 1)) for (const b of data.barbers) avail += workMinutes(b, d)
  const booked = inRange(data.appointments, from, to)
    .filter((a) => a.status !== 'cancelled' && a.status !== 'no_show')
    .reduce((s, a) => s + a.duration, 0)
  return avail ? Math.min(1, booked / avail) : 0
}

export const pctChange = (now: number, prev: number) => (prev ? ((now - prev) / prev) * 100 : null)

export function greetingPart(d = new Date()): 'morning' | 'afternoon' | 'evening' {
  const h = d.getHours()
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'
}
