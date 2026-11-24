import type { Config } from '@netlify/functions'
import { json, missingSettings, newRef } from '../lib/http'

/**
 * GET /api/verification/status → whether this deploy has its email settings.
 * Only yes/no and setting NAMES — never values. Use it right after a deploy.
 */
export default async () => {
  const missing = missingSettings()
  return json(200, { ok: missing.length === 0, emailConfigured: !missing.some((m) => m.startsWith('RESEND') || m.startsWith('SMTP')), secretConfigured: !missing.some((m) => m.startsWith('VERIFICATION_SECRET')), missing }, newRef())
}

export const config: Config = { path: '/api/verification/status' }
