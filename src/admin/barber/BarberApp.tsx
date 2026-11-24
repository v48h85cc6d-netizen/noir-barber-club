import { useEffect } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router'
import { CalendarDays, CircleUserRound, Clock4, LogOut, Sun, Users, type LucideIcon } from 'lucide-react'
import { Wordmark } from '../../components/Logo'
import { LanguageDropdown } from '../../components/LanguageSwitcher'
import { useStore } from '../data/store'
import { useAdminT } from '../i18n'
import { DemoBanner } from '../DemoBanner'
import { Clients } from '../owner/Clients'
import { Today } from './Today'
import { Calendar } from './Calendar'
import { Schedule } from './Schedule'
import { Profile } from './Profile'

const tabs: { key: 'today' | 'calendar' | 'myClients' | 'schedule' | 'profile'; path: string; icon: LucideIcon }[] = [
  { key: 'today', path: 'today', icon: Sun },
  { key: 'calendar', path: 'calendar', icon: CalendarDays },
  { key: 'myClients', path: 'clients', icon: Users },
  { key: 'schedule', path: 'schedule', icon: Clock4 },
  { key: 'profile', path: 'profile', icon: CircleUserRound },
]

export default function BarberApp({ onSignOut }: { onSignOut: () => void }) {
  const { t } = useAdminT()
  const { data, session } = useStore()
  // the profile linked to the signed-in account (the store already limits data to it)
  const me = data.barbers.find((b) => b.id === session.barberId && b.active)
  const loc = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [loc.pathname])

  if (!me) {
    return (
      <div className="relative grid min-h-svh place-items-center px-4 text-paper">
        <div aria-hidden className="cc-backdrop" />
        <div className="glass relative max-w-md rounded-[28px] p-8 text-center">
          <p className="text-paper/75">{t.common.noProfile}</p>
          <button type="button" onClick={onSignOut} className="mt-6 h-11 rounded-full bg-paper px-6 text-sm font-medium text-ink">
            {t.common.signOut}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-svh text-paper">
      <div aria-hidden className="cc-backdrop" />
      <header className="glass-bar sticky top-0 z-30 border-b border-paper/[0.06]">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Wordmark className="w-20 shrink-0" />
            <span className="label truncate text-[#8a6a33]" title={`${t.bApp.loggedInAs} ${me?.name ?? ''}`}>
              {me?.name}
              <span className="hidden sm:inline"> · {t.common.barber}</span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageDropdown />
            <button type="button" onClick={onSignOut} aria-label={t.common.signOut} className="grid size-10 place-items-center rounded-full border border-paper/10 bg-white/70 text-paper/70 hover:text-paper">
              <LogOut className="size-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>
      <DemoBanner />

      <main className="relative z-[1] mx-auto min-w-0 max-w-2xl px-4 pb-32 pt-6">
        <Routes>
          <Route path="today" element={<Today me={me} />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="clients" element={<Clients compact />} />
          <Route path="schedule" element={<Schedule me={me} />} />
          <Route path="profile" element={<Profile me={me} onSignOut={onSignOut} />} />
          <Route path="*" element={<Navigate to="today" replace />} />
        </Routes>
      </main>

      {/* bottom tab bar — big touch targets, thumb reach */}
      <nav aria-label={t.nav.menu} className="glass-bar fixed inset-x-0 bottom-0 z-40 border-t border-white/80 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_30px_-20px_rgba(31,30,28,0.35)]">
        <ul className="mx-auto grid max-w-2xl grid-cols-5">
          {tabs.map((x) => (
            <li key={x.key}>
              <NavLink
                to={`/barber/${x.path}`}
                className={({ isActive }) => `flex h-[68px] flex-col items-center justify-center gap-1 text-[0.68rem] transition-colors ${isActive ? 'text-[#8a6a33]' : 'text-paper/50 hover:text-paper'}`}
              >
                {({ isActive }) => (
                  <>
                    <span className={`grid h-8 w-12 place-items-center rounded-full transition-colors ${isActive ? 'bg-[#d2b07a]/25' : ''}`}>
                      <x.icon className="size-[22px]" strokeWidth={1.5} />
                    </span>
                    {t.nav[x.key]}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
