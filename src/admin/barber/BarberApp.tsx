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
  const { data } = useStore()
  const me = data.barbers[0]
  const loc = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [loc.pathname])

  return (
    <div className="min-h-svh bg-ink text-paper">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Wordmark className="w-20" />
            <span className="label text-[#d2b07a]">{t.common.barber}</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageDropdown />
            <button type="button" onClick={onSignOut} aria-label={t.common.signOut} className="grid size-10 place-items-center rounded-full border border-white/10 text-paper/70 hover:text-paper">
              <LogOut className="size-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>
      <DemoBanner />

      <main className="mx-auto max-w-2xl px-4 pb-32 pt-6">
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
      <nav aria-label={t.nav.menu} className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#0c0c0e]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <ul className="mx-auto grid max-w-2xl grid-cols-5">
          {tabs.map((x) => (
            <li key={x.key}>
              <NavLink
                to={`/barber/${x.path}`}
                className={({ isActive }) => `flex h-[68px] flex-col items-center justify-center gap-1 text-[0.68rem] transition-colors ${isActive ? 'text-[#d2b07a]' : 'text-paper/50 hover:text-paper'}`}
              >
                {({ isActive }) => (
                  <>
                    <span className={`grid h-8 w-12 place-items-center rounded-full transition-colors ${isActive ? 'bg-[#d2b07a]/14' : ''}`}>
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
