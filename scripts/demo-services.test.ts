/**
 * Rule checks for the DEMO auth and booking services (no browser needed).
 * Run: npm run test:demo
 * localStorage / sessionStorage are replaced by in-memory stand-ins.
 */
class MemStorage {
  private m = new Map<string, string>()
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v))
  }
  removeItem(k: string) {
    this.m.delete(k)
  }
  clear() {
    this.m.clear()
  }
}
const target = new EventTarget()
Object.assign(globalThis, {
  window: Object.assign(globalThis, {
    localStorage: new MemStorage(),
    sessionStorage: new MemStorage(),
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
  }),
})

const { auth, hashPassword } = await import('../src/demo/auth')
const { readDb, resetDb, updateDb } = await import('../src/demo/db')
const { cancelBooking, createBooking, customerAppointments, getSlots, toKey, fromKey } = await import('../src/demo/bookings')

let pass = 0
let fail = 0
const ok = (cond: unknown, msg: string) => {
  if (cond) pass++
  else fail++
  console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`)
}

resetDb()

// ——— built-in logins ———
ok(auth.signIn('Owner@gmail.com', 'Owner112233', 'owner').ok, 'owner logs in with Owner@gmail.com / Owner112233')
ok(auth.getSession()?.role === 'owner', 'owner session has role owner')
auth.signOut()
ok(auth.getSession() === null, 'sign-out ends the session')
const b = auth.signIn('Barber@gmail.com', 'Barber@gmail.com', 'barber')
ok(b.ok && b.value.barberId === 'idris', 'barber logs in with Barber@gmail.com and is Idris')
auth.signOut()
ok(!auth.signIn('Owner@gmail.com', 'wrong-password', 'owner').ok, 'wrong password is refused')
const wa = auth.signIn('Barber@gmail.com', 'Barber@gmail.com', 'owner')
ok(!wa.ok && wa.error === 'wrong_area', 'barber credentials do not open the owner login')
ok(!auth.signIn('Owner@gmail.com', 'Owner112233', 'customer').ok, 'owner credentials do not open the customer login')
ok(auth.getSession() === null, 'a refused login leaves nobody signed in')

// ——— staff entrance (/staff-login): role from the stored account ———
const so = auth.signInStaff('Owner@gmail.com', 'Owner112233')
ok(so.ok && so.value.role === 'owner', 'staff sign-in: owner account → owner session')
auth.signOut()
const sb = auth.signInStaff('Barber@gmail.com', 'Barber@gmail.com')
ok(sb.ok && sb.value.role === 'barber' && !!sb.value.barberId, 'staff sign-in: barber account → barber session with its own profile')
auth.signOut()
const sw = auth.signInStaff('Barber@gmail.com', 'wrong-password')
ok(!sw.ok && sw.error === 'invalid_credentials' && auth.getSession() === null, 'staff sign-in: wrong password → invalid, no session')

// ——— registration ———
const bad = auth.startRegistration({ name: 'A', email: 'nope', phone: '12', password: 'short', confirm: 'other' })
ok(!bad.ok && bad.fields?.name && bad.fields.email && bad.fields.phone && bad.fields.password && bad.fields.confirm, 'registration validates every field')
const mism = auth.startRegistration({ name: 'Ana Test', email: 'ana@example.com', phone: '+31 6 1111 2222', password: 'password123', confirm: 'password124' })
ok(!mism.ok && mism.fields?.confirm === 'password_mismatch', 'password confirmation must match')
const pend = auth.startRegistration({ name: 'Ana Test', email: 'Ana@Example.com', phone: '+31 6 1111 2222', password: 'password123', confirm: 'password123' })
ok(pend.ok && !readDb().accounts.some((a) => a.email === 'ana@example.com'), 'sign-up only creates a PENDING registration, no account yet')
ok(auth.getSession() === null, 'no session before the email is verified')
const unv = auth.signIn('ana@example.com', 'password123', 'customer')
ok(!unv.ok && unv.error === 'unverified', 'an unverified customer cannot sign in')
ok(!JSON.stringify(window.localStorage.getItem('noir.demo.pending')).includes('password123'), 'the pending registration keeps only a password digest')
const ana = auth.completeRegistration('ana@example.com')
ok(ana.ok && ana.value.role === 'customer', 'after verification the CUSTOMER account is created and signed in')
ok(!!readDb().accounts.find((a) => a.email === 'ana@example.com')?.emailVerifiedAt, 'the account is marked as email-verified')
ok(!auth.completeRegistration('nobody@example.com').ok, 'no account without a pending registration')
ok(readDb().accounts.find((a) => a.email === 'ana@example.com')?.passwordHash === hashPassword('ana@example.com', 'password123'), 'password is stored as a digest, not plain text')
auth.signOut()
const dup = auth.startRegistration({ name: 'Ana Two', email: 'ana@example.com', phone: '+31 6 1111 3333', password: 'password123', confirm: 'password123' })
ok(!dup.ok && dup.error === 'email_taken', 'duplicate email is refused')
const dupOwner = auth.startRegistration({ name: 'Fake Owner', email: 'owner@gmail.com', phone: '+31 6 1111 4444', password: 'password123', confirm: 'password123' })
ok(!dupOwner.ok, 'nobody can register over the owner email')
ok(readDb().accounts.find((a) => a.email === 'owner@gmail.com')?.role === 'owner', 'built-in owner account is untouched')
// the register input has no role field at all; extra properties are ignored
auth.startRegistration({ name: 'Sneaky', email: 'sneaky@example.com', phone: '+31 6 1111 5555', password: 'password123', confirm: 'password123', role: 'owner' } as never)
const sneaky = auth.completeRegistration('sneaky@example.com')
ok(sneaky.ok && sneaky.value.role === 'customer', 'a "role" sent with sign-up is ignored: always customer')
auth.signOut()

const sc = auth.signInStaff('ana@example.com', 'password123')
ok(!sc.ok && sc.error === 'not_staff' && auth.getSession() === null, 'staff sign-in: a CUSTOMER account → "no staff access", no session created')
auth.startRegistration({ name: 'Pending Person', email: 'pending@example.com', phone: '+31 6 1111 6666', password: 'password123', confirm: 'password123' })
ok(auth.signInStaff('pending@example.com', 'password123').ok === false && auth.getSession() === null, 'staff sign-in: an unverified customer registration → refused')

// ——— booking ———
const d0 = readDb()
// a day 3+ days ahead on which Idris works, and a free slot
let day = ''
let time = ''
for (let i = 3; i < 20 && !time; i++) {
  const dt = new Date()
  dt.setDate(dt.getDate() + i)
  const free = getSlots(d0, 'idris', dt, 45).find((s) => s.available)
  if (free) {
    day = toKey(dt)
    time = free.time
  }
}
ok(!!time, `found a free slot for Idris (${day} ${time})`)
ok(!createBooking(null, { barberId: 'idris', serviceId: 'skin-fade', date: day, time, note: '' }).ok, 'booking without signing in is refused')
const ownerS = (auth.signIn('Owner@gmail.com', 'Owner112233', 'owner'), auth.getSession())
const asOwner = createBooking(ownerS, { barberId: 'idris', serviceId: 'skin-fade', date: day, time, note: '' })
ok(!asOwner.ok && asOwner.error === 'not_customer', 'staff accounts cannot book as customers')
auth.signOut()

auth.signIn('ana@example.com', 'password123', 'customer')
const anaS = auth.getSession()
const first = createBooking(anaS, { barberId: 'idris', serviceId: 'skin-fade', date: day, time, note: 'Short on top' })
ok(first.ok && /^NB-[A-Z0-9]{6}$/.test(first.ok ? first.appointment.ref! : ''), 'customer books and gets a reference')
const again = createBooking(anaS, { barberId: 'idris', serviceId: 'skin-fade', date: day, time, note: '' })
ok(!again.ok && again.error === 'slot_taken', 'the same slot cannot be booked twice')
ok(getSlots(readDb(), 'idris', fromKey(day), 45).find((s) => s.time === time)?.available === false, 'the booked time shows as taken')
auth.signOut()

auth.signIn('sneaky@example.com', 'password123', 'customer')
const otherS = auth.getSession()
const clash = createBooking(otherS, { barberId: 'idris', serviceId: 'signature-cut', date: day, time, note: '' })
ok(!clash.ok && clash.error === 'slot_taken', 'a second customer cannot book the same barber at the same time')
// overlapping start (15 min later) is also refused
const [hh, mm] = time.split(':').map(Number)
const overlap = `${String(hh + Math.floor((mm + 15) / 60)).padStart(2, '0')}:${String((mm + 15) % 60).padStart(2, '0')}`
const ov = createBooking(otherS, { barberId: 'idris', serviceId: 'buzz-cut', date: day, time: overlap, note: '' })
ok(!ov.ok && ov.error === 'slot_taken', 'an overlapping time with the same barber is refused')
ok(customerAppointments(readDb(), otherS).length === 0, 'customer B cannot see customer A’s appointments')
const anaAppt = first.ok ? first.appointment.id : ''
const steal = cancelBooking(otherS, anaAppt)
ok(!steal.ok && steal.error === 'forbidden', 'customer B cannot cancel customer A’s appointment')
auth.signOut()

// an account without a verified email cannot book (e.g. older demo data)
updateDb((d) => {
  delete d.accounts.find((a) => a.email === 'sneaky@example.com')!.emailVerifiedAt
})
const unverifiedBook = createBooking(otherS, { barberId: 'lucas', serviceId: 'skin-fade', date: day, time, note: '' })
ok(!unverifiedBook.ok && unverifiedBook.error === 'unverified', 'a customer without a verified email cannot book')
ok(!auth.signIn('sneaky@example.com', 'password123', 'customer').ok, 'an unverified account cannot sign in')
updateDb((d) => {
  d.accounts.find((a) => a.email === 'sneaky@example.com')!.emailVerifiedAt = new Date().toISOString()
})

// ——— visibility to staff ———
ok(readDb().appointments.some((a) => a.id === anaAppt && a.barberId === 'idris' && a.status === 'booked'), 'the booking is in the shared data (owner + Idris see it)')

// ——— cancellation rules ———
auth.signIn('ana@example.com', 'password123', 'customer')
ok(cancelBooking(auth.getSession(), anaAppt).ok, 'customer cancels own appointment (more than 24h ahead)')
ok(readDb().appointments.find((a) => a.id === anaAppt)?.status === 'cancelled', 'status is now cancelled')
// a booking within 24h cannot be cancelled online
const soonId = updateDb((d) => {
  const s = auth.getSession()!
  const start = new Date(Date.now() + 5 * 3600_000)
  d.appointments.push({ id: 'ab-soon', ref: 'NB-SOON00', clientId: s.clientId!, barberId: 'lucas', serviceId: 'skin-fade', start: start.toISOString(), duration: 45, price: 48, status: 'booked', source: 'online' })
  return 'ab-soon'
})
const late = cancelBooking(auth.getSession(), soonId)
ok(!late.ok && late.error === 'too_late', 'cancelling within 24 hours is refused online')
auth.signOut()

// ——— deactivated account ———
updateDb((d) => {
  d.accounts.find((a) => a.email === 'sneaky@example.com')!.active = false
})
const off = auth.signIn('sneaky@example.com', 'password123', 'customer')
ok(!off.ok && off.error === 'inactive', 'a deactivated account cannot sign in')

// ——— barber status rules (booking rules on top of the allowed transitions) ———
const { barberOptions, barberStatusCheck } = await import('../src/admin/data/store')
const base = { id: 'x', clientId: 'c', barberId: 'idris', serviceId: 'skin-fade', duration: 45, price: 48, source: 'online' as const }
const future = { ...base, status: 'booked' as const, start: new Date(Date.now() + 48 * 3600_000).toISOString() }
const started = { ...base, status: 'confirmed' as const, start: new Date(Date.now() - 10 * 60_000).toISOString() }
ok(barberOptions(future).includes('confirmed') && barberOptions(future).includes('cancelled'), 'barber can confirm or cancel a future appointment')
ok(!barberOptions(future).includes('completed'), 'barber cannot complete an appointment that has not started')
ok(barberOptions(started).includes('completed') && !barberOptions(started).includes('cancelled'), 'once started: barber can complete, no longer cancel')
ok(barberOptions({ ...base, status: 'completed', start: started.start }).length === 0, 'a completed appointment is final for the barber')
// the reported bug: started early (in the chair before the booked time) → Done must be allowed
const early = { ...base, status: 'in_chair' as const, start: new Date(Date.now() + 20 * 60_000).toISOString() }
ok(barberStatusCheck(early, 'completed', 'idris') === null, 'Done on an appointment started EARLY is allowed (the reported bug)')
ok(barberStatusCheck({ ...early, status: 'confirmed' }, 'completed', 'idris') === 'not_started', 'completing without starting waits for the booked time (specific reason)')
ok(barberStatusCheck({ ...early, status: 'arrived' }, 'in_chair', 'idris') === null, 'Start on the same day before the booked time is allowed')
ok(barberStatusCheck(early, 'completed', 'lucas') === 'not_yours', 'another barber cannot complete it (not_yours)')
ok(barberStatusCheck(early, 'completed', undefined) === 'not_yours', 'no barber identity → refused')
ok(barberStatusCheck(started, 'cancelled', 'idris') === 'cancel_after_start', 'cancel after start → specific reason')
ok(barberStatusCheck({ ...future }, 'arrived', 'idris') === 'not_today', 'arrival two days early → specific reason')

// ——— reset ———
resetDb()
ok(!readDb().accounts.some((a) => a.role === 'customer'), 'reset removes demo customers')
ok(auth.signIn('Owner@gmail.com', 'Owner112233', 'owner').ok, 'built-in owner login still works after reset')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
