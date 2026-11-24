import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ArrowRight, MailCheck, RotateCcw } from 'lucide-react'
import { auth, type FieldError, type RegisterFields, type RegisterInput } from '../demo/auth'
import { AuthLayout, DemoAuthNote, FormAlert, PasswordField, TextField } from '../admin/auth-ui'
import { useAccountT, type AccountDict } from './i18n'
import { sendVerificationCode, verifyAndActivate, type SendOutcome } from '../demo/verification'

/** First name of a customer who just registered (read once by My appointments). */
export const WELCOME_KEY = 'noir.account.welcome'

const primary = 'flex h-12 w-full items-center justify-center gap-2 rounded-full bg-paper text-sm font-medium text-ink transition-colors hover:bg-paper/90'

/** Keeps ?next=booking on links between the auth pages. */
function useNext() {
  const loc = useLocation()
  const next = new URLSearchParams(loc.search).get('next')
  return { next, qs: next ? `?next=${encodeURIComponent(next)}` : '', from: (loc.state as { from?: string } | null)?.from }
}

const fieldMsg = (a: AccountDict, e?: FieldError) => (e ? a.auth.errors[e] : undefined)

export function LoginPage() {
  const { a } = useAccountT()
  const nav = useNavigate()
  const { next, qs, from } = useNext()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [unverified, setUnverified] = useState(false)
  const [sending, setSending] = useState(false)
  const { locale } = useAccountT()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setUnverified(false)
    if (!email.trim() || !password) return setError(a.auth.errors.required)
    const r = auth.signIn(email, password, 'customer')
    if (r.ok) {
      // the router re-renders: ?next=booking returns to the booking panel
      if (!next) nav(from ?? '/appointments', { replace: true })
      return
    }
    if (r.error === 'unverified') {
      setError(a.verify.unverifiedLogin)
      setUnverified(true)
      return
    }
    setError(r.error === 'wrong_area' ? a.auth.errors.staff : r.error === 'inactive' ? a.auth.errors.inactive : a.auth.errors.invalid)
  }

  /** Unverified registration: send a fresh code and go to the verification screen. */
  const sendNew = async () => {
    const pending = auth.pendingRegistration(email)
    if (!pending) return setError(a.verify.errors.no_pending)
    setSending(true)
    const r = await sendVerificationCode(pending.email, pending.name, locale)
    setSending(false)
    if (r.ok || r.error === 'cooldown') {
      saveTiming(pending.email, r)
      nav(`/verify${qs}`, { state: { email: pending.email } })
    } else setError(sendError(a, r))
  }

  return (
    <AuthLayout eyebrow={a.auth.eyebrow} intro={a.auth.intro} backHref="/" backLabel={a.common.backToSite}>
      <h1 className="display text-[clamp(2.2rem,5vw,3rem)]">
        <b>{a.auth.loginTitle}</b>
      </h1>
      <p className="mt-2 text-sm text-paper/55">{a.auth.loginIntro}</p>
      {next === 'booking' && <p className="mt-4 rounded-xl border border-[#b8935a]/30 bg-[#d2b07a]/[0.12] p-3 text-sm text-paper/75">{a.auth.bookingKept}</p>}
      <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
        {error && (
          <FormAlert>
            {error}
            {unverified && (
              <button type="button" onClick={sendNew} disabled={sending} className="mt-2 flex items-center gap-1.5 font-medium underline underline-offset-4 disabled:opacity-50">
                <MailCheck className="size-4" strokeWidth={1.75} /> {sending ? a.verify.sending : a.verify.sendNewCode}
              </button>
            )}
            {error === a.auth.errors.staff && (
              <>
                {' '}
                <a href="/admin" className="underline underline-offset-4">
                  {a.auth.staffLogin}
                </a>
              </>
            )}
          </FormAlert>
        )}
        <TextField label={a.auth.email} type="email" name="email" autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <PasswordField label={a.auth.password} name="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} showLabel={a.auth.show} hideLabel={a.auth.hide} />
        <div className="flex justify-end">
          <Link to="/forgot" className="text-sm text-paper/60 underline underline-offset-4 hover:text-paper">
            {a.auth.forgot}
          </Link>
        </div>
        <button type="submit" className={primary}>
          {a.auth.signIn} <ArrowRight className="size-4" />
        </button>
      </form>
      <p className="mt-6 text-sm text-paper/60">
        {a.auth.noAccount}{' '}
        <Link to={`/register${qs}`} className="font-medium text-paper underline underline-offset-4">
          {a.auth.createOne}
        </Link>
      </p>
      <DemoAuthNote>{a.common.demoNote}</DemoAuthNote>
    </AuthLayout>
  )
}

