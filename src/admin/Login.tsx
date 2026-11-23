import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ArrowRight, Crown, RotateCcw, Scissors } from 'lucide-react'
import { auth } from '../demo/auth'
import { resetDb } from '../demo/db'
import { useAdminT } from './i18n'
import { AuthLayout, DemoAuthNote, FormAlert, PasswordField, TextField } from './auth-ui'
import { useToast } from './ui'

/** /admin — choose the owner or the barber login. */
export function StaffChooser() {
  const { t } = useAdminT()
  const toast = useToast()
  const card =
    'group flex w-full items-center gap-4 rounded-2xl border border-paper/10 bg-white/70 p-4 text-left shadow-[0_6px_18px_-14px_rgba(31,30,28,0.4)] transition-colors hover:border-[#b8935a]/60 hover:bg-white'
  return (
    <AuthLayout eyebrow={t.login.eyebrow} intro={t.login.intro} backHref="/" backLabel={t.login.backToSite}>
      <div className="label text-paper/45">NOIR</div>
      <h1 className="display mt-3 text-[clamp(2.2rem,5vw,3.2rem)]">
        <b>{t.login.title}</b>
      </h1>
      <h2 className="mt-6 text-lg font-semibold [font-stretch:115%]">{t.login.chooseTitle}</h2>
      <p className="mt-1 text-sm text-paper/55">{t.login.chooseIntro}</p>
      <div className="mt-5 space-y-3">
        <Link to="/login/owner" className={card}>
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#d2b07a] text-[#1f1e1c]">
            <Crown className="size-5" strokeWidth={1.5} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold [font-stretch:115%]">{t.login.ownerLogin}</span>
            <span className="text-sm text-paper/50">{t.login.ownerLoginNote}</span>
          </span>
          <ArrowRight className="size-5 shrink-0 text-paper/40 transition-transform group-hover:translate-x-1 group-hover:text-paper" strokeWidth={1.5} />
        </Link>
        <Link to="/login/barber" className={card}>
          <span className="grid size-12 shrink-0 place-items-center rounded-full border border-paper/15 bg-white">
            <Scissors className="size-5" strokeWidth={1.5} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold [font-stretch:115%]">{t.login.barberLogin}</span>
            <span className="text-sm text-paper/50">{t.login.barberLoginNote}</span>
          </span>
          <ArrowRight className="size-5 shrink-0 text-paper/40 transition-transform group-hover:translate-x-1 group-hover:text-paper" strokeWidth={1.5} />
        </Link>
      </div>
      <a href="/account/login" className="mt-6 text-sm text-paper/60 underline underline-offset-4 hover:text-paper">
        {t.login.customerLink}
      </a>
      <DemoAuthNote>{t.demo.long}</DemoAuthNote>
      <button
        type="button"
        onClick={() => {
          if (!window.confirm(t.login.resetConfirm)) return
          resetDb()
          toast(t.login.resetDone)
        }}
        className="mt-4 inline-flex items-center gap-2 self-start text-xs text-paper/50 hover:text-paper"
      >
        <RotateCcw className="size-3.5" /> {t.login.resetDemo}
      </button>
    </AuthLayout>
  )
}

/** /admin/login/owner and /admin/login/barber — each form only accepts its own role. */
export function StaffLogin({ area }: { area: 'owner' | 'barber' }) {
  const { t } = useAdminT()
  const nav = useNavigate()
  const loc = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const from = (loc.state as { from?: string } | null)?.from

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return setError(t.login.errRequired)
    const r = auth.signIn(email, password, area)
    if (r.ok) {
      const home = area === 'owner' ? '/owner' : '/barber'
      nav(from && from.startsWith(home) ? from : home, { replace: true })
      return
    }
    if (r.error === 'wrong_area') setError(r.accountRole === 'customer' ? t.login.errCustomer : area === 'owner' ? t.login.errNotOwner : t.login.errNotBarber)
    else setError(r.error === 'inactive' ? t.login.errInactive : t.login.errInvalid)
  }

  return (
    <AuthLayout eyebrow={t.login.eyebrow} intro={t.login.intro} backHref="/" backLabel={t.login.backToSite}>
      <Link to="/" className="label self-start text-paper/45 hover:text-paper">
        ← {t.login.allLogins}
      </Link>
      <h1 className="display mt-4 text-[clamp(2rem,4.5vw,2.8rem)]">
        <b>{area === 'owner' ? t.login.ownerLogin : t.login.barberLogin}</b>
      </h1>
      <p className="mt-2 text-sm text-paper/55">{area === 'owner' ? t.login.ownerLoginNote : t.login.barberLoginNote}</p>
      <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
        {error && <FormAlert>{error}</FormAlert>}
        <TextField label={t.login.email} type="email" name="email" autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <PasswordField
          label={t.login.password}
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          showLabel={t.login.show}
          hideLabel={t.login.hide}
        />
        <button type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-paper text-sm font-medium text-ink transition-colors hover:bg-paper/90">
          {t.login.signIn} <ArrowRight className="size-4" />
        </button>
      </form>
      <DemoAuthNote>{t.login.demoNote}</DemoAuthNote>
    </AuthLayout>
  )
}
