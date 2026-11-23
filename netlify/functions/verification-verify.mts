import type { Config } from '@netlify/functions'
import { depsFromEnv, json, readRequest } from '../lib/http'
import { checkCode } from '../lib/verification'

/** POST /api/verification/verify  { email, code } → ok only for the latest, unexpired code. */
export default async (req: Request) => {
  const body = await readRequest(req)
  if (body instanceof Response) return body
  const deps = depsFromEnv()
  if (!deps) return json(503, { ok: false, error: 'email_not_configured' })
  const r = await checkCode(deps, { email: String(body.email ?? ''), code: String(body.code ?? '') })
  return json(r.ok ? 200 : r.error === 'too_many_attempts' ? 429 : 400, r)
}

export const config: Config = { path: '/api/verification/verify' }
