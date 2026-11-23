import { mailerFromEnv } from './mailer'
import { storeFromEnv } from './store'
import type { Deps } from './verification'

export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })

/** POST + JSON + same-origin only; small bodies. Returns the parsed body or a ready error response. */
export async function readRequest(req: Request): Promise<Record<string, unknown> | Response> {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' })
  const origin = req.headers.get('origin')
  if (origin && new URL(origin).host !== new URL(req.url).host) return json(403, { ok: false, error: 'forbidden' })
  const raw = await req.text()
  if (raw.length > 2000) return json(413, { ok: false, error: 'too_large' })
  try {
    const body = JSON.parse(raw)
    return body && typeof body === 'object' ? body : json(400, { ok: false, error: 'bad_request' })
  } catch {
    return json(400, { ok: false, error: 'bad_request' })
  }
}

/** Server configuration; a missing secret is reported, never papered over. */
export function depsFromEnv(): Deps | null {
  const secret = (process.env.VERIFICATION_SECRET ?? '').trim()
  if (secret.length < 32) {
    console.error('[verification] VERIFICATION_SECRET is missing or shorter than 32 characters')
    return null
  }
  const ttl = Number(process.env.VERIFICATION_TTL_SECONDS)
  return { store: storeFromEnv(), mailer: mailerFromEnv(), secret, ...(ttl > 0 ? { ttl } : {}) }
}
