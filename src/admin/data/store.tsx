import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { hashPassword, isEmail, isPhone, MIN_PASSWORD, normEmail } from '../../demo/auth'
import { resetDb, shortId, updateDb, useDb } from '../../demo/db'
import type {
  Appointment,
  AppointmentStatus,
  BarberId,
  BarberRecord,
  Client,
  DemoData,
  Hours,
  MembershipStatus,
  PayMethod,
  Role,
  ServiceRecord,
  Settings,
} from './types'

/**
 * DEMO STORE — reads and writes the shared demo database (localStorage, see
 * src/demo/db.ts), so customer bookings from the website appear here and
 * changes survive a reload. Every action re-checks the role, mirroring the
 * row-level security the real database will enforce (see supabase/).
 */
export interface Session {
  mode: 'demo'
  userId: string
  name: string
  role: Role
  barberId?: BarberId
}

type Result = { ok: true } | { ok: false; reason: 'forbidden' | 'invalid' | 'taken' }

/** Status changes a barber may make on their own appointments. */
export const BARBER_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  booked: ['confirmed', 'arrived', 'cancelled', 'no_show'],
  confirmed: ['arrived', 'in_chair', 'completed', 'cancelled', 'no_show'],
  arrived: ['in_chair', 'completed', 'no_show'],
  in_chair: ['completed'],
  completed: [],
  no_show: ['arrived'],
  cancelled: [],
}

/**
 * Booking rules on top of the transitions: an appointment can only be
 * cancelled before it starts, and only completed / marked no-show once it
 * has started. Applies to barbers; the owner may correct anything.
 */
export function barberOptions(a: Appointment, now = new Date()): AppointmentStatus[] {
  const started = new Date(a.start).getTime() <= now.getTime()
  const sameDay = new Date(a.start).toDateString() === now.toDateString()
  return BARBER_TRANSITIONS[a.status].filter((s) => {
    if (s === 'cancelled') return !started
    if (s === 'completed' || s === 'no_show') return started
    if (s === 'arrived' || s === 'in_chair') return sameDay || started
    return true
  })
}

/** Fields a barber may edit on their own profile. */
export type ProfilePatch = Partial<Pick<BarberRecord, 'bio' | 'specialty' | 'instagram' | 'phone'>>
/** Fields the owner may edit on a barber. */
export type BarberPatch = Partial<Pick<BarberRecord, 'name' | 'phone' | 'email' | 'specialty' | 'bio' | 'years'>>

interface Ctx {
  session: Session
  /** Data already scoped to what this role may see. */
  data: DemoData
  setStatus: (id: string, status: AppointmentStatus) => Result
  reassign: (id: string, barberId: BarberId) => Result
  recordPayment: (id: string, method: PayMethod) => Result
  updateService: (id: ServiceRecord['id'], patch: Partial<Omit<ServiceRecord, 'id' | 'category'>>) => Result
  setBarberActive: (id: BarberId, active: boolean) => Result
  setBarberHours: (id: BarberId, day: number, hours: Hours | null) => Result
  addTimeOff: (id: BarberId, from: string, to: string, reason: string) => Result
  updateProfile: (id: BarberId, patch: ProfilePatch) => Result
  createBarber: (input: { name: string; email: string; phone: string; password: string }) => Result
  updateBarber: (id: BarberId, patch: BarberPatch) => Result
  confirmGiftPayment: (ref: string) => Result
  cancelGift: (ref: string) => Result
  markGiftDelivered: (ref: string) => Result
  redeemGift: (ref: string, amount: number) => Result
  setMembershipStatus: (id: string, status: MembershipStatus) => Result
  updateSettings: (patch: Partial<Settings>) => Result
  resetDemo: () => Result
}

const StoreContext = createContext<Ctx | null>(null)
const forbidden: Result = { ok: false, reason: 'forbidden' }
const invalid: Result = { ok: false, reason: 'invalid' }
const taken: Result = { ok: false, reason: 'taken' }
const ok: Result = { ok: true }

/** What a barber may see of a client: no email, no marketing flags. */
const limitClient = (c: Client): Client => ({ ...c, email: '', marketing: false })

