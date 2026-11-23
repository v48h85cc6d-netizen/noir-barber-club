/**
 * DEMO AUTHENTICATION — local mock, NOT production security.
 *
 * Accounts live in the demo database (localStorage) and the session is a
 * localStorage entry. Passwords are kept as a salted SHA-256 digest only so
 * they are not shown in plain text; anyone with access to this browser can
 * still read or change the data. There is no server, no email and no rate
 * limiting. Replace `localDemoAuth` with the real provider (e.g. Supabase
 * Auth) behind the same `AuthService` interface — screens only use the
 * interface and `useSession`.
 */
import { useSyncExternalStore } from 'react'
import type { DemoAccount, DemoData } from '../admin/data/types'
import { readDb, shortId, subscribeDb, updateDb } from './db'
import { sha256 } from './sha256'

export type AccountRole = DemoAccount['role']
/** Which sign-in form is used. Each form only accepts its own role. */
export type SignInArea = 'owner' | 'barber' | 'customer'

export interface AuthSession {
  accountId: string
  role: AccountRole
  name: string
  email: string
  phone: string
  barberId?: string
  clientId?: string
  signedInAt: string
}

export type AuthError =
  | 'invalid_credentials'
  | 'wrong_area'
  | 'inactive'
  | 'email_taken'
  | 'invalid_input'
  | 'invalid_code'
  | 'not_signed_in'
  /** the email has a registration waiting for its verification code */
  | 'unverified'
  /** no pending registration (expired, or started in another browser) */
  | 'no_pending'

export type FieldError = 'name' | 'email' | 'phone' | 'password_short' | 'password_mismatch' | 'required'
export interface RegisterInput {
  name: string
  email: string
  phone: string
  password: string
  confirm: string
}
export type RegisterFields = Partial<Record<keyof RegisterInput, FieldError>>

export type AuthResult<T = AuthSession> =
  | { ok: true; value: T }
  /** accountRole is set for 'wrong_area', so the screen can point to the right login */
  | { ok: false; error: AuthError; fields?: RegisterFields; accountRole?: AccountRole }

export interface AuthService {
  getSession(): AuthSession | null
  signIn(email: string, password: string, area: SignInArea): AuthResult
  /** Step 1 of sign-up: validate, check the email is free, keep the registration as PENDING (no account yet). */
  startRegistration(input: RegisterInput): AuthResult<{ email: string; name: string }>
  /**
   * Step 2: create the customer account and sign in. Only call after the
   * server confirmed the emailed code (see src/demo/verification.ts).
   */
  completeRegistration(email: string): AuthResult
  pendingRegistration(email: string): { email: string; name: string } | null
  signOut(): void
  /** Demo: returns the reset code instead of emailing it (null when no customer account has that email). */
  requestPasswordReset(email: string): { demoCode: string | null }
  resetPassword(email: string, code: string, password: string, confirm: string): AuthResult<null>
  changePassword(current: string, next: string, confirm: string): AuthResult<null>
  updateProfile(patch: { name: string; phone: string }): AuthResult
  subscribe(cb: () => void): () => void
}

const SESSION_KEY = 'noir.demo.session'
/** registrations waiting for email verification, kept apart from real accounts */
const PENDING_KEY = 'noir.demo.pending'
const PENDING_TTL = 24 * 3_600_000
const RESET_KEY = 'noir.demo.reset'
const SESSION_EVENT = 'noir-demo-session'

export const MIN_PASSWORD = 8
export const normEmail = (e: string) => e.trim().toLowerCase()
export const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim())
export const isPhone = (p: string) => /^\+?[\d\s()-]{7,20}$/.test(p.trim()) && p.replace(/\D/g, '').length >= 7
export const hashPassword = (email: string, password: string) => sha256(`noir-demo:${normEmail(email)}:${password}`)

export function validateRegistration(i: RegisterInput): RegisterFields {
  const f: RegisterFields = {}
  if (i.name.trim().length < 2) f.name = i.name.trim() ? 'name' : 'required'
  if (!isEmail(i.email)) f.email = i.email.trim() ? 'email' : 'required'
  if (!isPhone(i.phone)) f.phone = i.phone.trim() ? 'phone' : 'required'
  if (i.password.length < MIN_PASSWORD) f.password = i.password ? 'password_short' : 'required'
  if (!i.confirm) f.confirm = 'required'
  else if (i.confirm !== i.password) f.confirm = 'password_mismatch'
  return f
}

