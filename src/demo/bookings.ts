/**
 * DEMO BOOKING SERVICE — availability, booking and cancelling against the
 * local demo database. Every rule is re-checked inside the write, so a slot
 * that was taken meanwhile (e.g. in another tab) is refused, never double
 * booked. The real backend repeats these checks on the server and in the
 * database (exclusion constraint on barber + time range).
 */
import type { Appointment, AppointmentStatus, BarberRecord, DemoData } from '../admin/data/types'
import type { AuthSession } from './auth'
import { readDb, shortId, updateDb } from './db'

export interface Slot {
  time: string
  available: boolean
}

export const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const fromKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const at = (date: Date, time: string) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(toMin(time) / 60), toMin(time) % 60)

/** Minimum notice for online bookings made today. */
export const LEAD_MINUTES = 30
/** Statuses that keep the chair occupied. */
const BLOCKING: AppointmentStatus[] = ['booked', 'confirmed', 'arrived', 'in_chair', 'completed', 'no_show']
/** Statuses a customer may still cancel themselves. */
export const CUSTOMER_CANCELLABLE: AppointmentStatus[] = ['booked', 'confirmed']

export const activeBarbers = (d: DemoData) => d.barbers.filter((b) => b.active)
export const activeServices = (d: DemoData) => d.services.filter((s) => s.active)

/** Bookable days from today, as far ahead as the owner allows. */
export function bookingDays(d: DemoData, from = new Date()) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  return Array.from({ length: d.settings.bookingWindowDays }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
}

function onTimeOff(b: BarberRecord, date: Date) {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return b.timeOff.some((t) => new Date(t.from) <= day && day <= new Date(t.to))
}

/** Does this barber (or, for 'any', at least one barber) work on that date? */
export function worksOn(d: DemoData, barberId: string | null, date: Date) {
  const list = !barberId || barberId === 'any' ? activeBarbers(d) : activeBarbers(d).filter((b) => b.id === barberId)
  return list.some((b) => b.hours[date.getDay()] && !onTimeOff(b, date))
}

/** Is anybody working that day at all (the shop is open)? */
export const shopOpen = (d: DemoData, date: Date) => worksOn(d, 'any', date)

function busy(d: DemoData, barberId: string, start: Date, duration: number, ignoreId?: string) {
  const buffer = d.settings.bufferMinutes * 60_000
  const s = start.getTime()
  const e = s + duration * 60_000
  return d.appointments.some((a) => {
    if (a.barberId !== barberId || a.id === ignoreId || !BLOCKING.includes(a.status)) return false
    const as = new Date(a.start).getTime()
    const ae = as + a.duration * 60_000
    return s < ae + buffer && as < e + buffer
  })
}

function slotsForBarber(d: DemoData, b: BarberRecord, date: Date, duration: number, now: Date): Slot[] {
  const h = b.hours[date.getDay()]
  if (!b.active || !h || onTimeOff(b, date)) return []
  const open = toMin(h.start)
  const close = toMin(h.end)
  const earliest = now.getTime() + LEAD_MINUTES * 60_000
  const out: Slot[] = []
  for (let m = open; m + duration <= close; m += 15) {
    if (m % 30 !== 0 && duration >= 30) continue
    const start = at(date, toTime(m))
    out.push({ time: toTime(m), available: start.getTime() >= earliest && !busy(d, b.id, start, duration) })
  }
  return out
}

/** Time slots for a date. For 'any' barber a slot is free when at least one barber is free. */
export function getSlots(d: DemoData, barberId: string | null, date: Date, duration: number, now = new Date()): Slot[] {
  if (!barberId || barberId === 'any') {
    const lists = activeBarbers(d)
      .map((b) => slotsForBarber(d, b, date, duration, now))
      .filter((l) => l.length)
    if (!lists.length) return []
    const times = [...new Set(lists.flatMap((l) => l.map((s) => s.time)))].sort()
    return times.map((time) => ({ time, available: lists.some((l) => l.find((x) => x.time === time)?.available) }))
  }
  const b = d.barbers.find((x) => x.id === barberId)
  return b ? slotsForBarber(d, b, date, duration, now) : []
}

/** First barber free for an 'any barber' slot. */
export function firstFreeBarber(d: DemoData, date: Date, time: string, duration: number, now = new Date()) {
  return activeBarbers(d).find((b) => slotsForBarber(d, b, date, duration, now).find((s) => s.time === time && s.available)) ?? null
}

/** Earliest free slot from now (any barber, 45 min), for the homepage. */
export function nextFreeChair(now = new Date()) {
  const d = readDb()
  for (let i = 0; i < 8; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    const slot = getSlots(d, 'any', date, 45, now).find((s) => s.available)
    if (slot) return { offset: i, date, time: slot.time }
  }
  return null
}

