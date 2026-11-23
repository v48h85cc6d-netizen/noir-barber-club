import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'
import { I18nProvider } from '../i18n'
import { auth, useSession, type AuthSession } from '../demo/auth'
import { DemoStoreProvider, type Session } from './data/store'
import { ToastProvider } from './ui'
import { StaffChooser, StaffLogin } from './Login'
import { AuthLayout } from './auth-ui'
import { useAdminT } from './i18n'
import './admin.css'

const OwnerApp = lazy(() => import('./owner/OwnerApp'))
const BarberApp = lazy(() => import('./barber/BarberApp'))

/**
 * /admin — NOIR Command Center (owner + barbers).
 * Access is decided from the signed-in account's role on every route, not by
 * hiding links: a barber who types /admin/owner is sent to their own app, and
 * a customer account never gets past the staff gate. DEMO: the session comes
 * from the local mock auth (src/demo/auth.ts); the real backend repeats every
 * check on the server.
 */
export default function AdminApp() {
  const session = useSession()

  useEffect(() => {
    document.title = 'NOIR Command Center'
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

  const staff = session && session.role !== 'customer' ? session : null

  return (
    // each person keeps their own language: the key is per user
    <I18nProvider key={staff?.accountId ?? 'guest'} storageKey={staff ? `noir.admin.locale.${staff.accountId}` : 'noir.locale'} manageDocument={false}>
      <BrowserRouter basename="/admin">
        <ToastProvider>
          <StaffRoutes session={session} />
        </ToastProvider>
      </BrowserRouter>
    </I18nProvider>
  )
}

function StaffRoutes({ session }: { session: AuthSession | null }) {
  const nav = useNavigate()
  const signOut = () => {
    auth.signOut()
    nav('/', { replace: true })
  }

  // a customer account is signed in: this whole area is closed to it
  if (session?.role === 'customer') return <CustomerBlocked />

  const home = session ? (session.role === 'owner' ? '/owner' : '/barber') : null
  const asStore = (s: AuthSession): Session => ({ mode: 'demo', userId: s.accountId, name: s.name, role: s.role as Session['role'], barberId: s.barberId })

  return (
    <Routes>
      <Route path="/" element={home ? <Navigate to={home} replace /> : <StaffChooser />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/login/owner" element={home ? <Navigate to={home} replace /> : <StaffLogin area="owner" />} />
      <Route path="/login/barber" element={home ? <Navigate to={home} replace /> : <StaffLogin area="barber" />} />
      <Route
        path="/owner/*"
        element={
          <Guard session={session} role="owner" login="/login/owner">
            {(s) => (
              <DemoStoreProvider key={s.accountId} session={asStore(s)}>
                <Lazy>
                  <OwnerApp onSignOut={signOut} />
                </Lazy>
              </DemoStoreProvider>
            )}
          </Guard>
        }
      />
      <Route
        path="/barber/*"
        element={
          <Guard session={session} role="barber" login="/login/barber">
            {(s) => (
              <DemoStoreProvider key={s.accountId} session={asStore(s)}>
                <Lazy>
                  <BarberApp onSignOut={signOut} />
                </Lazy>
              </DemoStoreProvider>
            )}
          </Guard>
        }
      />
      <Route path="*" element={<Navigate to={home ?? '/'} replace />} />
    </Routes>
  )
}

/** Renders children only for the given role; otherwise sends the person to their own home or to the login. */
function Guard({ session, role, login, children }: { session: AuthSession | null; role: 'owner' | 'barber'; login: string; children: (s: AuthSession) => ReactNode }) {
  const loc = useLocation()
  if (!session) return <Navigate to={login} replace state={{ from: loc.pathname }} />
  if (session.role !== role) return <Navigate to={session.role === 'owner' ? '/owner' : '/barber'} replace />
  return <>{children(session)}</>
}

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="min-h-svh" />}>{children}</Suspense>
}

function CustomerBlocked() {
  const { t } = useAdminT()
  return (
    <AuthLayout eyebrow={t.login.eyebrow} intro={t.login.intro} backHref="/" backLabel={t.login.backToSite}>
      <h1 className="display text-[clamp(1.9rem,4vw,2.6rem)]">
        <b>{t.login.blockedTitle}</b>
      </h1>
      <p className="mt-3 text-sm text-paper/60">{t.login.blockedText}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <a href="/account" className="flex h-11 items-center rounded-full bg-paper px-5 text-sm font-medium text-ink hover:bg-paper/90">
          {t.login.blockedCta}
        </a>
        <button type="button" onClick={() => auth.signOut()} className="flex h-11 items-center rounded-full border border-paper/15 bg-white/60 px-5 text-sm hover:bg-white">
          {t.login.signOutFirst}
        </button>
      </div>
    </AuthLayout>
  )
}
