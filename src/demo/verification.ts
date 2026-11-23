/**
 * Email verification client. The code is created, emailed and checked by
 * the server functions (netlify/functions/verification-*); the browser
 * never sees or stores it. Only after the server confirms the code is the
 * pending registration turned into a customer account.
 */
import { auth, type AuthResult } from './auth'

export type SendError = 'invalid_email' | 'rate_limited' | 'cooldown' | 'email_not_configured' | 'email_send_failed' | 'service_unavailable'
export type SendOutcome = { ok: true; expiresAt: number; resendAvailableAt: number } | { ok: false; error: SendError; retryAt?: number }
export type VerifyError = 'invalid_email' | 'no_code' | 'expired' | 'too_many_attempts' | 'invalid_code' | 'email_not_configured' | 'service_unavailable' | 'no_pending'
export type VerifyOutcome = { ok: true } | { ok: false; error: VerifyError; attemptsLeft?: number }

async function post<T>(path: string, body: unknown): Promise<T | { ok: false; error: 'service_unavailable' }> {
  try {
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const type = res.headers.get('content-type') ?? ''
    // no function behind the URL (static hosting, offline): say so, never pretend it worked
    if (!type.includes('application/json')) return { ok: false, error: 'service_unavailable' }
    return (await res.json()) as T
  } catch {
    return { ok: false, error: 'service_unavailable' }
  }
}

/** Ask the server to email a new code (any earlier code stops working). */
export function sendVerificationCode(email: string, name: string, locale: string) {
  return post<SendOutcome>('/api/verification/send', { email, name, locale }) as Promise<SendOutcome>
}

/** Check the code on the server; on success create the customer account and sign in. */
export async function verifyAndActivate(email: string, code: string): Promise<VerifyOutcome> {
  if (!auth.pendingRegistration(email)) return { ok: false, error: 'no_pending' }
  const r = (await post<VerifyOutcome>('/api/verification/verify', { email, code })) as VerifyOutcome
  if (!r.ok) return r
  const done: AuthResult = auth.completeRegistration(email)
  return done.ok ? { ok: true } : { ok: false, error: 'no_pending' }
}
