/**
 * DEMO DATA. Every person, phone number, email and amount here is fictional,
 * generated to preview the Command Center. Nothing is real business data.
 * Seeded, so the same sample appears on every load (relative to today's date).
 */
import { barbers as publicBarbers, services as publicServices, plans } from '../../data/content'
import { hours as shopHours } from '../../data/site'
import type {
  Appointment,
  AppointmentStatus,
  AuditEntry,
  BarberId,
  BarberRecord,
  Client,
  DemoData,
  GiftCardRecord,
  MembershipRecord,
  ServiceRecord,
  StaffAccount,
} from './types'

function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const FIRST = ['Arben', 'Daan', 'Lukas', 'Besnik', 'Milan', 'Jonas', 'Erion', 'Sven', 'Bram', 'Dritan', 'Felix', 'Noah', 'Ilir', 'Ruben', 'Mats', 'Florian', 'Kevin', 'Luan', 'Thijs', 'Elias', 'Driton', 'Jesse', 'Leon', 'Agon', 'Finn', 'Samir', 'Timo', 'Valon', 'Sem', 'Nils']
const LAST = ['Krasniqi', 'de Boer', 'Becker', 'Hoxha', 'Visser', 'Wagner', 'Gashi', 'Meijer', 'Kelmendi', 'Schulz', 'Bakker', 'Berisha', 'Smit', 'Koch', 'Morina', 'Mulder', 'Hoffmann', 'Shala', 'van Dijk', 'Richter']
const NOTES = [
  'Keeps the top long; sensitive skin around the neck.',
  'Prefers scissor work over clippers.',
  'Short on time — likes to be out in 30 min.',
  'Regular skin fade, 0.5 at the bottom.',
  'Allergic to strong fragrances — use the neutral oil.',
  'Likes a quiet appointment.',
  'Growing the beard out; only clean the cheek line.',
  '',
  '',
  '',
]

const day = (offset: number, base = new Date()) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset)
const at = (d: Date, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m)
}
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))

const barberHours: Record<BarberId, Record<number, { start: string; end: string } | null>> = (() => {
  const base = (off: number[]) => {
    const out: Record<number, { start: string; end: string } | null> = {}
    for (let d = 0; d < 7; d++) {
      const h = shopHours[d]
      out[d] = h && !off.includes(d) ? { start: h.open, end: h.close } : null
    }
    return out
  }
  const b = Object.fromEntries(publicBarbers.map((x) => [x.id, base(x.daysOff)])) as Record<BarberId, Record<number, { start: string; end: string } | null>>
  // a little variety: Theo starts later on weekdays
  for (const d of [2, 3, 4, 5]) if (b.theo[d]) b.theo[d] = { start: '12:00', end: b.theo[d]!.end }
  return b
})()

