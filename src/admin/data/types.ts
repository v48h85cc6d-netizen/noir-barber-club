/**
 * Command Center data model. Mirrors the planned Supabase tables
 * (docs/command-center-architecture.md), so the demo store can later be
 * swapped for the real database without touching the screens.
 */
import type { ServiceId } from '../../data/content'

export type Role = 'owner' | 'barber'
export type BarberId = 'marco' | 'idris' | 'lucas' | 'theo'

export interface StaffAccount {
  id: string
  name: string
  email: string
  role: Role
  barberId?: BarberId
  active: boolean
  invitedAt: string
  lastSeenAt?: string
}

export interface Hours {
  start: string // "HH:MM"
  end: string
}

export interface BarberRecord {
  id: BarberId
  name: string
  years: number
  image: string
  instagram: string
  phone: string
  email: string
  bio: string
  specialty: string
  active: boolean
  /** 0 = Sunday … 6 = Saturday; null = not working */
  hours: Record<number, Hours | null>
  timeOff: { id: string; from: string; to: string; reason: string }[]
  /** commission share of service revenue, shown to the owner only */
  commission: number
}

export type AppointmentStatus = 'booked' | 'confirmed' | 'arrived' | 'in_chair' | 'completed' | 'no_show' | 'cancelled'
export type BookingSource = 'online' | 'phone' | 'walk_in'
export type PayMethod = 'card' | 'cash' | 'gift_card' | 'membership'

export interface Appointment {
  id: string
  clientId: string
  barberId: BarberId
  serviceId: ServiceId
  start: string // ISO
  duration: number
  price: number
  status: AppointmentStatus
  source: BookingSource
  note?: string
  paidWith?: PayMethod
}

export interface Client {
  id: string
  name: string
  phone: string
  email: string
  since: string
  notes: string
  preferredBarber: BarberId
  tags: ('member' | 'regular' | 'new')[]
  marketing: boolean
}

export interface ServiceRecord {
  id: ServiceId
  category: 'haircuts' | 'beard' | 'rituals'
  duration: number
  price: number
  active: boolean
}

export type GiftPayment = 'pending' | 'paid' | 'cancelled'
export type GiftDelivery = 'awaiting_payment' | 'manual_required' | 'delivered'

export interface GiftCardRecord {
  reference: string
  code: string
  createdAt: string
  amount: number
  balance: number
  recipient: string
  sender: string
  sendTo: string
  deliveryMethod: 'email' | 'whatsapp' | 'sms'
  paymentMethod: 'cod' | 'in_person'
  payment: GiftPayment
  delivery: GiftDelivery
  activatedAt?: string
  redemptions: { at: string; amount: number }[]
}

export type MembershipStatus = 'active' | 'paused' | 'past_due' | 'cancelled'

export interface MembershipRecord {
  id: string
  clientId: string
  planId: 'essential' | 'club' | 'black'
  status: MembershipStatus
  billing: 'monthly' | 'annual'
  since: string
  renews: string
  visitsThisMonth: number
}

export interface AuditEntry {
  id: string
  at: string
  actor: string
  role: Role
  action: string
  target: string
}

export interface Settings {
  bookingWindowDays: number
  cancellationHours: number
  noShowFeePercent: number
  bufferMinutes: number
  allowWalkIns: boolean
  cashOnDelivery: boolean
  codArea: string
  reminderHours: number
}

export interface DemoData {
  staff: StaffAccount[]
  barbers: BarberRecord[]
  clients: Client[]
  appointments: Appointment[]
  services: ServiceRecord[]
  giftCards: GiftCardRecord[]
  memberships: MembershipRecord[]
  audit: AuditEntry[]
  settings: Settings
}
