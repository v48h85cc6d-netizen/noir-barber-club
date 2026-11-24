import { missingMailSettings, mailerFromEnv } from './mailer'
import { log, newRef } from './log'
import { storeFromEnv } from './store'
import type { Deps } from './verification'

/** Every response carries `ref`, the request reference also written to the logs. */
export const json = (status: number, body: Record<string, unknown>, ref?: string) =>
  new Response(JSON.stringify(ref ? { ...body, ref } : body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  })

/** POST + JSON + same-origin only; small bodies. Returns the parsed body or a ready error response. */
export async function readRequest(req: Request, ref: string): Promise<Record<string, unknown> | Response> {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' }, ref)
  const origin = req.headers.get('origin')
  if (origin && new URL(origin).host !== new URL(req.url).host) return json(403, { ok: false, error: 'forbidden' }, ref)
  const raw = await req.text()
  if (raw.length > 2000) return json(413, { ok: false, error: 'too_large' }, ref)
  try {
    const body = JSON.parse(raw)
    return body && typeof body === 'object' ? body : json(400, { ok: false, error: 'bad_request' }, ref)
  } catch {
    return json(400, { ok: false, error: 'bad_request' }, ref)
  }
}

/** Names of required settings this deploy is missing (never values). */
export function missingSettings(): string[] {
  const missing = (process.env.VERIFICATION_SECRET ?? '').trim().length < 32 ? ['VERIFICATION_SECRET (32+ characters)'] : []
  return [...missing, ...missingMailSettings()]
}

/**
 * Server configuration. A deploy without its settings answers
 * `email_not_configured` and logs exactly which settings are missing.
 * Note: Netlify gives functions the environment variables that existed
 * when the deploy was created — after adding a variable, deploy again.
 */
export function depsFromEnv(ref: string, fn: string): Deps | null {
  const missing = missingSettings()
  if (missing.length) {
    log('error', `${fn}.not_configured`, { ref, missingSettings: missing, hint: 'Add the variables in Netlify, then create a NEW deploy' })
    return null
  }
  const ttl = Number(process.env.VERIFICATION_TTL_SECONDS)
  return { store: storeFromEnv(), mailer: mailerFromEnv(), secret: process.env.VERIFICATION_SECRET!.trim(), ref, ...(ttl > 0 ? { ttl } : {}) }
}

export { newRef }
