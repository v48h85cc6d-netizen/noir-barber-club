import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { I18nProvider } from '../i18n'
import { auth, isEmail, useSession } from '../demo/auth'
import { useAdminT } from './i18n'
import { AuthLayout, DemoAuthNote, FormAlert, PasswordField, TextField } from './auth-ui'
import './admin.css'

/**
 * /staff-login — one entrance for the NOIR team (owner and barbers).
 * Uses the existing account store via auth.signInStaff: the role comes from
 * the stored account, customers are refused and get no session, and the
 * dashboards keep their own role guards (/admin/owner, /admin/barber).
 */
export default function StaffSignInApp() {
  useEffect(() => {
    document.title = 'Staff Sign In · NOIR Barber Club'
    document.documentElement.classList.add('cc-root')
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f6f4ef')
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (!robots) {
      robots = document.createElement('meta')
      robots.name = 'robots'
      document.head.appendChild(robots)
    }
    robots.content = 'noindex, nofollow'
  }, [])
  return (
    <I18nProvider manageDocument={false}>
      <StaffSignIn />
    </I18nProvider>
  )
}

const dashboardFor = (role: string) => (role === 'owner' ? '/admin/owner' : '/admin/barber')

function StaffSignIn() {
  const { t } = useAdminT()
  const s = t.staff
  const session = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErr, setFieldErr] = useState<{ email?: string; password?: string }>({})
  const [error, setError] = useState<{ text: string; customer?: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [showForgot, setShowForgot] = useState(false)

  // already signed in as staff: straight to the right dashboard
  useEffect(() => {
    if (session && session.role !== 'customer') window.location.replace(dashboardFor(session.role))
  }, [session])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    const errs: typeof fieldErr = {}
    if (!email.trim()) errs.email = s.errRequired
    else if (!isEmail(email)) errs.email = s.errEmail
    if (!password) errs.password = s.errRequired
    setFieldErr(errs)
    setError(null)
    if (Object.keys(errs).length) return
    setBusy(true)
    // let the loading state paint before the (synchronous) demo check
    await new Promise((r) => setTimeout(r, 250))
    const r = auth.signInStaff(email, password)
    if (r.ok) {
      window.location.assign(dashboardFor(r.value.role))
      return
    }
    setBusy(false)
    if (r.error === 'not_staff') setError({ text: s.errNotStaff, customer: true })
    else setError({ text: r.error === 'inactive' ? s.errInactive : s.errInvalid })
  }

  return (
    <AuthLayout eyebrow={s.eyebrow} intro={t.login.intro} backHref="/" backLabel={t.login.backToSite}>
      <a href="/account/login" className="label inline-flex items-center gap-1.5 self-start text-paper/50 hover:text-paper">
        <ArrowLeft className="size-3.5" /> {s.back}
      </a>
      <h1 className="display mt-4 text-[clamp(2rem,4.5vw,2.8rem)]">
        <b>{s.title}</b>
      </h1>
      <p className="mt-2 text-sm text-paper/60">{s.lead}</p>

      <form className="mt-6 space-y-4" onSubmit={submit} noValidate aria-busy={busy}>
        {error && (
          <FormAlert>
            {error.text}
            {error.customer && (
              <>
                {' '}
                <a href="/account/login" className="underline underline-offset-4">
                  {s.customerHere}
                </a>
              </>
            )}
          </FormAlert>
        )}
        <TextField
          label={s.email}
          type="email"
          name="email"
          autoComplete="username"
          inputMode="email"
          value={email}
          disabled={busy}
          onChange={(e) => {
            setEmail(e.target.value)
            if (fieldErr.email) setFieldErr({ ...fieldErr, email: undefined })
          }}
          error={fieldErr.email}
        />
        <PasswordField
          label={s.password}
          name="password"
          autoComplete="current-password"
          value={password}
          disabled={busy}
          onChange={(e) => {
            setPassword(e.target.value)
            if (fieldErr.password) setFieldErr({ ...fieldErr, password: undefined })
          }}
          error={fieldErr.password}
          showLabel={s.show}
          hideLabel={s.hide}
        />
        <div className="flex justify-end">
          <button type="button" onClick={() => setShowForgot((v) => !v)} aria-expanded={showForgot} className="text-sm text-paper/60 underline underline-offset-4 hover:text-paper">
            {s.forgot}
          </button>
        </div>
        {showForgot && <p className="rounded-xl border border-paper/10 bg-white/60 p-3 text-sm text-paper/70">{s.forgotNote}</p>}
        <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-paper text-sm font-medium text-ink transition-colors hover:bg-paper/90 disabled:opacity-70">
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" /> {s.signingIn}
            </>
          ) : (
            <>
              {s.signIn} <ArrowRight className="size-4" />
            </>
          )}
        </button>
      </form>
      <DemoAuthNote>{t.login.demoNote}</DemoAuthNote>
    </AuthLayout>
  )
}
