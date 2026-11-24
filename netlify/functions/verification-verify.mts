import type { Config } from '@netlify/functions'
import { depsFromEnv, json, newRef, readRequest } from '../lib/http'
import { checkCode } from '../lib/verification'

/** POST /api/verification/verify  { email, code } → ok only for the latest, unexpired code. */
export default async (req: Request) => {
  const ref = newRef()
  const body = await readRequest(req, ref)
  if (body instanceof Response) return body
  const deps = depsFromEnv(ref, 'verification.verify')
  if (!deps) return json(503, { ok: false, error: 'email_not_configured' }, ref)
  const r = await checkCode(deps, { email: String(body.email ?? ''), code: String(body.code ?? '') })
  return json(r.ok ? 200 : r.error === 'too_many_attempts' ? 429 : 400, r, ref)
}

export const config: Config = { path: '/api/verification/verify' }
