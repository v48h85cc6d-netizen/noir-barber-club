/**
 * Server-side checks for customer email verification (no network needed).
 * Email sending is replaced by a recording test double here; real delivery
 * is tested separately with a real provider key.
 * Run: npm run test:verification
 */
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { checkCode, sendCode, MAX_ATTEMPTS, type CodeRecord, type Deps, type KV } from '../netlify/lib/verification'
import { classifyResend, MailError, mailerFromEnv, sender, type MailMessage } from '../netlify/lib/mailer'

let pass = 0
let fail = 0
const ok = (cond: unknown, msg: string) => {
  if (cond) pass++
  else fail++
  console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`)
}

const mem = new Map<string, unknown>()
const store: KV = { get: async <T,>(k: string) => (mem.get(k) as T) ?? null, set: async (k, v) => void mem.set(k, structuredClone(v)), delete: async (k) => void mem.delete(k) }
const outbox: MailMessage[] = []
let clock = Date.parse('2026-11-23T10:00:00Z')
const deps: Deps = { store, secret: 'test-secret-'.padEnd(40, 'x'), now: () => clock, mailer: { send: async (m) => (outbox.push(m), { id: String(outbox.length) }) } }
const lastCode = () => outbox.at(-1)!.text.match(/\b(\d{6})\b/)![1]
const EMAIL = 'new.customer@example.com'

// ——— sending ———
let r = await sendCode(deps, { email: 'not-an-email' })
ok(!r.ok && r.error === 'invalid_email' && outbox.length === 0, 'invalid email: nothing sent')
r = await sendCode(deps, { email: EMAIL, name: 'New Customer', locale: 'en' })
ok(r.ok && outbox.length === 1 && outbox[0].to === EMAIL, 'a code is emailed to the registered address')
const code1 = lastCode()
ok(/^\d{6}$/.test(code1), `the code has 6 digits (${code1.replace(/\d/g, '•')})`)
ok(outbox[0].subject === 'Your NOIR BARBER CLUB verification code', 'subject: Your NOIR BARBER CLUB verification code')
ok(outbox[0].text.includes('Welcome to NOIR BARBER CLUB.') && outbox[0].text.includes('This code expires after 10 minutes.') && outbox[0].text.includes('If you did not request this verification'), 'email body follows the requested wording')
ok(r.ok && r.expiresAt - clock === 600_000, 'code expires after 10 minutes')
const stored = [...mem.values()].find((v) => (v as CodeRecord).mac) as CodeRecord
ok(stored && !JSON.stringify(stored).includes(code1), 'the server stores only a keyed hash, never the code itself')
ok(!('code' in (r as object)), 'the code is never returned to the browser')
const de = await sendCode({ ...deps, now: () => clock }, { email: 'de@example.com', locale: 'de' })
ok(de.ok && outbox.at(-1)!.subject.startsWith('Dein Bestätigungscode'), 'German email for a German visitor')

// ——— checking ———
let c = await checkCode(deps, { email: EMAIL, code: code1 === '000000' ? '111111' : '000000' })
ok(!c.ok && c.error === 'invalid_code' && c.attemptsLeft === MAX_ATTEMPTS - 1, 'a wrong code is rejected (attempts left shown)')
c = await checkCode(deps, { email: EMAIL, code: 'abc' })
ok(!c.ok && c.error === 'invalid_code', 'a malformed code is rejected')

// resend: cooldown, then a new code replaces the old one
r = await sendCode(deps, { email: EMAIL })
ok(!r.ok && r.error === 'cooldown', 'resend within 60 s is refused (cooldown)')
clock += 61_000
r = await sendCode(deps, { email: EMAIL })
const code2 = lastCode()
ok(r.ok && code2 !== code1, 'resend issues a new code')
c = await checkCode(deps, { email: EMAIL, code: code1 })
ok(!c.ok && c.error === 'invalid_code', 'the old code no longer works after a new one is issued')
c = await checkCode(deps, { email: EMAIL, code: code2 })
ok(c.ok && c.email === EMAIL, 'the latest code verifies the email')
c = await checkCode(deps, { email: EMAIL, code: code2 })
ok(!c.ok && c.error === 'no_code', 'a code works only once')

// expiry
const EXP = 'expiry@example.com'
await sendCode(deps, { email: EXP })
const codeE = lastCode()
clock += 10 * 60_000 + 1000
c = await checkCode(deps, { email: EXP, code: codeE })
ok(!c.ok && c.error === 'expired', 'an expired code (after 10 min) is rejected')

// attempt limit
const LIM = 'limit@example.com'
await sendCode(deps, { email: LIM })
const codeL = lastCode()
const wrong = codeL === '123456' ? '654321' : '123456'
for (let i = 0; i < MAX_ATTEMPTS - 1; i++) await checkCode(deps, { email: LIM, code: wrong })
c = await checkCode(deps, { email: LIM, code: wrong })
ok(!c.ok && c.error === 'too_many_attempts', `after ${MAX_ATTEMPTS} wrong attempts the code is locked`)
c = await checkCode(deps, { email: LIM, code: codeL })
ok(!c.ok && c.error === 'too_many_attempts', 'even the right code is refused once locked (a new code is needed)')

// hourly send limit
const SPAM = 'spam@example.com'
let sent = 0
for (let i = 0; i < 8; i++) {
  clock += 61_000
  if ((await sendCode(deps, { email: SPAM })).ok) sent++
}
ok(sent === 5, `at most 5 codes per email per hour (${sent} sent of 8 requests)`)

// failure to send is reported, nothing stored
const failing: Deps = { ...deps, mailer: { send: async () => Promise.reject(new MailError('not_configured', 'no key', { name: 'resend', missing: ['RESEND_API_KEY'] })) } }
r = await sendCode(failing, { email: 'nobody@example.com' })
ok(!r.ok && r.error === 'email_not_configured', 'missing email configuration is reported, not hidden')
c = await checkCode(deps, { email: 'nobody@example.com', code: '123456' })
ok(!c.ok && c.error === 'no_code', 'when sending fails no code exists')

// ——— provider error causes ———
ok(classifyResend(403, 'validation_error', 'The veltri-x-agency.com domain is not verified.') === 'sender', 'Resend 403 “domain not verified” → sender problem')
ok(classifyResend(403, 'validation_error', 'You can only send testing emails to your own email address') === 'sender', 'Resend testing restriction → sender problem')
ok(classifyResend(422, 'validation_error', 'Invalid `to` field.') === 'invalid_recipient', 'Resend 422 invalid `to` → invalid recipient')
ok(classifyResend(429, 'rate_limit_exceeded') === 'rate_limited' && classifyResend(429, 'daily_quota_exceeded') === 'rate_limited', 'Resend 429 / quota → rate limited')
ok(classifyResend(401, 'restricted_api_key') === 'auth', 'Resend 401 / restricted key → key problem')
ok(classifyResend(503) === 'unavailable', 'Resend 5xx → provider unavailable')
const badTo: Deps = { ...deps, mailer: { send: async () => Promise.reject(new MailError('invalid_recipient', 'Resend 422', { name: 'resend', status: 422 })) } }
r = await sendCode(badTo, { email: 'typo@exmaple.con' })
ok(!r.ok && r.error === 'invalid_email', 'provider-rejected recipient is shown as an invalid address, nothing stored')

// ——— logs never contain the code, the full address or a key ———
const logged: string[] = []
const orig = { log: console.log, warn: console.warn, error: console.error }
console.log = console.warn = console.error = (...a: unknown[]) => void logged.push(a.map(String).join(' '))
clock += 3_600_000
const LOGME = 'privacy.check@example.com'
await sendCode({ ...deps, ref: 'testref' }, { email: LOGME })
const codeP = lastCode()
await checkCode({ ...deps, ref: 'testref' }, { email: LOGME, code: codeP === '000000' ? '111111' : '000000' })
await checkCode({ ...deps, ref: 'testref' }, { email: LOGME, code: codeP })
await sendCode({ ...deps, ref: 'testref', mailer: { send: async () => Promise.reject(new MailError('sender', 'Resend 403', { name: 'resend', status: 403, errorName: 'validation_error', message: 'Cannot send to privacy.check@example.com with key re_abcdefghijklmnop code 123456' })) } }, { email: 'other.person@example.com' })
Object.assign(console, orig)
const all = logged.join('\n')
ok(logged.length >= 4 && all.includes('verification.send.accepted') && all.includes('verification.check.invalid_code') && all.includes('verification.check.verified') && all.includes('verification.send.failed'), `structured log lines for each step (${logged.length})`)
ok(all.includes('"providerStatus":403') && all.includes('"cause":"sender"') && all.includes('"recipientDomain":"example.com"') && all.includes('"ref":"testref"'), 'failure log has cause, provider status, recipient domain and request ref')
ok(!all.includes(codeP) && !all.includes('123456') && !all.includes(LOGME) && !all.includes('re_abcdefghijklmnop') && !all.includes(deps.secret), 'logs contain no code, no full email address, no key, no secret')

// ——— sender + provider request (local capture server, no real email) ———
ok(sender().address === 'projects@veltri-x-agency.com' && sender().name === 'NOIR BARBER CLUB', 'sender is NOIR BARBER CLUB <projects@veltri-x-agency.com>')
delete process.env.RESEND_API_KEY
delete process.env.SMTP_HOST
await mailerFromEnv()
  .send({ to: 'a@example.com', subject: 's', text: 't', html: 'h' })
  .then(() => ok(false, 'unconfigured mailer must not report success'))
  .catch((e) => ok(e.code === 'not_configured', 'without RESEND_API_KEY / SMTP_* the mailer refuses (no fake success)'))
let captured: { auth?: string; body?: Record<string, unknown> } = {}
const srv = createServer((req, res) => {
  let raw = ''
  req.on('data', (d) => (raw += d))
  req.on('end', () => {
    captured = { auth: req.headers.authorization, body: JSON.parse(raw) }
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ id: 'test-id' }))
  })
}).listen(0)
await new Promise((r2) => srv.once('listening', r2))
process.env.RESEND_API_KEY = 're_test_dummy'
process.env.RESEND_API_URL = `http://127.0.0.1:${(srv.address() as AddressInfo).port}/emails`
const res = await mailerFromEnv().send({ to: 'a@example.com', subject: 'Subject', text: 'Text', html: '<p>Html</p>' })
ok(res.id === 'test-id' && captured.body?.from === 'NOIR BARBER CLUB <projects@veltri-x-agency.com>' && captured.auth === 'Bearer re_test_dummy', 'Resend request: correct From header, key only in the server-side Authorization header')
srv.close()

// one retry on a provider outage, none on a real rejection
let calls = 0
const flaky = createServer((req, res) => {
  req.resume()
  req.on('end', () => {
    calls++
    if (calls === 1) res.writeHead(503, { 'Content-Type': 'application/json' }).end(JSON.stringify({ name: 'internal_server_error', message: 'busy' }))
    else if (calls === 2) res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ id: 'after-retry' }))
    else res.writeHead(422, { 'Content-Type': 'application/json' }).end(JSON.stringify({ name: 'validation_error', message: 'Invalid `to` field.' }))
  })
}).listen(0)
await new Promise((r2) => flaky.once('listening', r2))
process.env.RESEND_API_URL = `http://127.0.0.1:${(flaky.address() as AddressInfo).port}/emails`
const retried = await mailerFromEnv().send({ to: 'a@example.com', subject: 's', text: 't', html: 'h' })
ok(retried.id === 'after-retry' && calls === 2, 'a provider outage (503) is retried once and then succeeds')
const before422 = calls
await mailerFromEnv().send({ to: 'bad', subject: 's', text: 't', html: 'h' }).catch((e) => ok(e instanceof MailError && e.code === 'invalid_recipient' && calls === before422 + 1, 'an invalid recipient (422) is not retried and is classified'))
flaky.close()

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