function readRaw(key: string, store: 'local' | 'session' = 'local') {
  try {
    return (store === 'local' ? window.localStorage : window.sessionStorage).getItem(key)
  } catch {
    return null
  }
}
function writeRaw(key: string, value: string | null, store: 'local' | 'session' = 'local') {
  try {
    const s = store === 'local' ? window.localStorage : window.sessionStorage
    if (value === null) s.removeItem(key)
    else s.setItem(key, value)
  } catch {
    /* storage blocked: the session then lasts until the page closes */
    memorySession = value
  }
}
let memorySession: string | null = null

const toSession = (a: DemoAccount, signedInAt: string): AuthSession => ({
  accountId: a.id,
  role: a.role,
  name: a.name,
  email: a.email,
  phone: a.phone,
  ...(a.barberId ? { barberId: a.barberId } : {}),
  ...(a.clientId ? { clientId: a.clientId } : {}),
  signedInAt,
})

// cached so useSyncExternalStore gets a stable object between changes
let snap: { raw: string | null; db: DemoData | null; value: AuthSession | null } = { raw: null, db: null, value: null }

function currentSession(): AuthSession | null {
  const raw = readRaw(SESSION_KEY) ?? memorySession
  const db = readDb()
  if (raw === snap.raw && db === snap.db) return snap.value
  let value: AuthSession | null = null
  if (raw) {
    try {
      const s = JSON.parse(raw) as { accountId: string; signedInAt: string }
      const acc = db.accounts.find((a) => a.id === s.accountId)
      // a deleted or deactivated account loses its session immediately
      if (acc && acc.active) value = toSession(acc, s.signedInAt)
    } catch {
      value = null
    }
  }
  snap = { raw, db, value }
  return value
}

function setSession(acc: DemoAccount | null) {
  writeRaw(SESSION_KEY, acc ? JSON.stringify({ accountId: acc.id, signedInAt: new Date().toISOString() }) : null)
  window.dispatchEvent(new Event(SESSION_EVENT))
}

const fail = <T = AuthSession>(error: AuthError, fields?: RegisterFields): AuthResult<T> => ({ ok: false, error, ...(fields ? { fields } : {}) })

interface Pending {
  name: string
  email: string
  phone: string
  /** salted digest only, never the password itself */
  passwordHash: string
  createdAt: number
}
function readPending(): Record<string, Pending> {
  try {
    const all = JSON.parse(readRaw(PENDING_KEY) ?? '{}') as Record<string, Pending>
    const now = Date.now()
    return Object.fromEntries(Object.entries(all).filter(([, p]) => now - p.createdAt < PENDING_TTL))
  } catch {
    return {}
  }
}
function writePending(all: Record<string, Pending>) {
  writeRaw(PENDING_KEY, Object.keys(all).length ? JSON.stringify(all) : null)
}

