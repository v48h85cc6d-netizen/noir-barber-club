/**
 * Email delivery for server functions. Credentials come ONLY from server
 * environment variables (Netlify → Site configuration → Environment
 * variables); nothing here is ever bundled into the website.
 *
 *   EMAIL_FROM        sender address  (default projects@veltri-x-agency.com)
 *   EMAIL_FROM_NAME   display name    (default NOIR BARBER CLUB)
 *   EMAIL_PROVIDER    "resend" or "smtp" (picked automatically when omitted)
 *   RESEND_API_KEY    Resend API key (domain must be verified in Resend)
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE ("true" for port 465)
 */
import nodemailer from 'nodemailer'

export interface MailMessage {
  to: string
  subject: string
  text: string
  html: string
}
export interface Mailer {
  send(msg: MailMessage): Promise<{ id: string }>
}

/**
 * not_configured     key / SMTP settings missing in this deploy
 * auth               the provider refused the key (revoked, restricted, wrong)
 * sender             the sender address or domain is not allowed (domain not verified, testing restriction)
 * invalid_recipient  the provider says the recipient address is invalid
 * rate_limited       the provider's own rate limit or quota
 * unavailable        network error or provider 5xx (after one retry)
 * rejected           anything else
 */
export type MailErrorCode = 'not_configured' | 'auth' | 'sender' | 'invalid_recipient' | 'rate_limited' | 'unavailable' | 'rejected'

export class MailError extends Error {
  constructor(
    public code: MailErrorCode,
    message: string,
    /** provider details for the logs (never the key) */
    public provider: { name: string; status?: number; errorName?: string; message?: string; missing?: string[] },
  ) {
    super(message)
  }
}

/** Map a Resend error response to a cause (https://resend.com/docs/api-reference/errors). */
export function classifyResend(status: number, name = '', message = ''): MailErrorCode {
  const m = message.toLowerCase()
  if (status === 401 || name === 'missing_api_key' || name === 'invalid_api_key' || name === 'restricted_api_key') return 'auth'
  if (status === 429 || name === 'rate_limit_exceeded' || name === 'daily_quota_exceeded' || name === 'monthly_quota_exceeded') return 'rate_limited'
  if (status >= 500) return 'unavailable'
  if (status === 403 || m.includes('domain is not verified') || m.includes('testing emails') || name === 'invalid_from_address') return 'sender'
  if (status === 422 && (m.includes('`to`') || m.includes(' to ') || m.includes('recipient') || m.includes('email address'))) return 'invalid_recipient'
  return 'rejected'
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Which settings this deploy is missing (names only). */
export function missingMailSettings(): string[] {
  const provider = env('EMAIL_PROVIDER') || (env('RESEND_API_KEY') ? 'resend' : env('SMTP_HOST') ? 'smtp' : '')
  if (provider === 'resend') return env('RESEND_API_KEY') ? [] : ['RESEND_API_KEY']
  if (provider === 'smtp') return ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].filter((k) => !env(k))
  return ['RESEND_API_KEY (or SMTP_HOST/SMTP_USER/SMTP_PASS)']
}

const env = (k: string) => (process.env[k] ?? '').trim()

export function sender() {
  return { address: env('EMAIL_FROM') || 'projects@veltri-x-agency.com', name: env('EMAIL_FROM_NAME') || 'NOIR BARBER CLUB' }
}

export function mailerFromEnv(): Mailer {
  const provider = env('EMAIL_PROVIDER') || (env('RESEND_API_KEY') ? 'resend' : env('SMTP_HOST') ? 'smtp' : '')
  const from = sender()

  if (provider === 'resend') {
    return {
      async send(msg) {
        const key = env('RESEND_API_KEY')
        if (!key) throw new MailError('not_configured', 'RESEND_API_KEY is not set', { name: 'resend', missing: ['RESEND_API_KEY'] })
        const attempt = async () => {
          const res = await fetch(env('RESEND_API_URL') || 'https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: `${from.name} <${from.address}>`, to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html }),
          })
          const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string }
          if (res.ok && body.id) return { id: body.id }
          const code = res.ok ? 'rejected' : classifyResend(res.status, body.name, body.message)
          throw new MailError(code, `Resend ${res.status}`, { name: 'resend', status: res.status, errorName: body.name, message: body.message })
        }
        try {
          return await attempt()
        } catch (e) {
          // one retry for network errors and provider outages only
          const transient = !(e instanceof MailError) || e.code === 'unavailable'
          if (!transient) throw e
          await pause(600)
          try {
            return await attempt()
          } catch (e2) {
            if (e2 instanceof MailError) throw e2
            throw new MailError('unavailable', 'network error', { name: 'resend', message: (e2 as Error).message })
          }
        }
      },
    }
  }

  if (provider === 'smtp') {
    return {
      async send(msg) {
        if (!env('SMTP_HOST') || !env('SMTP_USER') || !env('SMTP_PASS')) throw new MailError('not_configured', 'SMTP settings missing', { name: 'smtp', missing: missingMailSettings() })
        const port = Number(env('SMTP_PORT') || 587)
        const transport = nodemailer.createTransport({
          host: env('SMTP_HOST'),
          port,
          secure: env('SMTP_SECURE') ? env('SMTP_SECURE') === 'true' : port === 465,
          auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') },
        })
        try {
          const info = await transport.sendMail({ from: { name: from.name, address: from.address }, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html })
          return { id: info.messageId }
        } catch (e) {
          const err = e as { responseCode?: number; code?: string; message?: string }
          const rc = err.responseCode ?? 0
          const code: MailErrorCode = rc === 535 ? 'auth' : rc === 550 || rc === 553 ? 'invalid_recipient' : rc === 421 || rc === 450 || rc === 451 || err.code === 'ECONNECTION' || err.code === 'ETIMEDOUT' ? 'unavailable' : 'rejected'
          throw new MailError(code, 'SMTP error', { name: 'smtp', status: rc || undefined, errorName: err.code, message: err.message })
        }
      },
    }
  }

  return {
    async send() {
      throw new MailError('not_configured', 'No email provider configured', { name: 'none', missing: missingMailSettings() })
    },
  }
}
