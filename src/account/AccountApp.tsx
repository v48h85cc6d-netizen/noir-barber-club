import { useEffect, type ReactNode } from 'react'
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router'
import { CalendarDays, CalendarPlus, LogOut, UserRound } from 'lucide-react'
import { I18nProvider } from '../i18n'
import { auth, useSession, type AuthSession } from '../demo/auth'
import { Wordmark } from '../components/Logo'
import { LanguageDropdown } from '../components/LanguageSwitcher'
import { ToastProvider } from '../admin/ui'
import { AuthLayout } from '../admin/auth-ui'
import { useAccountT } from './i18n'
import { ForgotPage, LoginPage, RegisterPage, VerifyPage } from './AuthPages'
import { MyAppointments } from './MyAppointments'
import { ProfilePage } from './Profile'
import '../admin/admin.css'

/**
 * /account — the customer area (white glass, like the Command Center).
 * Only CUSTOMER accounts get in: visitors are sent to sign-in (and back to
 * where they wanted to go), staff accounts are pointed to /admin.
 * DEMO: backed by the local mock auth and booking service (src/demo/).
 */
export default function AccountApp() {
  useEffect(() => {
    document.title = 'My NOIR · NOIR Barber Club'
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
    // same language as the public website
    <I18nProvider>
      <BrowserRouter basename="/account">
        <ToastProvider>
          <AccountRoutes />
        </ToastProvider>
      </BrowserRouter>
    </I18nProvider>
  )
}

function AccountRoutes() {
  const session = useSession()
  const loc = useLocation()
  // a staff account is signed in: the customer pages are not theirs
  if (session && session.role !== 'customer') return <StaffHere />

  const params = new URLSearchParams(loc.search)
  const signedInHome = params.get('next') === 'booking' ? <ResumeBooking /> : <Navigate to="/appointments" replace />

  return (
    <Routes>
      <Route path="/login" element={session ? signedInHome : <LoginPage />} />
      <Route path="/register" element={session ? signedInHome : <RegisterPage />} />
      <Route path="/verify" element={session ? signedInHome : <VerifyPage />} />
      <Route path="/forgot" element={session ? <Navigate to="/appointments" replace /> : <ForgotPage />} />
      <Route path="/appointments" element={<CustomerOnly session={session}>{(s) => <Shell><MyAppointments session={s} /></Shell>}</CustomerOnly>} />
      <Route path="/profile" element={<CustomerOnly session={session}>{(s) => <Shell><ProfilePage session={s} /></Shell>}</CustomerOnly>} />
      <Route path="*" element={<Navigate to={session ? '/appointments' : '/login'} replace />} />
    </Routes>
  )
}

/** Back to the public booking panel with the kept choices. */
function ResumeBooking() {
  useEffect(() => {
    window.location.replace('/?book=resume')
  }, [])
  return <div className="min-h-svh" />
}

function CustomerOnly({ session, children }: { session: AuthSession | null; children: (s: AuthSession) => ReactNode }) {
  const loc = useLocation()
  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  return <>{children(session)}</>
}

function StaffHere() {
  const { a } = useAccountT()
  return (
    <AuthLayout eyebrow={a.auth.eyebrow} intro={a.auth.intro} backHref="/" backLabel={a.common.backToSite}>
      <h1 className="display text-[clamp(1.9rem,4vw,2.6rem)]">
        <b>{a.auth.staffHereTitle}</b>
      </h1>
      <p className="mt-3 text-sm text-paper/60">{a.auth.staffHereText}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <a href="/admin" className="flex h-11 items-center rounded-full bg-paper px-5 text-sm font-medium text-ink hover:bg-paper/90">
          {a.auth.staffHereCta}
        </a>
        <button type="button" onClick={() => auth.signOut()} className="flex h-11 items-center rounded-full border border-paper/15 bg-white/60 px-5 text-sm hover:bg-white">
          {a.common.signOut}
        </button>
      </div>
    </AuthLayout>
  )
}

function Shell({ children }: { children: ReactNode }) {
  const { a } = useAccountT()
  const nav = useNavigate()
  const loc = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [loc.pathname])
  const tab = ({ isActive }: { isActive: boolean }) =>
    `flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm transition-colors ${isActive ? 'bg-white text-paper shadow-[0_6px_16px_-10px_rgba(31,30,28,0.35)] ring-1 ring-paper/[0.06]' : 'text-paper/60 hover:bg-white/60 hover:text-paper'}`
  return (
    <div className="relative min-h-svh text-paper">
      <div aria-hidden className="cc-backdrop" />
      <header className="glass-bar sticky top-0 z-30 border-b border-paper/[0.06]">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-3 px-4 md:px-6">
          <a href="/" className="flex min-w-0 items-center gap-3" aria-label={a.common.backToSite}>
            <Wordmark className="w-20 shrink-0" />
            <span className="label truncate text-[#8a6a33]">{a.common.brand}</span>
          </a>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageDropdown />
            <button
              type="button"
              onClick={() => {
                auth.signOut()
                nav('/login', { replace: true })
              }}
              aria-label={a.common.signOut}
              title={a.common.signOut}
              className="grid size-10 place-items-center rounded-full border border-paper/10 bg-white/70 text-paper/70 hover:text-paper"
            >
              <LogOut className="size-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>
      <div className="relative z-10 border-b border-[#b8935a]/20 bg-[linear-gradient(90deg,rgba(210,176,122,0.22),rgba(255,255,255,0.35))] px-4 py-2 backdrop-blur-md">
        <p className="mx-auto flex max-w-4xl items-center gap-2.5 text-xs text-paper/70 md:px-2">
          <span className="label shrink-0 rounded-full bg-[#d2b07a] px-2 py-0.5 text-[0.62rem] text-[#1f1e1c]">{a.common.demoBadge}</span>
          <span className="min-w-0">{a.common.demoNote}</span>
        </p>
      </div>
      <main className="relative z-[1] mx-auto min-w-0 max-w-4xl px-4 pb-16 pt-6 md:px-6 md:pt-10">
        <nav aria-label={a.common.menu} className="mb-6 flex flex-wrap items-center gap-1">
          <NavLink to="/appointments" className={tab}>
            <CalendarDays className="size-4" strokeWidth={1.5} /> {a.common.appointments}
          </NavLink>
          <NavLink to="/profile" className={tab}>
            <UserRound className="size-4" strokeWidth={1.5} /> {a.common.profile}
          </NavLink>
          <a href="/?book=1" className="order-first flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-paper px-4 sm:order-none sm:ml-auto sm:h-10 sm:w-auto text-sm font-medium text-ink shadow-[0_8px_20px_-10px_rgba(31,30,28,0.5)] hover:bg-paper/90">
            <CalendarPlus className="size-4" strokeWidth={1.5} /> {a.common.book}
          </a>
        </nav>
        {children}
      </main>
    </div>
  )
}
