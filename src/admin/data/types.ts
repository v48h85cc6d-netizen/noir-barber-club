/**
 * Command Center data model. Mirrors the planned Supabase tables
 * (docs/command-center-architecture.md), so the demo store can later be
 * swapped for the real database without touching the screens.
 */
import type { ServiceId } from '../../data/content'

export type Role = 'owner' | 'barber'
/** The four founding barbers use their public ids; barbers the owner adds get generated ids. */
export type BarberId = string

/**
 * DEMO login account (localStorage only). Passwords are stored as a salted
 * SHA-256 digest, which is still NOT secure: anyone with the browser can read
 * and change this data. Real sign-in replaces this table with the auth provider.
 */
export interface DemoAccount {
  id: string
  role: 'owner' | 'barber' | 'customer'
  /** stored lower-case */
  email: string
  name: string
  phone: string
  passwordHash: string
  createdAt: string
  active: boolean
  /** owner/barber accounts point at their barber record */
  barberId?: BarberId
  /** customer accounts point at their client record */
  clientId?: string
  /** customers: when the email address was verified with the emailed code (accounts only exist once verified) */
  emailVerifiedAt?: string
  /** the two built-in demo logins cannot be removed or have their email changed */
  builtIn?: boolean
}

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
  /** booking reference shown to the customer (online bookings) */
  ref?: string
  createdAt?: string
  updatedAt?: string
  cancelledBy?: 'customer' | 'barber' | 'owner'
}

export interface Client {
  id: string
  name: string
  phone: string
  email: string
  since: string
  notes: string
  /** '' when the client has not booked a barber yet */
  preferredBarber: BarberId | ''
  /** set for customers who registered on the website */
  accountId?: string
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
  role: Role | 'customer'
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
  /** schema version, bumped when the stored shape changes */
  version: number
  /** when the sample data was generated */
  seededAt: string
  accounts: DemoAccount[]
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
