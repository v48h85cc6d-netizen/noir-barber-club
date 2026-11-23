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

class MailError extends Error {
  constructor(
    public code: 'not_configured' | 'rejected',
    message: string,
  ) {
    super(message)
  }
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
        if (!key) throw new MailError('not_configured', 'RESEND_API_KEY is not set')
        const res = await fetch(env('RESEND_API_URL') || 'https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: `${from.name} <${from.address}>`, to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html }),
        })
        const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string }
        if (!res.ok || !body.id) throw new MailError('rejected', `Resend ${res.status}: ${body.name ?? ''} ${body.message ?? ''}`.trim())
        return { id: body.id }
      },
    }
  }

  if (provider === 'smtp') {
    return {
      async send(msg) {
        if (!env('SMTP_HOST') || !env('SMTP_USER') || !env('SMTP_PASS')) throw new MailError('not_configured', 'SMTP_HOST / SMTP_USER / SMTP_PASS are not set')
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
          throw new MailError('rejected', `SMTP: ${(e as Error).message}`)
        }
      },
    }
  }

  return {
    async send() {
      throw new MailError('not_configured', 'No email provider configured (set RESEND_API_KEY or SMTP_* environment variables)')
    },
  }
}