export function RegisterPage() {
  const { a, pub } = useAccountT()
  const nav = useNavigate()
  const { next, qs } = useNext()
  const [f, setF] = useState<RegisterInput>({ name: '', email: '', phone: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<RegisterFields>({})
  const [alert, setAlert] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { locale } = useAccountT()
  const set = (k: keyof RegisterInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setF({ ...f, [k]: e.target.value })
    if (errors[k]) setErrors({ ...errors, [k]: undefined })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    // 1–2: validate and make sure the email is free; the registration is kept as PENDING (no account yet)
    const r = auth.startRegistration(f)
    if (!r.ok) {
      setErrors(r.fields ?? {})
      setAlert(r.error === 'email_taken' ? a.auth.errors.email_taken : a.auth.errors.fix)
      return
    }
    setErrors({})
    setAlert(null)
    // 3–4: the server creates the code and emails it
    setBusy(true)
    const sent = await sendVerificationCode(r.value.email, r.value.name, locale)
    setBusy(false)
    if (!sent.ok && sent.error !== 'cooldown') {
      // no email → nothing may stay behind: drop the pending registration (no account was created)
      auth.cancelPendingRegistration(r.value.email)
      return setAlert(sendError(a, sent))
    }
    saveTiming(r.value.email, sent)
    // 5: the verification screen
    nav(`/verify${qs}`, { state: { email: r.value.email } })
  }

  return (
    <AuthLayout eyebrow={a.auth.eyebrow} intro={a.auth.intro} backHref="/" backLabel={a.common.backToSite}>
      <h1 className="display text-[clamp(2.2rem,5vw,3rem)]">
        <b>{a.auth.registerTitle}</b>
      </h1>
      <p className="mt-2 text-sm text-paper/55">{a.auth.registerIntro}</p>
      {next === 'booking' && <p className="mt-4 rounded-xl border border-[#b8935a]/30 bg-[#d2b07a]/[0.12] p-3 text-sm text-paper/75">{a.auth.bookingKept}</p>}
      <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
        {alert && (
          <FormAlert>
            {alert}
            {alert === a.auth.errors.email_taken && (
              <>
                {' '}
                <Link to={`/login${qs}`} className="underline underline-offset-4">
                  {a.auth.signInLink}
                </Link>
              </>
            )}
          </FormAlert>
        )}
        <TextField label={a.auth.name} name="name" autoComplete="name" required value={f.name} onChange={set('name')} error={fieldMsg(a, errors.name)} maxLength={80} />
        <TextField label={a.auth.email} type="email" name="email" autoComplete="email" inputMode="email" required value={f.email} onChange={set('email')} error={fieldMsg(a, errors.email)} maxLength={254} />
        <TextField label={a.auth.phone} type="tel" name="phone" autoComplete="tel" inputMode="tel" required value={f.phone} onChange={set('phone')} error={fieldMsg(a, errors.phone)} maxLength={24} placeholder={pub.steps.phonePh} />
        <PasswordField label={a.auth.password} name="password" autoComplete="new-password" required value={f.password} onChange={set('password')} error={fieldMsg(a, errors.password)} hint={a.auth.passwordHint} showLabel={a.auth.show} hideLabel={a.auth.hide} maxLength={128} />
        <PasswordField label={a.auth.confirm} name="confirm" autoComplete="new-password" required value={f.confirm} onChange={set('confirm')} error={fieldMsg(a, errors.confirm)} showLabel={a.auth.show} hideLabel={a.auth.hide} maxLength={128} />
        <button type="submit" disabled={busy} className={`${primary} disabled:opacity-60`}>
          {busy ? a.verify.creating : a.auth.create} <ArrowRight className="size-4" />
        </button>
      </form>
      <p className="mt-6 text-sm text-paper/60">
        {a.auth.haveAccount}{' '}
        <Link to={`/login${qs}`} className="font-medium text-paper underline underline-offset-4">
          {a.auth.signInLink}
        </Link>
      </p>
      <DemoAuthNote>{a.common.demoNote}</DemoAuthNote>
    </AuthLayout>
  )
}

/** Demo password reset: the code is shown on screen because no email service exists yet. */
export function ForgotPage() {
  const { a } = useAccountT()
  const [email, setEmail] = useState('')
  const [stage, setStage] = useState<'email' | 'code' | 'done'>('email')
  const [demoCode, setDemoCode] = useState<string | null>(null)
  const [noAccount, setNoAccount] = useState(false)
  const [f, setF] = useState({ code: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<RegisterFields>({})
  const [alert, setAlert] = useState<string | null>(null)

  return (
    <AuthLayout eyebrow={a.auth.eyebrow} intro={a.auth.intro} backHref="/" backLabel={a.common.backToSite}>
      <h1 className="display text-[clamp(2rem,4.5vw,2.8rem)]">
        <b>{a.auth.forgotTitle}</b>
      </h1>
      {stage === 'email' && (
        <form
          className="mt-6 space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setAlert(a.auth.errors.email)
            setAlert(null)
            const r = auth.requestPasswordReset(email)
            setDemoCode(r.demoCode)
            setNoAccount(!r.demoCode)
            if (r.demoCode) setStage('code')
          }}
        >
          <p className="text-sm text-paper/55">{a.auth.forgotIntro}</p>
          {alert && <FormAlert>{alert}</FormAlert>}
          {noAccount && <FormAlert tone="ok">{a.auth.noAccountForEmail}</FormAlert>}
          <TextField label={a.auth.email} type="email" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" className={primary}>
            {a.auth.sendCode} <ArrowRight className="size-4" />
          </button>
        </form>
      )}
      {stage === 'code' && (
        <form
          className="mt-6 space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            const r = auth.resetPassword(email, f.code, f.password, f.confirm)
            if (r.ok) return setStage('done')
            setErrors(r.fields ?? {})
            setAlert(r.error === 'invalid_code' ? a.auth.errors.invalid_code : a.auth.errors.fix)
          }}
        >
          {demoCode && <DemoAuthNote>{a.auth.demoCode(demoCode)}</DemoAuthNote>}
          {alert && <FormAlert>{alert}</FormAlert>}
          <TextField label={a.auth.code} name="code" inputMode="numeric" autoComplete="one-time-code" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} maxLength={6} />
          <PasswordField label={a.auth.newPassword} name="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} error={fieldMsg(a, errors.password)} hint={a.auth.passwordHint} showLabel={a.auth.show} hideLabel={a.auth.hide} />
          <PasswordField label={a.auth.confirm} name="confirm" autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} error={fieldMsg(a, errors.confirm)} showLabel={a.auth.show} hideLabel={a.auth.hide} />
          <button type="submit" className={primary}>
            {a.auth.setPassword} <ArrowRight className="size-4" />
          </button>
        </form>
      )}
      {stage === 'done' && (
        <div className="mt-6 space-y-4">
          <FormAlert tone="ok">{a.auth.resetDone}</FormAlert>
        </div>
      )}
      <Link to="/login" className="mt-6 text-sm text-paper/60 underline underline-offset-4 hover:text-paper">
        {a.auth.backToLogin}
      </Link>
    </AuthLayout>
  )
}

