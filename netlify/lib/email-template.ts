/** Verification email in the customer's language (plain text + simple HTML). */
export type Locale = 'en' | 'de' | 'sq'

const copy = {
  en: {
    subject: 'Your NOIR BARBER CLUB verification code',
    welcome: 'Welcome to NOIR BARBER CLUB.',
    lead: 'Your verification code is:',
    use: 'Enter this code on the registration page to verify your email address and activate your account.',
    expires: (m: number) => `This code expires after ${m} minutes.`,
    ignore: 'If you did not request this verification, you can ignore this email.',
  },
  de: {
    subject: 'Dein Bestätigungscode für NOIR BARBER CLUB',
    welcome: 'Willkommen im NOIR BARBER CLUB.',
    lead: 'Dein Bestätigungscode lautet:',
    use: 'Gib diesen Code auf der Registrierungsseite ein, um deine E-Mail-Adresse zu bestätigen und dein Konto zu aktivieren.',
    expires: (m: number) => `Dieser Code ist ${m} Minuten gültig.`,
    ignore: 'Falls du diese Bestätigung nicht angefordert hast, kannst du diese E-Mail ignorieren.',
  },
  sq: {
    subject: 'Kodi juaj i verifikimit për NOIR BARBER CLUB',
    welcome: 'Mirë se erdhët në NOIR BARBER CLUB.',
    lead: 'Kodi juaj i verifikimit është:',
    use: 'Shkruani këtë kod në faqen e regjistrimit për të verifikuar adresën tuaj të emailit dhe për të aktivizuar llogarinë.',
    expires: (m: number) => `Ky kod skadon pas ${m} minutash.`,
    ignore: 'Nëse nuk e keni kërkuar këtë verifikim, mund ta injoroni këtë email.',
  },
} as const

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export function renderVerificationEmail({ code, locale, minutes }: { code: string; locale: Locale; name?: string; minutes: number }) {
  const c = copy[locale]
  const text = [c.welcome, '', c.lead, '', code, '', c.use, '', c.expires(minutes), '', c.ignore].join('\n')
  const html = `<!doctype html><html lang="${locale}"><body style="margin:0;background:#f6f4ef;font-family:Helvetica,Arial,sans-serif;color:#1f1e1c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4ef;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;padding:36px 32px">
<tr><td style="font-size:22px;font-weight:700;letter-spacing:0.12em">NOIR</td></tr>
<tr><td style="padding-top:24px;font-size:16px;line-height:1.5">${esc(c.welcome)}</td></tr>
<tr><td style="padding-top:12px;font-size:15px;line-height:1.5;color:#55524c">${esc(c.lead)}</td></tr>
<tr><td style="padding:18px 0;font-size:34px;font-weight:700;letter-spacing:0.3em;font-family:'Courier New',monospace">${esc(code)}</td></tr>
<tr><td style="font-size:15px;line-height:1.5;color:#55524c">${esc(c.use)}</td></tr>
<tr><td style="padding-top:12px;font-size:15px;line-height:1.5;color:#55524c">${esc(c.expires(minutes))}</td></tr>
<tr><td style="padding-top:24px;font-size:13px;line-height:1.5;color:#8a867e">${esc(c.ignore)}</td></tr>
</table></td></tr></table></body></html>`
  return { subject: c.subject, text, html }
}
