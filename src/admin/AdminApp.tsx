import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { I18nProvider } from '../i18n'
import { DemoStoreProvider, type Session } from './data/store'
import { ToastProvider } from './ui'
import { Login } from './Login'

const OwnerApp = lazy(() => import('./owner/OwnerApp'))
const BarberApp = lazy(() => import('./barber/BarberApp'))

const KEY = 'noir.admin.session'

function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    const s = raw ? (JSON.parse(raw) as Session) : null
    return s && s.mode === 'demo' && (s.role === 'owner' || s.role === 'barber') ? s : null
  } catch {
    return null
  }
}

/**
 * /admin — NOIR Command Center.
 * Demo mode only for now: a "session" is just the role chosen on the login
 * screen, kept for this browser tab. Real sign-in replaces this once Supabase
 * is connected; the database then decides the role, never the browser.
 */
export default function AdminApp() {
  const [session, setSession] = useState<Session | null>(readSession)

  useEffect(() => {
    document.title = 'NOIR Command Center'
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (!robots) {
      robots = document.createElement('meta')
      robots.name = 'robots'
      document.head.appendChild(robots)
    }
    robots.content = 'noindex, nofollow'
  }, [])

  const signIn = (s: Session) => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(s))
    } catch {
      /* ignore */
    }
    setSession(s)
  }
  const signOut = () => {
    try {
      sessionStorage.removeItem(KEY)
    } catch {
      /* ignore */
    }
    setSession(null)
  }

  const home = session ? (session.role === 'owner' ? '/owner' : '/barber') : '/'

  return (
    // each person keeps their own language: the key is per user
    <I18nProvider key={session?.userId ?? 'guest'} storageKey={session ? `noir.admin.locale.${session.userId}` : 'noir.locale'} manageDocument={false}>
      <BrowserRouter basename="/admin">
        <ToastProvider>
          {!session ? (
            <Routes>
              <Route path="*" element={<Login onEnter={signIn} />} />
            </Routes>
          ) : (
            <DemoStoreProvider key={session.userId} session={session}>
              <Suspense fallback={<div className="min-h-svh bg-ink" />}>
                <Routes>
                  {/* role gate: a barber can never render the owner app, even by typing the URL */}
                  <Route path="/owner/*" element={session.role === 'owner' ? <OwnerApp onSignOut={signOut} /> : <Navigate to={home} replace />} />
                  <Route path="/barber/*" element={session.role === 'barber' ? <BarberApp onSignOut={signOut} /> : <Navigate to={home} replace />} />
                  <Route path="*" element={<Navigate to={home} replace />} />
                </Routes>
              </Suspense>
            </DemoStoreProvider>
          )}
        </ToastProvider>
      </BrowserRouter>
    </I18nProvider>
  )
}
