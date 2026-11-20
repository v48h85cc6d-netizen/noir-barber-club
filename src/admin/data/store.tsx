import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { createDemoData } from './seed'
import type {
  AppointmentStatus,
  BarberId,
  BarberRecord,
  Client,
  DemoData,
  Hours,
  MembershipStatus,
  Role,
  ServiceRecord,
  Settings,
} from './types'

/**
 * DEMO STORE — in-memory only. Changes last until the page is reloaded and are
 * never sent anywhere. It mirrors the permission rules the database will
 * enforce with row-level security (see supabase/), so both roles can be
 * previewed realistically. In production these checks live in Postgres.
 */
export interface Session {
  mode: 'demo'
  userId: string
  name: string
  role: Role
  barberId?: BarberId
}

type Result = { ok: true } | { ok: false; reason: 'forbidden' | 'invalid' }

/** Status changes a barber may make on their own appointments. */
export const BARBER_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  booked: ['confirmed', 'arrived', 'no_show'],
  confirmed: ['arrived', 'no_show'],
  arrived: ['in_chair', 'no_show'],
  in_chair: ['completed'],
  completed: [],
  no_show: ['arrived'],
  cancelled: [],
}

/** Fields a barber may edit on their own profile. */
export type ProfilePatch = Partial<Pick<BarberRecord, 'bio' | 'specialty' | 'instagram' | 'phone'>>

interface Ctx {
  session: Session
  /** Data already scoped to what this role may see. */
  data: DemoData
  setStatus: (id: string, status: AppointmentStatus) => Result
  reassign: (id: string, barberId: BarberId) => Result
  updateService: (id: ServiceRecord['id'], patch: Partial<Omit<ServiceRecord, 'id' | 'category'>>) => Result
  setBarberActive: (id: BarberId, active: boolean) => Result
  setBarberHours: (id: BarberId, day: number, hours: Hours | null) => Result
  addTimeOff: (id: BarberId, from: string, to: string, reason: string) => Result
  updateProfile: (id: BarberId, patch: ProfilePatch) => Result
  inviteBarber: (name: string, email: string) => Result
  confirmGiftPayment: (ref: string) => Result
  cancelGift: (ref: string) => Result
  markGiftDelivered: (ref: string) => Result
  redeemGift: (ref: string, amount: number) => Result
  setMembershipStatus: (id: string, status: MembershipStatus) => Result
  updateSettings: (patch: Partial<Settings>) => Result
}

const StoreContext = createContext<Ctx | null>(null)
const forbidden: Result = { ok: false, reason: 'forbidden' }
const invalid: Result = { ok: false, reason: 'invalid' }
const ok: Result = { ok: true }

/** What a barber may see of a client: no email, no marketing flags, no other barbers' notes. */
const limitClient = (c: Client): Client => ({ ...c, email: '', marketing: false })

export function DemoStoreProvider({ session, children }: { session: Session; children: ReactNode }) {
  const [raw, setRaw] = useState<DemoData>(() => createDemoData())
  const idc = useRef(1000)
  const isOwner = session.role === 'owner'

  const mutate = useCallback(
    (action: string, target: string, fn: (d: DemoData) => void) => {
      setRaw((prev) => {
        const next = structuredClone(prev)
        fn(next)
        next.audit.unshift({ id: `l${++idc.current}`, at: new Date().toISOString(), actor: session.name, role: session.role, action, target })
        return next
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
      if (!isOwner && !BARBER_TRANSITIONS[a.status].includes(status)) return forbidden
      mutate('appointment.status', `${a.id} · ${status}`, (d) => {
        const t = d.appointments.find((x) => x.id === id)!
        t.status = status
        if (status === 'completed' && !t.paidWith) t.paidWith = 'card'
      })
      return ok
    },
    reassign: (id, barberId) => {
      if (!isOwner) return forbidden
      mutate('appointment.reassign', `${id} → ${barberId}`, (d) => {
        d.appointments.find((x) => x.id === id)!.barberId = barberId
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
        const acc = d.staff.find((s) => s.barberId === id && s.role === 'barber')
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
        d.barbers.find((b) => b.id === id)!.timeOff.push({ id: `to${++idc.current}`, from, to, reason })
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
    inviteBarber: (name, email) => {
      if (!isOwner) return forbidden
      if (name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return invalid
      mutate('staff.invite', email.trim(), (d) => {
        d.staff.push({ id: `u${++idc.current}`, name: name.trim(), email: email.trim(), role: 'barber', active: false, invitedAt: new Date().toISOString() })
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
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside DemoStoreProvider')
  return ctx
}
