import type { Config, Context } from '@netlify/functions'
import { depsFromEnv, json, newRef, readRequest } from '../lib/http'
import { sendCode } from '../lib/verification'

/** POST /api/verification/send  { email, name?, locale? } → emails a new 6-digit code. */
export default async (req: Request, context: Context) => {
  const ref = newRef()
  const body = await readRequest(req, ref)
  if (body instanceof Response) return body
  const deps = depsFromEnv(ref, 'verification.send')
  if (!deps) return json(503, { ok: false, error: 'email_not_configured' }, ref)
  const r = await sendCode(deps, { email: String(body.email ?? ''), name: String(body.name ?? ''), locale: String(body.locale ?? 'en'), ip: context.ip })
  const status = r.ok ? 200 : r.error === 'invalid_email' ? 400 : r.error === 'cooldown' || r.error === 'rate_limited' ? 429 : 503
  return json(status, r, ref)
}

export const config: Config = { path: '/api/verification/send' }
