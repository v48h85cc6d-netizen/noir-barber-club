import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router'
import {
  BadgeCheck,
  BarChart3,
  CalendarDays,
  ExternalLink,
  Gift,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings as Cog,
  SwatchBook,
  TrendingUp,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Wordmark } from '../../components/Logo'
import { LanguageSegmented } from '../../components/LanguageSwitcher'
import { useStore } from '../data/store'
import { useAdminT } from '../i18n'
import { Avatar, Sheet } from '../ui'
import { DemoBanner } from '../DemoBanner'
import { Overview } from './Overview'
import { Appointments } from './Appointments'
import { Barbers } from './Barbers'
import { Clients } from './Clients'
import { Services } from './Services'
import { Revenue } from './Revenue'
import { GiftCards } from './GiftCards'
import { Memberships } from './Memberships'
import { Reports } from './Reports'
import { Settings } from './Settings'

type NavKey = 'overview' | 'appointments' | 'clients' | 'barbers' | 'services' | 'revenue' | 'giftCards' | 'memberships' | 'reports' | 'settings'
const groups: { key: 'groupDaily' | 'groupBusiness' | 'groupSystem'; items: { key: NavKey; path: string; icon: LucideIcon }[] }[] = [
  {
    key: 'groupDaily',
    items: [
      { key: 'overview', path: 'overview', icon: LayoutDashboard },
      { key: 'appointments', path: 'appointments', icon: CalendarDays },
      { key: 'clients', path: 'clients', icon: Users },
    ],
  },
  {
    key: 'groupBusiness',
    items: [
      { key: 'barbers', path: 'barbers', icon: UserRound },
      { key: 'services', path: 'services', icon: SwatchBook },
      { key: 'revenue', path: 'revenue', icon: TrendingUp },
      { key: 'giftCards', path: 'gift-cards', icon: Gift },
      { key: 'memberships', path: 'memberships', icon: BadgeCheck },
      { key: 'reports', path: 'reports', icon: BarChart3 },
    ],
  },
  { key: 'groupSystem', items: [{ key: 'settings', path: 'settings', icon: Cog }] },
]

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useAdminT()
  const { data } = useStore()
  const pendingGifts = data.giftCards.filter((g) => g.payment === 'pending' || (g.payment === 'paid' && g.delivery === 'manual_required')).length
  return (
    <nav aria-label={t.nav.menu} className="space-y-7">
      {groups.map((g) => (
        <div key={g.key}>
          <div className="label mb-2 px-3 text-paper/30">{t.nav[g.key]}</div>
          <ul className="space-y-0.5">
            {g.items.map((it) => (
              <li key={it.key}>
                <NavLink
                  to={`/owner/${it.path}`}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `group relative flex h-10 items-center gap-3 rounded-xl px-3 text-[0.9rem] transition-colors ${
                      isActive ? 'bg-white/[0.06] text-paper' : 'text-paper/55 hover:bg-white/[0.03] hover:text-paper'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={`absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-[#d2b07a] transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                      <it.icon className={`size-[18px] ${isActive ? 'text-[#d2b07a]' : ''}`} strokeWidth={1.5} />
                      <span className="flex-1">{t.nav[it.key]}</span>
                      {it.key === 'giftCards' && pendingGifts > 0 && (
                        <span className="grid min-w-5 place-items-center rounded-full bg-[#d2b07a] px-1.5 text-[0.65rem] font-semibold text-ink">{pendingGifts}</span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function UserFoot({ onSignOut }: { onSignOut: () => void }) {
  const { t } = useAdminT()
  const { session } = useStore()
  return (
    <div className="space-y-4">
      <LanguageSegmented />
      <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-2.5">
        <Avatar name={session.name} size={36} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{session.name}</div>
          <div className="label text-[#d2b07a]">{t.common.owner}</div>
        </div>
        <button type="button" onClick={onSignOut} aria-label={t.common.signOut} title={t.common.signOut} className="grid size-9 place-items-center rounded-full text-paper/50 hover:bg-white/[0.05] hover:text-paper">
          <LogOut className="size-4" strokeWidth={1.5} />
        </button>
      </div>
      <a href="/" className="label flex items-center gap-1.5 px-1 text-paper/40 hover:text-paper">
        {t.common.viewSite} <ExternalLink className="size-3" />
      </a>
    </div>
  )
}

export default function OwnerApp({ onSignOut }: { onSignOut: () => void }) {
  const { t } = useAdminT()
  const [menu, setMenu] = useState(false)
  const loc = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [loc.pathname])

  return (
    <div className="min-h-svh bg-ink text-paper">
      {/* sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-white/[0.06] bg-[#0c0c0e] px-4 py-6 lg:flex">
        <div className="px-3">
          <Wordmark className="w-28" />
          <div className="label mt-3 text-[#d2b07a]">{t.brand.name}</div>
        </div>
        <div className="mt-9 flex-1 overflow-y-auto pr-1">
          <NavItems />
        </div>
        <UserFoot onSignOut={onSignOut} />
      </aside>

      {/* mobile top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.06] bg-ink/90 px-4 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-3">
          <Wordmark className="w-20" />
          <span className="label text-[#d2b07a]">{t.brand.name}</span>
        </div>
        <button type="button" onClick={() => setMenu(true)} aria-label={t.nav.menu} className="grid size-11 place-items-center rounded-full border border-white/10">
          <Menu className="size-5" strokeWidth={1.5} />
        </button>
      </header>
      <Sheet open={menu} onClose={() => setMenu(false)} title={<Wordmark className="w-24" />}>
        <NavItems onNavigate={() => setMenu(false)} />
        <div className="mt-8 border-t border-white/[0.06] pt-6">
          <UserFoot onSignOut={onSignOut} />
        </div>
      </Sheet>

      <div className="lg:pl-[264px]">
        <DemoBanner />
        <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-10">
          <Routes>
            <Route path="overview" element={<Overview />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="clients" element={<Clients />} />
            <Route path="barbers" element={<Barbers />} />
            <Route path="services" element={<Services />} />
            <Route path="revenue" element={<Revenue />} />
            <Route path="gift-cards" element={<GiftCards />} />
            <Route path="memberships" element={<Memberships />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="overview" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