export interface BookingRequest {
  barberId: string // a barber id or 'any'
  serviceId: string
  date: string // yyyy-mm-dd
  time: string // HH:MM
  note: string
}

export type BookingError = 'not_signed_in' | 'not_customer' | 'unverified' | 'invalid' | 'outside_window' | 'slot_taken'
export type BookingResult = { ok: true; appointment: Appointment } | { ok: false; error: BookingError }

export function createBooking(session: AuthSession | null, req: BookingRequest, now = new Date()): BookingResult {
  if (!session) return { ok: false, error: 'not_signed_in' }
  // only customer accounts book through the website
  if (session.role !== 'customer' || !session.clientId) return { ok: false, error: 'not_customer' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(req.date) || !/^\d{2}:\d{2}$/.test(req.time)) return { ok: false, error: 'invalid' }

  return updateDb<BookingResult>((d) => {
    const service = activeServices(d).find((s) => s.id === req.serviceId)
    const client = d.clients.find((c) => c.id === session.clientId)
    if (!service || !client) return { ok: false, error: 'invalid' }
    // only customers with a verified email address can book
    if (!d.accounts.find((a) => a.id === session.accountId)?.emailVerifiedAt) return { ok: false, error: 'unverified' }
    const date = fromKey(req.date)
    const days = bookingDays(d, now).map(toKey)
    if (!days.includes(req.date)) return { ok: false, error: 'outside_window' }

    const barber =
      req.barberId === 'any'
        ? firstFreeBarber(d, date, req.time, service.duration, now)
        : (activeBarbers(d).find((b) => b.id === req.barberId) ?? null)
    if (!barber) return { ok: false, error: req.barberId === 'any' ? 'slot_taken' : 'invalid' }
    const slot = slotsForBarber(d, barber, date, service.duration, now).find((s) => s.time === req.time)
    if (!slot) return { ok: false, error: 'invalid' }
    if (!slot.available) return { ok: false, error: 'slot_taken' }

    let ref = shortId('NB-')
    while (d.appointments.some((a) => a.ref === ref)) ref = shortId('NB-')
    const stamp = now.toISOString()
    const appointment: Appointment = {
      id: `ab-${ref.slice(3).toLowerCase()}`,
      ref,
      clientId: client.id,
      barberId: barber.id,
      serviceId: service.id,
      start: at(date, req.time).toISOString(),
      duration: service.duration,
      price: service.price,
      status: 'booked',
      source: 'online',
      ...(req.note.trim() ? { note: req.note.trim().slice(0, 400) } : {}),
      createdAt: stamp,
      updatedAt: stamp,
    }
    d.appointments.push(appointment)
    d.appointments.sort((a, b) => a.start.localeCompare(b.start))
    if (!client.preferredBarber) client.preferredBarber = barber.id
    d.audit.unshift({ id: shortId('l-'), at: stamp, actor: session.name, role: 'customer', action: 'booking.create', target: `${ref} · ${barber.name}` })
    return { ok: true, appointment }
  })
}

/** Whether a customer may still cancel online (else: call the shop). */
export function customerCanCancel(a: Appointment, d: DemoData, now = new Date()) {
  if (!CUSTOMER_CANCELLABLE.includes(a.status)) return false
  return new Date(a.start).getTime() - now.getTime() >= d.settings.cancellationHours * 3_600_000
}

export type CancelResult = { ok: true } | { ok: false; error: 'not_signed_in' | 'forbidden' | 'too_late' }

export function cancelBooking(session: AuthSession | null, id: string, now = new Date()): CancelResult {
  if (!session || session.role !== 'customer') return { ok: false, error: session ? 'forbidden' : 'not_signed_in' }
  return updateDb<CancelResult>((d) => {
    const a = d.appointments.find((x) => x.id === id)
    // a customer can only ever touch their own appointments
    if (!a || a.clientId !== session.clientId) return { ok: false, error: 'forbidden' }
    if (!customerCanCancel(a, d, now)) return { ok: false, error: 'too_late' }
    a.status = 'cancelled'
    a.cancelledBy = 'customer'
    a.updatedAt = now.toISOString()
    d.audit.unshift({ id: shortId('l-'), at: now.toISOString(), actor: session.name, role: 'customer', action: 'booking.cancel', target: a.ref ?? a.id })
    return { ok: true }
  })
}

/** A customer's own appointments only, newest first. */
export function customerAppointments(d: DemoData, session: AuthSession | null) {
  if (!session || session.role !== 'customer' || !session.clientId) return []
  return d.appointments.filter((a) => a.clientId === session.clientId).sort((a, b) => b.start.localeCompare(a.start))
}
