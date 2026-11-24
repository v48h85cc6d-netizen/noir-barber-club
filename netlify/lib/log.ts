/**
 * Structured, secret-free logging for the verification functions.
 * One JSON line per event, visible in Netlify → Logs → Functions.
 * NEVER log: API keys, VERIFICATION_SECRET, verification codes, passwords
 * or full email addresses (only the domain and a short hash).
 */
import { createHash, randomUUID } from 'node:crypto'

export const newRef = () => randomUUID().replace(/-/g, '').slice(0, 10)

/** "gmail.com · 3f2a9c1b7e0d" — enough to match a customer report, not enough to read the address. */
export function recipientTag(email: string) {
  const e = email.trim().toLowerCase()
  const domain = e.includes('@') ? e.split('@').pop()! : 'invalid'
  return { recipientDomain: domain.slice(0, 80), recipientHash: createHash('sha256').update(e).digest('hex').slice(0, 12) }
}

/** Removes anything that looks like an email address, key or 6-digit code from provider text before logging. */
export const scrub = (s: string) =>
  s
    .replace(/[^\s@<>()"']+@[^\s@<>()"']+/g, '<email>')
    .replace(/\b(re|sk|pk|key)_[A-Za-z0-9_-]{8,}/g, '<key>')
    .replace(/\b\d{6}\b/g, '<code>')
    .slice(0, 300)

export function log(level: 'info' | 'warn' | 'error', event: string, data: Record<string, unknown>) {
  const line = JSON.stringify({ level, event, at: new Date().toISOString(), ...data })
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}