export function createDemoData(now = new Date()): DemoData {
  const r = rng(20261120)
  const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)]

  const barbers: BarberRecord[] = publicBarbers.map((b, i) => ({
    id: b.id,
    name: b.name,
    years: b.years,
    image: b.image,
    instagram: b.instagram,
    phone: `+31 6 0000 10${i}${i}`,
    email: `${b.id}@demo.noirbarberclub.example`,
    bio: '',
    specialty: '',
    active: true,
    hours: barberHours[b.id],
    timeOff:
      b.id === 'lucas'
        ? [{ id: 'to1', from: day(9, now).toISOString(), to: day(11, now).toISOString(), reason: 'Barber course in Lyon' }]
        : b.id === 'idris'
          ? [{ id: 'to2', from: day(-20, now).toISOString(), to: day(-18, now).toISOString(), reason: 'Holiday' }]
          : [],
    commission: b.id === 'marco' ? 0 : 0.45,
  }))

  const services: ServiceRecord[] = publicServices.map((s) => ({ id: s.id, category: s.category, duration: s.duration, price: s.price, active: true }))

  const clients: Client[] = Array.from({ length: 180 }, (_, i) => {
    const first = FIRST[i % FIRST.length]
    const last = LAST[(i * 7 + Math.floor(i / FIRST.length)) % LAST.length]
    return {
      id: `c${String(i + 1).padStart(3, '0')}`,
      name: `${first} ${last}`,
      phone: `+31 6 0000 ${String(1000 + i * 37).padStart(4, '0').slice(-4)}`,
      email: `${first}.${last.replace(/\s/g, '')}`.toLowerCase() + '@example.com',
      // the newest 40 sample clients joined in the last ~4 weeks; the rest earlier
      since: day(i >= 140 ? -Math.floor(r() * 26) : -Math.floor(62 + r() * 900), now).toISOString(),
      notes: pick(NOTES),
      preferredBarber: publicBarbers[i % 4].id,
      tags: [],
      marketing: r() > 0.4,
    }
  })

  // ——— appointments: 8 weeks back, 2 weeks ahead ———
  const appointments: Appointment[] = []
  const weights = services.map((s) => ({ s, w: s.id === 'signature-cut' ? 6 : s.id === 'skin-fade' ? 6 : s.id === 'cut-beard' ? 3 : s.id === 'noir-ritual' ? 1 : 2 }))
  const total = weights.reduce((a, b) => a + b.w, 0)
  const pickService = () => {
    let x = r() * total
    for (const { s, w } of weights) if ((x -= w) < 0) return s
    return services[0]
  }
  let n = 0
  for (let offset = -56; offset <= 14; offset++) {
    const d = day(offset, now)
    for (const b of barbers) {
      const h = b.hours[d.getDay()]
      if (!h) continue
      if (b.timeOff.some((t) => new Date(t.from) <= d && d <= new Date(t.to))) continue
      let m = toMin(h.start)
      const end = toMin(h.end)
      const fill = offset > 3 ? 0.45 - offset * 0.02 : 0.74
      while (m + 30 <= end) {
        const svc = pickService()
        if (m + svc.duration > end) break
        if (r() < fill) {
          const start = at(d, `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
          const endAt = new Date(start.getTime() + svc.duration * 60000)
          // 40 regulars carry much of the book; clients 140+ only start coming in the last ~4 weeks
          const pool = offset < -26 ? clients.slice(0, 140) : clients
          const client = r() < 0.35 ? clients[Math.floor(r() * 40)] : pool[Math.floor(r() * pool.length)]
          let status: AppointmentStatus
          if (endAt < now) {
            const x = r()
            status = x < 0.045 ? 'no_show' : x < 0.1 ? 'cancelled' : 'completed'
          } else if (start <= now) status = 'in_chair'
          else if (offset === 0 && start.getTime() - now.getTime() < 40 * 60000) status = r() < 0.5 ? 'arrived' : 'confirmed'
          else status = r() < 0.55 ? 'confirmed' : 'booked'
          const src = r()
          appointments.push({
            id: `a${++n}`,
            clientId: client.id,
            barberId: b.id,
            serviceId: svc.id,
            start: start.toISOString(),
            duration: svc.duration,
            price: svc.price,
            status,
            source: src < 0.62 ? 'online' : src < 0.86 ? 'phone' : 'walk_in',
            ...(status === 'completed' ? { paidWith: r() < 0.58 ? 'card' : r() < 0.8 ? 'cash' : r() < 0.9 ? 'membership' : 'gift_card' } : {}),
            ...(r() < 0.12 && status !== 'cancelled' ? { note: pick(['First visit', 'Bring reference photo', 'Running 5 min late', 'Wants the same as last time']) } : {}),
          })
          m += svc.duration + (r() < 0.3 ? 15 : 0)
        } else m += 30
      }
    }
  }

  // tags from history
  const visits = new Map<string, number>()
  for (const a of appointments) if (a.status === 'completed') visits.set(a.clientId, (visits.get(a.clientId) ?? 0) + 1)
  for (const c of clients) {
    const v = visits.get(c.id) ?? 0
    if (v >= 6) c.tags.push('regular')
    if (v <= 1) c.tags.push('new')
  }

  // ——— memberships ———
  const statuses: MembershipRecord['status'][] = ['active', 'active', 'active', 'active', 'active', 'active', 'paused', 'past_due', 'cancelled']
  const memberships: MembershipRecord[] = clients.slice(0, 18).map((c, i) => {
    const since = day(-Math.floor(40 + r() * 400), now)
    const renews = day(Math.floor(1 + r() * 29), now)
    c.tags.unshift('member')
    return {
      id: `m${i + 1}`,
      clientId: c.id,
      planId: (['essential', 'club', 'club', 'black'] as const)[i % 4],
      status: statuses[i % statuses.length],
      billing: i % 5 === 0 ? 'annual' : 'monthly',
      since: since.toISOString(),
      renews: renews.toISOString(),
      visitsThisMonth: Math.floor(r() * 4),
    }
  })

  // ——— gift cards ———
  const codeChars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const code = () => `NOIR-${Array.from({ length: 3 }, () => Array.from({ length: 4 }, () => codeChars[Math.floor(r() * codeChars.length)]).join('')).join('-')}`
  const ref = () => `GC-${Array.from({ length: 6 }, () => codeChars[Math.floor(r() * codeChars.length)]).join('')}`
  const gcSpec: [number, GiftCardRecord['payment'], GiftCardRecord['delivery'], GiftCardRecord['deliveryMethod'], GiftCardRecord['paymentMethod'], number][] = [
    [0, 'pending', 'awaiting_payment', 'whatsapp', 'cod', 100],
    [-1, 'pending', 'awaiting_payment', 'email', 'in_person', 75],
    [-2, 'paid', 'manual_required', 'email', 'in_person', 150],
    [-4, 'paid', 'delivered', 'sms', 'cod', 50],
    [-9, 'paid', 'delivered', 'email', 'in_person', 100],
    [-15, 'cancelled', 'awaiting_payment', 'whatsapp', 'cod', 250],
    [-22, 'paid', 'delivered', 'whatsapp', 'in_person', 150],
    [-35, 'paid', 'delivered', 'email', 'cod', 100],
    [-48, 'paid', 'delivered', 'email', 'in_person', 75],
  ]
  const giftCards: GiftCardRecord[] = gcSpec.map(([off, payment, delivery, dm, pm, amount], i) => {
    const created = at(day(off, now), `1${i % 9}:2${i}`)
    const recipient = `${FIRST[(i * 5 + 3) % FIRST.length]} ${LAST[(i * 3 + 1) % LAST.length]}`
    const used = payment === 'paid' && off < -8 ? Math.min(amount, [45, 48, 70, 30][i % 4]) : 0
    return {
      reference: ref(),
      code: code(),
      createdAt: created.toISOString(),
      amount,
      balance: payment === 'paid' ? amount - used : 0,
      recipient,
      sender: clients[(i * 7) % clients.length].name,
      sendTo: dm === 'email' ? recipient.split(' ')[0].toLowerCase() + '@example.com' : `+31 6 0000 ${String(5100 + i * 11)}`,
      deliveryMethod: dm,
      paymentMethod: pm,
      payment,
      delivery,
      ...(payment === 'paid' ? { activatedAt: new Date(created.getTime() + 3600_000 * 20).toISOString() } : {}),
      redemptions: used ? [{ at: day(off + 5, now).toISOString(), amount: used }] : [],
    }
  })

  const staff: StaffAccount[] = [
    { id: 'u-owner', name: 'Marco Velden', email: 'owner@demo.noirbarberclub.example', role: 'owner', barberId: 'marco', active: true, invitedAt: day(-400, now).toISOString(), lastSeenAt: now.toISOString() },
    ...barbers
      .filter((b) => b.id !== 'marco')
      .map((b, i) => ({
        id: `u-${b.id}`,
        name: b.name,
        email: b.email,
        role: 'barber' as const,
        barberId: b.id,
        active: true,
        invitedAt: day(-300 + i * 60, now).toISOString(),
        lastSeenAt: day(-i, now).toISOString(),
      })),
  ]

  const audit: AuditEntry[] = [
    { id: 'l1', at: at(day(-1, now), '18:42').toISOString(), actor: 'Marco Velden', role: 'owner', action: 'gift.confirm_payment', target: giftCards[2].reference },
    { id: 'l2', at: at(day(-2, now), '09:15').toISOString(), actor: 'Marco Velden', role: 'owner', action: 'service.price', target: 'Skin Fade · €46 → €48' },
    { id: 'l3', at: at(day(-3, now), '20:03').toISOString(), actor: 'Idris Haddad', role: 'barber', action: 'appointment.status', target: 'No-show' },
    { id: 'l4', at: at(day(-6, now), '11:30').toISOString(), actor: 'Marco Velden', role: 'owner', action: 'barber.timeoff', target: 'Lucas Moreau · course' },
    { id: 'l5', at: at(day(-12, now), '10:02').toISOString(), actor: 'Marco Velden', role: 'owner', action: 'staff.invite', target: 'theo@demo.noirbarberclub.example' },
  ]

  void plans
  return {
    staff,
    barbers,
    clients,
    appointments: appointments.sort((a, b) => a.start.localeCompare(b.start)),
    services,
    giftCards,
    memberships,
    audit,
    settings: {
      bookingWindowDays: 21,
      cancellationHours: 24,
      noShowFeePercent: 50,
      bufferMinutes: 0,
      allowWalkIns: true,
      cashOnDelivery: true,
      codArea: 'Amsterdam',
      reminderHours: 24,
    },
  }
}
