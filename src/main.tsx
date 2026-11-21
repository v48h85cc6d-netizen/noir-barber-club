import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { I18nProvider } from './i18n'

// /admin is the private Command Center: loaded on demand, so the public site's bundle is unchanged
const isAdmin = /^\/admin(\/|$)/.test(window.location.pathname)
const AdminApp = lazy(() => import('./admin/AdminApp'))

const root = createRoot(document.getElementById('root')!)

if (isAdmin) {
  // light Command Center theme from the first paint (no dark flash)
  document.documentElement.classList.add('cc-root')
  root.render(
    <StrictMode>
      <Suspense fallback={<div style={{ minHeight: '100svh', background: '#f6f4ef' }} />}>
        <AdminApp />
      </Suspense>
    </StrictMode>,
  )
} else {
  // hide reveal targets only when JS animations will actually run
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('js-anim')
  }
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

  root.render(
    <StrictMode>
      <I18nProvider>
        <App />
      </I18nProvider>
    </StrictMode>,
  )
}