export function DemoStoreProvider({ session, children }: { session: Session; children: ReactNode }) {
  const raw = useDb()
  const isOwner = session.role === 'owner'

  const mutate = useCallback(
    (action: string, target: string, fn: (d: DemoData) => void) => {
      updateDb((next) => {
        fn(next)
        next.audit.unshift({ id: shortId('l-'), at: new Date().toISOString(), actor: session.name, role: session.role, action, target })
      })
    },
    [session],
  )

  const data = useMemo<DemoData>(() => {
    if (isOwner) return raw
    const mine = raw.appointments.filter((a) => a.barberId === session.barberId)
    const clientIds = new Set(mine.map((a) => a.clientId))
    return {
      ...raw,
      accounts: [],
      staff: raw.staff.filter((s) => s.id === session.userId),
      barbers: raw.barbers.filter((b) => b.id === session.barberId),
      appointments: mine,
      clients: raw.clients.filter((c) => clientIds.has(c.id)).map(limitClient),
      giftCards: [],
      memberships: [],
      audit: [],
    }
  }, [raw, isOwner, session])

  const own = (barberId: BarberId) => isOwner || barberId === session.barberId

  const value: Ctx = {
    session,
    data,
    setStatus: (id, status) => {
      const a = raw.appointments.find((x) => x.id === id)
      if (!a || !own(a.barberId)) return forbidden
      if (!isOwner && !barberOptions(a).includes(status)) return forbidden
      mutate('appointment.status', `${a.ref ?? a.id} · ${status}`, (d) => {
        const t = d.appointments.find((x) => x.id === id)!
        t.status = status
        t.updatedAt = new Date().toISOString()
        if (status === 'cancelled') t.cancelledBy = session.role
        else delete t.cancelledBy
      })
      return ok
    },
    recordPayment: (id, method) => {
      if (!isOwner) return forbidden
      const a = raw.appointments.find((x) => x.id === id)
      if (!a || a.status === 'cancelled' || a.status === 'no_show') return invalid
      mutate('appointment.payment', `${a.ref ?? a.id} · ${method}`, (d) => {
        const t = d.appointments.find((x) => x.id === id)!
        t.paidWith = method
        t.updatedAt = new Date().toISOString()
      })
      return ok
    },
    reassign: (id, barberId) => {
      if (!isOwner) return forbidden
      if (!raw.barbers.some((b) => b.id === barberId)) return invalid
      mutate('appointment.reassign', `${id} → ${barberId}`, (d) => {
        const t = d.appointments.find((x) => x.id === id)!
        t.barberId = barberId
        t.updatedAt = new Date().toISOString()
      })
      return ok
    },
    updateService: (id, patch) => {
      if (!isOwner) return forbidden
      if ((patch.price !== undefined && !(patch.price > 0 && patch.price < 1000)) || (patch.duration !== undefined && !(patch.duration >= 10 && patch.duration <= 240))) return invalid
      mutate('service.update', id, (d) => Object.assign(d.services.find((s) => s.id === id)!, patch))
      return ok
    },
    setBarberActive: (id, active) => {
      if (!isOwner) return forbidden
      mutate(active ? 'barber.activate' : 'barber.deactivate', id, (d) => {
        d.barbers.find((b) => b.id === id)!.active = active
        const st = d.staff.find((s) => s.barberId === id && s.role === 'barber')
        if (st) st.active = active
        // a deactivated barber can no longer sign in
        const acc = d.accounts.find((a) => a.barberId === id && a.role === 'barber')
        if (acc) acc.active = active
      })
      return ok
    },
    setBarberHours: (id, day, hours) => {
      if (!isOwner) return forbidden
      mutate('barber.hours', `${id} · day ${day}`, (d) => {
        d.barbers.find((b) => b.id === id)!.hours[day] = hours
      })
      return ok
    },
    addTimeOff: (id, from, to, reason) => {
      if (!isOwner) return forbidden
      if (!from || !to || to < from) return invalid
      mutate('barber.timeoff', `${id} · ${reason}`, (d) => {
        d.barbers.find((b) => b.id === id)!.timeOff.push({ id: shortId("to-"), from, to, reason })
      })
      return ok
    },
    updateProfile: (id, patch) => {
      if (!own(id)) return forbidden
      const allowed: ProfilePatch = { bio: patch.bio, specialty: patch.specialty, instagram: patch.instagram, phone: patch.phone }
      mutate('barber.profile', id, (d) => {
        const b = d.barbers.find((x) => x.id === id)!
        for (const [k, v] of Object.entries(allowed)) if (v !== undefined) (b as unknown as Record<string, unknown>)[k] = v
      })
      return ok
    },
    createBarber: ({ name, email, phone, password }) => {
      // only the owner creates staff logins; customers can never become barbers
      if (!isOwner) return forbidden
      const e = normEmail(email)
      if (name.trim().length < 2 || !isEmail(e) || !isPhone(phone) || password.length < MIN_PASSWORD) return invalid
      if (raw.accounts.some((a) => a.email === e)) return taken
      let id = name.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'barber'
      while (raw.barbers.some((b) => b.id === id)) id = `${id}-${shortId('', 3).toLowerCase()}`
      const now = new Date().toISOString()
      mutate('staff.create', e, (d) => {
        d.barbers.push({
          id,
          name: name.trim(),
          years: 0,
          image: '',
          instagram: '',
          phone: phone.trim(),
          email: e,
          bio: '',
          specialty: '',
          active: true,
          // starts with the shop's usual week; the owner adjusts it in the barber's sheet
          hours: { 0: null, 1: null, 2: { start: '10:00', end: '19:00' }, 3: { start: '10:00', end: '19:00' }, 4: { start: '10:00', end: '20:00' }, 5: { start: '10:00', end: '20:00' }, 6: { start: '09:00', end: '18:00' } },
          timeOff: [],
          commission: 0.45,
        })
        const accountId = `u-${id}`
        d.staff.push({ id: accountId, name: name.trim(), email: e, role: 'barber', barberId: id, active: true, invitedAt: now })
        d.accounts.push({ id: accountId, role: 'barber', email: e, name: name.trim(), phone: phone.trim(), passwordHash: hashPassword(e, password), createdAt: now, active: true, barberId: id })
      })
      return ok
    },
    updateBarber: (id, patch) => {
      if (!isOwner) return forbidden
      const b = raw.barbers.find((x) => x.id === id)
      if (!b) return invalid
      const acc = raw.accounts.find((a) => a.barberId === id)
      const next = { ...b, ...patch }
      if (next.name.trim().length < 2 || (next.phone && !isPhone(next.phone)) || !isEmail(next.email) || !(next.years >= 0 && next.years < 70)) return invalid
      const e = normEmail(next.email)
      if (e !== normEmail(b.email)) {
        // the built-in demo logins keep their email
        if (acc?.builtIn) return forbidden
        if (raw.accounts.some((a) => a.email === e && a.id !== acc?.id)) return taken
      }
      mutate('barber.update', id, (d) => {
        const t = d.barbers.find((x) => x.id === id)!
        Object.assign(t, { name: next.name.trim(), phone: next.phone.trim(), email: e, specialty: next.specialty, bio: next.bio, years: next.years })
        const st = d.staff.find((s) => s.barberId === id)
        if (st) Object.assign(st, { name: t.name, email: e })
        const a = d.accounts.find((x) => x.barberId === id)
        if (a) Object.assign(a, { name: t.name, email: e, phone: t.phone })
      })
      return ok
    },
    confirmGiftPayment: (ref) => {
      const g = raw.giftCards.find((x) => x.reference === ref)
      if (!isOwner) return forbidden
      if (!g || g.payment !== 'pending') return invalid
      mutate('gift.confirm_payment', ref, (d) => {
        const t = d.giftCards.find((x) => x.reference === ref)!
        t.payment = 'paid'
        t.balance = t.amount
        t.activatedAt = new Date().toISOString()
        t.delivery = 'manual_required'
      })
      return ok
    },
    cancelGift: (ref) => {
      const g = raw.giftCards.find((x) => x.reference === ref)
      if (!isOwner) return forbidden
      if (!g || g.payment !== 'pending') return invalid
      mutate('gift.cancel', ref, (d) => {
        d.giftCards.find((x) => x.reference === ref)!.payment = 'cancelled'
      })
      return ok
    },
    markGiftDelivered: (ref) => {
      const g = raw.giftCards.find((x) => x.reference === ref)
      if (!isOwner) return forbidden
      if (!g || g.payment !== 'paid') return invalid
      mutate('gift.delivered', ref, (d) => {
        d.giftCards.find((x) => x.reference === ref)!.delivery = 'delivered'
      })
      return ok
    },
    redeemGift: (ref, amount) => {
      const g = raw.giftCards.find((x) => x.reference === ref)
      if (!isOwner) return forbidden
      // unpaid / inactive cards can never be redeemed
      if (!g || g.payment !== 'paid' || !(amount > 0) || amount > g.balance) return invalid
      mutate('gift.redeem', `${ref} · €${amount}`, (d) => {
        const t = d.giftCards.find((x) => x.reference === ref)!
        t.balance = Math.round((t.balance - amount) * 100) / 100
        t.redemptions.push({ at: new Date().toISOString(), amount })
      })
      return ok
    },
    setMembershipStatus: (id, status) => {
      if (!isOwner) return forbidden
      mutate('membership.status', `${id} · ${status}`, (d) => {
        d.memberships.find((m) => m.id === id)!.status = status
      })
      return ok
    },
    updateSettings: (patch) => {
      if (!isOwner) return forbidden
      mutate('settings.update', Object.keys(patch).join(', '), (d) => Object.assign(d.settings, patch))
      return ok
    },
    resetDemo: () => {
      if (!isOwner) return forbidden
      resetDb()
      return ok
    },
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside DemoStoreProvider')
  return ctx
}