export const localDemoAuth: AuthService = {
  getSession: currentSession,

  signIn(email, password, area) {
    const acc = readDb().accounts.find((a) => a.email === normEmail(email))
    if (!acc) {
      // registered but not verified yet: no account exists, so no sign-in
      const p = readPending()[normEmail(email)]
      if (p && area === 'customer' && p.passwordHash === hashPassword(email, password)) return fail('unverified')
      return fail('invalid_credentials')
    }
    // same message for unknown email and wrong password
    if (acc.passwordHash !== hashPassword(email, password)) return fail('invalid_credentials')
    if (acc.role === 'customer' && !acc.emailVerifiedAt) return fail('unverified')
    if (acc.role !== area) return { ok: false, error: 'wrong_area', accountRole: acc.role }
    if (!acc.active) return fail('inactive')
    setSession(acc)
    return { ok: true, value: currentSession()! }
  },

  startRegistration(input) {
    const fields = validateRegistration(input)
    if (Object.keys(fields).length) return fail('invalid_input', fields)
    const email = normEmail(input.email)
    if (readDb().accounts.some((a) => a.email === email)) return fail('email_taken', { email: 'email' })
    // public sign-up can only ever lead to a CUSTOMER account, and only after verification
    const all = readPending()
    all[email] = { name: input.name.trim(), email, phone: input.phone.trim(), passwordHash: hashPassword(email, input.password), createdAt: Date.now() }
    writePending(all)
    return { ok: true, value: { email, name: all[email].name } }
  },

  pendingRegistration(email) {
    const p = readPending()[normEmail(email)]
    return p ? { email: p.email, name: p.name } : null
  },

  completeRegistration(email) {
    const all = readPending()
    const p = all[normEmail(email)]
    if (!p) return fail('no_pending')
    const acc = updateDb((d) => {
      if (d.accounts.some((a) => a.email === p.email)) return null
      const now = new Date().toISOString()
      const id = shortId('cu-', 8)
      const clientId = `cl-${id.slice(3)}`
      d.clients.push({ id: clientId, name: p.name, phone: p.phone, email: p.email, since: now, notes: '', preferredBarber: '', tags: ['new'], marketing: false, accountId: id })
      const account: DemoAccount = { id, role: 'customer', email: p.email, name: p.name, phone: p.phone, passwordHash: p.passwordHash, createdAt: now, active: true, clientId, emailVerifiedAt: now }
      d.accounts.push(account)
      return account
    })
    delete all[p.email]
    writePending(all)
    if (!acc) return fail('email_taken')
    setSession(acc)
    return { ok: true, value: currentSession()! }
  },

  signOut() {
    setSession(null)
  },

  requestPasswordReset(email) {
    const acc = readDb().accounts.find((a) => a.email === normEmail(email) && a.role === 'customer')
    if (!acc) {
      writeRaw(RESET_KEY, null, 'session')
      return { demoCode: null }
    }
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    const code = String(100000 + (buf[0] % 900000))
    writeRaw(RESET_KEY, JSON.stringify({ email: acc.email, code, expires: Date.now() + 15 * 60_000 }), 'session')
    return { demoCode: code }
  },

  resetPassword(email, code, password, confirm) {
    let saved: { email: string; code: string; expires: number } | null = null
    try {
      saved = JSON.parse(readRaw(RESET_KEY, 'session') ?? 'null')
    } catch {
      saved = null
    }
    if (!saved || saved.email !== normEmail(email) || saved.code !== code.trim() || saved.expires < Date.now()) return fail('invalid_code')
    if (password.length < MIN_PASSWORD) return fail('invalid_input', { password: 'password_short' })
    if (password !== confirm) return fail('invalid_input', { confirm: 'password_mismatch' })
    updateDb((d) => {
      const a = d.accounts.find((x) => x.email === saved!.email && x.role === 'customer')
      if (a) a.passwordHash = hashPassword(a.email, password)
    })
    writeRaw(RESET_KEY, null, 'session')
    return { ok: true, value: null }
  },

  changePassword(current, next, confirm) {
    const s = currentSession()
    if (!s) return fail('not_signed_in')
    const acc = readDb().accounts.find((a) => a.id === s.accountId)
    if (!acc || acc.passwordHash !== hashPassword(acc.email, current)) return fail('invalid_credentials')
    if (next.length < MIN_PASSWORD) return fail('invalid_input', { password: 'password_short' })
    if (next !== confirm) return fail('invalid_input', { confirm: 'password_mismatch' })
    updateDb((d) => {
      d.accounts.find((a) => a.id === s.accountId)!.passwordHash = hashPassword(acc.email, next)
    })
    return { ok: true, value: null }
  },

  updateProfile(patch) {
    const s = currentSession()
    if (!s) return fail('not_signed_in')
    const fields: RegisterFields = {}
    if (patch.name.trim().length < 2) fields.name = 'name'
    if (!isPhone(patch.phone)) fields.phone = 'phone'
    if (Object.keys(fields).length) return fail('invalid_input', fields)
    updateDb((d) => {
      const a = d.accounts.find((x) => x.id === s.accountId)!
      a.name = patch.name.trim()
      a.phone = patch.phone.trim()
      const c = a.clientId ? d.clients.find((x) => x.id === a.clientId) : undefined
      if (c) {
        c.name = a.name
        c.phone = a.phone
      }
    })
    return { ok: true, value: currentSession()! }
  },

  subscribe(cb) {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY || e.key === null) cb()
    }
    window.addEventListener(SESSION_EVENT, cb)
    window.addEventListener('storage', onStorage)
    const offDb = subscribeDb(cb)
    return () => {
      window.removeEventListener(SESSION_EVENT, cb)
      window.removeEventListener('storage', onStorage)
      offDb()
    }
  },
}

/** The active auth implementation. Swap here for the real provider. */
export const auth: AuthService = localDemoAuth

/** React hook: the signed-in account (any role), or null. Updates on sign-in/out in any tab. */
export function useSession(): AuthSession | null {
  return useSyncExternalStore(auth.subscribe, auth.getSession, auth.getSession)
}

/** Where each role belongs after signing in. */
export const homeFor = (role: AccountRole) => (role === 'owner' ? '/admin/owner' : role === 'barber' ? '/admin/barber' : '/account')