/* ———————————————— email verification ———————————————— */

const TIMING_KEY = 'noir.verify.timing'
interface Timing {
  email: string
  expiresAt: number
  resendAvailableAt: number
}
/** Only the timing is kept (for the countdown), never the code. */
function saveTiming(email: string, r: SendOutcome) {
  const prev = readTiming(email)
  const t: Timing = r.ok
    ? { email, expiresAt: r.expiresAt, resendAvailableAt: r.resendAvailableAt }
    : { email, expiresAt: prev?.expiresAt ?? 0, resendAvailableAt: r.retryAt ?? Date.now() + 60_000 }
  try {
    sessionStorage.setItem(TIMING_KEY, JSON.stringify(t))
  } catch {
    /* ignore */
  }
}
function readTiming(email: string): Timing | null {
  try {
    const t = JSON.parse(sessionStorage.getItem(TIMING_KEY) ?? 'null') as Timing | null
    return t && t.email === email ? t : null
  } catch {
    return null
  }
}

function sendError(a: AccountDict, r: SendOutcome) {
  if (r.ok) return ''
  if (r.error === 'cooldown') return a.verify.errors.cooldown(Math.max(1, Math.ceil(((r.retryAt ?? Date.now()) - Date.now()) / 1000)))
  // the reference lets the shop find this exact request in the server logs
  return r.ref ? `${a.verify.errors[r.error]} (Ref ${r.ref})` : a.verify.errors[r.error]
}

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** /account/verify — enter the 6-digit code that was emailed. */
export function VerifyPage() {
  const { a, locale } = useAccountT()
  const nav = useNavigate()
  const loc = useLocation()
  const { next, qs } = useNext()
  const stateEmail = (loc.state as { email?: string } | null)?.email
  // the email comes from the sign-up / sign-in step (or the last code sent in this tab)
  const [email] = useState(() => {
    if (stateEmail) return stateEmail
    try {
      const fromTab = (JSON.parse(sessionStorage.getItem(TIMING_KEY) ?? 'null') as Timing | null)?.email
      // new tab or restarted browser: continue the registration waiting in this browser
      return fromTab ?? auth.latestPendingRegistration()?.email ?? ''
    } catch {
      return auth.latestPendingRegistration()?.email ?? ''
    }
  })
  const pending = email ? auth.pendingRegistration(email) : null
  const [timing, setTiming] = useState<Timing | null>(() => readTiming(email))
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [msg, setMsg] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null)
  const [busy, setBusy] = useState<'verify' | 'send' | null>(null)
  const [done, setDone] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const boxes = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  useEffect(() => {
    boxes.current[0]?.focus()
  }, [])

  const left = timing ? timing.expiresAt - now : 0
  const expired = !!timing && timing.expiresAt > 0 && left <= 0
  const resendWait = timing ? Math.ceil((timing.resendAvailableAt - now) / 1000) : 0
  const code = digits.join('')

  const setDigit = (i: number, v: string) => {
    const clean = v.replace(/\D/g, '')
    if (clean.length > 1) {
      // pasted or autofilled code
      const next = clean.slice(0, 6).split('')
      setDigits([...next, ...Array(6 - next.length).fill('')])
      boxes.current[Math.min(next.length, 5)]?.focus()
      return
    }
    const nextDigits = [...digits]
    nextDigits[i] = clean
    setDigits(nextDigits)
    if (clean && i < 5) boxes.current[i + 1]?.focus()
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy || done) return
    if (!/^\d{6}$/.test(code)) return setMsg({ tone: 'error', text: a.verify.errors.incomplete })
    setBusy('verify')
    // set before activation: signing in re-routes immediately to the account
    const keep = (k: string, v: string | null) => {
      try {
        if (v === null) sessionStorage.removeItem(k)
        else sessionStorage.setItem(k, v)
      } catch {
        /* ignore */
      }
    }
    keep(WELCOME_KEY, (pending?.name ?? '').split(' ')[0])
    const r = await verifyAndActivate(email, code)
    setBusy(null)
    if (r.ok) {
      setDone(true)
      setMsg({ tone: 'ok', text: a.verify.success })
      keep(TIMING_KEY, null)
      // signed in now: continue the booking, or open the account
      window.setTimeout(() => (next === 'booking' ? window.location.replace('/?book=resume') : nav('/appointments', { replace: true })), 1200)
      return
    }
    keep(WELCOME_KEY, null)
    setDigits(['', '', '', '', '', ''])
    boxes.current[0]?.focus()
    const text = r.error === 'invalid_code' ? a.verify.errors.invalid_code(r.attemptsLeft ?? 0) : a.verify.errors[r.error]
    setMsg({ tone: 'error', text: r.ref && (r.error === 'email_not_configured' || r.error === 'service_unavailable') ? `${text} (Ref ${r.ref})` : text })
  }

  const resend = async () => {
    if (!pending || busy) return
    setBusy('send')
    const r = await sendVerificationCode(pending.email, pending.name, locale)
    setBusy(null)
    saveTiming(pending.email, r)
    setTiming(readTiming(pending.email))
    setDigits(['', '', '', '', '', ''])
    setMsg(r.ok ? { tone: 'ok', text: a.verify.sent } : { tone: 'error', text: sendError(a, r) })
  }

  if (!pending && !done) {
    return (
      <AuthLayout eyebrow={a.auth.eyebrow} intro={a.auth.intro} backHref="/" backLabel={a.common.backToSite}>
        <h1 className="display text-[clamp(2rem,4.5vw,2.8rem)]">
          <b>{a.verify.title}</b>
        </h1>
        <div className="mt-6">
          <FormAlert>{a.verify.errors.no_pending}</FormAlert>
        </div>
        <Link to={`/register${qs}`} className="mt-6 text-sm font-medium underline underline-offset-4">
          {a.auth.createOne}
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout eyebrow={a.auth.eyebrow} intro={a.auth.intro} backHref="/" backLabel={a.common.backToSite}>
      <span className="grid size-12 place-items-center rounded-full bg-[#d2b07a] text-[#1f1e1c]">
        <MailCheck className="size-5" strokeWidth={1.5} />
      </span>
      <h1 className="display mt-5 text-[clamp(2rem,4.5vw,2.8rem)]">
        <b>{a.verify.title}</b>
      </h1>
      <p className="mt-2 text-sm text-paper/60">{a.verify.lead}</p>
      <p className="mt-1 break-all text-sm font-medium">{a.verify.sentTo(email)}</p>

      <form className="mt-6 space-y-5" onSubmit={verify} noValidate>
        {msg && <FormAlert tone={msg.tone}>{msg.text}</FormAlert>}
        <fieldset disabled={done}>
          <legend className="label mb-2 text-paper/55">{a.verify.codeLabel}</legend>
          <div className="grid grid-cols-6 gap-1.5 sm:gap-2" onPaste={(e) => {
            const t = e.clipboardData.getData('text')
            if (/\d{6}/.test(t.replace(/\D/g, ''))) {
              e.preventDefault()
              setDigit(0, t)
            }
          }}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  boxes.current[i] = el
                }}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !digits[i] && i > 0) boxes.current[i - 1]?.focus()
                }}
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                maxLength={i === 0 ? 6 : 1}
                aria-label={a.verify.digit(i + 1)}
                name={`digit-${i + 1}`}
                className="h-14 w-full min-w-0 rounded-xl border border-paper/12 bg-white/80 text-center text-2xl font-semibold tabular-nums text-paper outline-none transition-colors focus:border-[#b8935a] focus:bg-white sm:h-16"
              />
            ))}
          </div>
        </fieldset>
        <p className={`text-sm tabular-nums ${expired ? 'text-[#9a3550]' : 'text-paper/55'}`} aria-live="polite">
          {timing && timing.expiresAt > 0 ? (expired ? a.verify.errors.expired : a.verify.expiresIn(mmss(left))) : null}
        </p>
        <button type="submit" disabled={!!busy || done} className={`${primary} disabled:opacity-60`}>
          {busy === 'verify' ? a.verify.verifying : a.verify.verify} <ArrowRight className="size-4" />
        </button>
        <button
          type="button"
          onClick={resend}
          disabled={!!busy || done || resendWait > 0}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-paper/15 bg-white/60 text-sm transition-colors hover:bg-white disabled:opacity-50"
        >
          <RotateCcw className="size-4" strokeWidth={1.5} /> {busy === 'send' ? a.verify.sending : resendWait > 0 ? a.verify.resendIn(resendWait) : a.verify.resend}
        </button>
      </form>
      <p className="mt-6 text-xs leading-relaxed text-paper/50">{a.verify.spam}</p>
      <Link to={`/register${qs}`} className="mt-3 text-sm text-paper/60 underline underline-offset-4 hover:text-paper">
        {a.verify.startAgain}
      </Link>
    </AuthLayout>
  )
}
