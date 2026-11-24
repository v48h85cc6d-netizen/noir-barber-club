/**
 * Appointment status authorization for EVERY barber account (no individual
 * barber special-cased). Uses the shared authorizeStatusChange() the store
 * uses. Run: npm run test:permissions
 */
import { createDemoData } from '../src/admin/data/seed'
import { authorizeStatusChange } from '../src/admin/data/store'
import type { DemoData } from '../src/admin/data/types'

let pass = 0
let fail = 0
const ok = (cond: unknown, msg: string) => {
  if (cond) pass++
  else fail++
  console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`)
}

const now = new Date('2026-11-24T09:40:00')
const d: DemoData = createDemoData(now)

// give every existing barber profile a login (what the owner does with “Create login”) …
for (const b of d.barbers) {
  if (d.accounts.some((a) => a.barberId === b.id)) continue
  d.accounts.push({ id: `u-${b.id}`, role: 'barber', email: `${b.id}@example.com`, name: b.name, phone: b.phone, passwordHash: 'x', createdAt: now.toISOString(), active: true, barberId: b.id })
}
// … and add a NEW barber with a login, created the same way as “Create barber account”
d.barbers.push({ ...d.barbers[1], id: 'nora', name: 'Nora Vale', image: '', timeOff: [] })
d.accounts.push({ id: 'u-nora', role: 'barber', email: 'nora@example.com', name: 'Nora Vale', phone: '+31 6 0000 9999', passwordHash: 'x', createdAt: now.toISOString(), active: true, barberId: 'nora' })

// one appointment per barber, in the chair (Done allowed), started 5 minutes ago
const barberAccounts = d.accounts.filter((a) => a.role === 'barber')
const apptOf: Record<string, string> = {}
for (const acc of barberAccounts) {
  const id = `perm-${acc.barberId}`
  d.appointments.push({ id, clientId: d.clients[0].id, barberId: acc.barberId!, serviceId: 'skin-fade', start: new Date(now.getTime() - 5 * 60_000).toISOString(), duration: 45, price: 48, status: 'in_chair', source: 'online' })
  apptOf[acc.barberId!] = id
}
const sessionOf = (accId: string) => {
  const a = d.accounts.find((x) => x.id === accId)!
  return { userId: a.id, role: a.role as 'owner' | 'barber' }
}

console.log(`barber accounts under test: ${barberAccounts.map((a) => `${a.name} (${a.barberId})`).join(', ')}`)
for (const acc of barberAccounts) {
  const s = sessionOf(acc.id)
  const own = authorizeStatusChange(d, s, apptOf[acc.barberId!], 'completed', now)
  ok(own.ok, `${acc.name}: completes own appointment → allowed`)
  for (const other of barberAccounts.filter((x) => x.id !== acc.id)) {
    const r = authorizeStatusChange(d, s, apptOf[other.barberId!], 'completed', now)
    ok(!r.ok && r.reason === 'forbidden' && r.detail === 'not_yours', `${acc.name}: completing ${other.name}'s appointment → rejected (not_yours)`)
  }
}

// owner: every barber's appointment
const owner = d.accounts.find((a) => a.role === 'owner')!
for (const acc of barberAccounts) ok(authorizeStatusChange(d, sessionOf(owner.id), apptOf[acc.barberId!], 'completed', now).ok, `owner: completes ${acc.name}'s appointment → allowed`)
ok(authorizeStatusChange(d, sessionOf(owner.id), apptOf['nora'], 'cancelled', now).ok, 'owner: may correct any status (unchanged owner rights)')

// identity is resolved from the data, not trusted from the session
const lucas = barberAccounts.find((a) => a.barberId === 'lucas')!
ok(!authorizeStatusChange(d, { userId: lucas.id, role: 'owner' }, apptOf['idris'], 'completed', now).ok, 'a barber session claiming the owner role is rejected')
ok(!authorizeStatusChange(d, { userId: 'u-nobody', role: 'barber' }, apptOf['lucas'], 'completed', now).ok, 'an unknown account is rejected')
lucas.active = false
ok(!authorizeStatusChange(d, sessionOf(lucas.id), apptOf['lucas'], 'completed', now).ok, 'a deactivated barber account is rejected, even on its own appointment')
lucas.active = true
const nora = d.accounts.find((a) => a.id === 'u-nora')!
nora.barberId = 'deleted-profile'
const orphan = authorizeStatusChange(d, sessionOf(nora.id), apptOf['nora'], 'completed', now)
ok(!orphan.ok && orphan.detail === 'no_profile', 'an account whose barber profile is missing is rejected (no_profile)')
nora.barberId = 'nora'
ok(authorizeStatusChange(d, sessionOf(nora.id), apptOf['nora'], 'completed', now).ok, 'relinked: the new barber completes own appointment again')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
