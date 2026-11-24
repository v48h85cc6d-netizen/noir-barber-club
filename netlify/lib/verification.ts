/**
 * Customer email verification — SERVER SIDE ONLY.
 *
 * The 6-digit code is generated here, emailed, and stored only as an HMAC
 * (keyed with VERIFICATION_SECRET), never in plain text and never returned
 * to the browser. Short-lived state (10 min) lives in a key-value store so
 * that a new code replaces the old one and wrong attempts can be counted.
 */
import { createHash, createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import { renderVerificationEmail, type Locale } from './email-template'
import { MailError, type Mailer } from './mailer'
import { log, recipientTag, scrub } from './log'

export interface CodeRecord {
  mac: string
  issuedAt: number
  expiresAt: number
  attempts: number
  /** timestamps of codes sent in the last hour (rate limit) */
  sends: number[]
}

export interface KV {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  delete(key: string): Promise<void>
}

export interface Deps {
  store: KV
  mailer: Mailer
  secret: string
  now?: () => number
  /** seconds; 600 (10 minutes) unless overridden for tests */
  ttl?: number
  /** request reference for the logs */
  ref?: string
}

export const MAX_ATTEMPTS = 5
export const RESEND_COOLDOWN_MS = 60_000
export const MAX_SENDS_PER_HOUR = 5
/** per sender IP; VERIFICATION_MAX_SENDS_PER_IP can raise it (e.g. for local test runs) */
export const MAX_SENDS_PER_IP_PER_HOUR = Number(process.env.VERIFICATION_MAX_SENDS_PER_IP) > 0 ? Number(process.env.VERIFICATION_MAX_SENDS_PER_IP) : 20

export const normEmail = (e: string) => e.trim().toLowerCase()
export const isEmail = (e: string) => e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim())
const sha = (s: string) => createHash('sha256').update(s).digest('hex')
const keyFor = (email: string) => `code:${sha(normEmail(email))}`
const ipKey = (ip: string) => `ip:${sha(ip)}`
const mac = (secret: string, email: string, code: string, issuedAt: number) => createHmac('sha256', secret).update(`${normEmail(email)}:${code}:${issuedAt}`).digest('hex')

export type SendResult =
  /** messageId: the email provider's id for the sent message (not secret; used to trace delivery) */
  | { ok: true; expiresAt: number; resendAvailableAt: number; messageId: string }
  | { ok: false; error: 'invalid_email' | 'rate_limited' | 'cooldown' | 'email_not_configured' | 'email_send_failed'; retryAt?: number }

