import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { auth, type FieldError, type RegisterFields, type RegisterInput } from '../demo/auth'
import { AuthLayout, DemoAuthNote, FormAlert, PasswordField, TextField } from '../admin/auth-ui'
import { useAccountT, type AccountDict } from './i18n'

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

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return setError(a.auth.errors.required)
    const r = auth.signIn(email, password, 'customer')
    if (r.ok) {
      // the router re-renders: ?next=booking returns to the booking panel
      if (!next) nav(from ?? '/appointments', { replace: true })
      return
    }
    setError(r.error === 'wrong_area' ? a.auth.errors.staff : r.error === 'inactive' ? a.auth.errors.inactive : a.auth.errors.invalid)
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
  const set = (k: keyof RegisterInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setF({ ...f, [k]: e.target.value })
    if (errors[k]) setErrors({ ...errors, [k]: undefined })
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const r = auth.register(f)
    if (r.ok) {
      // shown once on the next page (works whichever redirect gets there first)
      try {
        sessionStorage.setItem(WELCOME_KEY, r.value.name.split(' ')[0])
      } catch {
        /* ignore */
      }
      if (!next) nav('/appointments', { replace: true })
      return
    }
    setErrors(r.fields ?? {})
    setAlert(r.error === 'email_taken' ? a.auth.errors.email_taken : a.auth.errors.fix)
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
        <button type="submit" className={primary}>
          {a.auth.create} <ArrowRight className="size-4" />
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