export async function sendCode(deps: Deps, input: { email: string; name?: string; locale?: string; ip?: string }): Promise<SendResult> {
  const now = (deps.now ?? Date.now)()
  const ttl = (deps.ttl ?? 600) * 1000
  const who = { ref: deps.ref, ...recipientTag(input.email) }
  if (!isEmail(input.email)) {
    log('warn', 'verification.send.invalid_email', who)
    return { ok: false, error: 'invalid_email' }
  }
  const email = normEmail(input.email)

  const prev = await deps.store.get<CodeRecord>(keyFor(email))
  const recent = (prev?.sends ?? []).filter((t) => now - t < 3_600_000)
  if (prev && now - prev.issuedAt < RESEND_COOLDOWN_MS) {
    log('info', 'verification.send.cooldown', who)
    return { ok: false, error: 'cooldown', retryAt: prev.issuedAt + RESEND_COOLDOWN_MS }
  }
  if (recent.length >= MAX_SENDS_PER_HOUR) {
    log('warn', 'verification.send.rate_limited', { ...who, limit: 'per_email', sendsLastHour: recent.length })
    return { ok: false, error: 'rate_limited', retryAt: recent[0] + 3_600_000 }
  }
  if (input.ip) {
    const ipSends = ((await deps.store.get<number[]>(ipKey(input.ip))) ?? []).filter((t) => now - t < 3_600_000)
    if (ipSends.length >= MAX_SENDS_PER_IP_PER_HOUR) {
      log('warn', 'verification.send.rate_limited', { ...who, limit: 'per_ip', sendsLastHour: ipSends.length })
      return { ok: false, error: 'rate_limited', retryAt: ipSends[0] + 3_600_000 }
    }
    await deps.store.set(ipKey(input.ip), [...ipSends, now])
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const locale: Locale = input.locale === 'de' || input.locale === 'sq' ? input.locale : 'en'
  const mail = renderVerificationEmail({ code, locale, name: input.name?.slice(0, 80), minutes: Math.round(ttl / 60_000) })
  let messageId = ''
  try {
    messageId = (await deps.mailer.send({ to: email, ...mail })).id
    log('info', 'verification.send.accepted', { ...who, messageId, locale })
  } catch (e) {
    // nothing is stored: the previous code (if any) stays as it was, no account exists
    const err = e instanceof MailError ? e : new MailError('rejected', 'unexpected', { name: 'unknown', message: String((e as Error)?.message ?? e) })
    log('error', 'verification.send.failed', {
      ...who,
      cause: err.code,
      provider: err.provider.name,
      providerStatus: err.provider.status,
      providerError: err.provider.errorName,
      providerMessage: err.provider.message ? scrub(err.provider.message) : undefined,
      missingSettings: err.provider.missing,
    })
    const error = err.code === 'not_configured' ? 'email_not_configured' : err.code === 'invalid_recipient' ? 'invalid_email' : err.code === 'rate_limited' ? 'rate_limited' : 'email_send_failed'
    return { ok: false, error }
  }

  // the new code replaces any earlier one, which becomes invalid
  const rec: CodeRecord = { mac: mac(deps.secret, email, code, now), issuedAt: now, expiresAt: now + ttl, attempts: 0, sends: [...recent, now] }
  await deps.store.set(keyFor(email), rec)
  return { ok: true, expiresAt: rec.expiresAt, resendAvailableAt: now + RESEND_COOLDOWN_MS, messageId }
}

export type CheckResult =
  | { ok: true; email: string; verifiedAt: number }
  | { ok: false; error: 'invalid_email' | 'no_code' | 'expired' | 'too_many_attempts' | 'invalid_code'; attemptsLeft?: number }

export async function checkCode(deps: Deps, input: { email: string; code: string }): Promise<CheckResult> {
  const now = (deps.now ?? Date.now)()
  const who = { ref: deps.ref, ...recipientTag(input.email) }
  if (!isEmail(input.email)) return { ok: false, error: 'invalid_email' }
  const email = normEmail(input.email)
  const key = keyFor(email)
  const rec = await deps.store.get<CodeRecord>(key)
  const fail = (error: 'no_code' | 'expired' | 'too_many_attempts' | 'invalid_code', extra: Record<string, unknown> = {}) => {
    log('info', `verification.check.${error}`, { ...who, ...extra })
    return { ok: false as const, error, ...extra }
  }
  if (!rec || !rec.mac) return fail('no_code')
  if (now > rec.expiresAt) return fail('expired')
  if (rec.attempts >= MAX_ATTEMPTS) return fail('too_many_attempts')

  const code = String(input.code ?? '').trim()
  const expected = Buffer.from(rec.mac, 'hex')
  const given = Buffer.from(mac(deps.secret, email, /^\d{6}$/.test(code) ? code : 'x', rec.issuedAt), 'hex')
  if (!/^\d{6}$/.test(code) || !timingSafeEqual(expected, given)) {
    const attempts = rec.attempts + 1
    await deps.store.set(key, { ...rec, attempts })
    return attempts >= MAX_ATTEMPTS ? fail('too_many_attempts') : fail('invalid_code', { attemptsLeft: MAX_ATTEMPTS - attempts })
  }
  // one use only: keep the send history for rate limiting, drop the code
  await deps.store.set(key, { ...rec, mac: '', expiresAt: 0, attempts: MAX_ATTEMPTS })
  log('info', 'verification.check.verified', who)
  return { ok: true, email, verifiedAt: now }
}
