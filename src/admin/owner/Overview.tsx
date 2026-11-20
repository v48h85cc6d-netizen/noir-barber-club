import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { AlertTriangle, ArrowUpRight, CalendarOff, CreditCard, Gift } from 'lucide-react'
import { useStore } from '../data/store'
import type { Appointment } from '../data/types'
import { addDays, greetingPart, inRange, isLive, pctChange, revenueOf, startOfDay, startOfWeek, utilization } from '../data/select'
import { useAdminT } from '../i18n'
import { Card, Kpi, PageHeader, BarberAvatar } from '../ui'
import { AreaChart } from '../charts'
import { AppointmentSheet, DayBoard } from '../appointments'

export function Overview() {
  const { t, fmt, money } = useAdminT()
  const { data, session } = useStore()
  const [open, setOpen] = useState<Appointment | null>(null)
  const now = new Date()
  const today = startOfDay(now)
  const tomorrow = addDays(today, 1)

  const m = useMemo(() => {
    const todayList = inRange(data.appointments, today, tomorrow)
    const lastWeekSame = inRange(data.appointments, addDays(today, -7), addDays(today, -6))
    const wk = startOfWeek(now)
    const util = utilization(data, wk, addDays(wk, 7))
    const utilPrev = utilization(data, addDays(wk, -7), wk)
    const newIn = (from: Date, to: Date) => data.clients.filter((c) => new Date(c.since) >= from && new Date(c.since) < to).length
    const series = Array.from({ length: 14 }, (_, i) => {
      const d = addDays(today, i - 13)
      return {
        label: fmt.date(d, { weekday: 'long', day: 'numeric', month: 'long' }),
        short: fmt.date(d, { day: 'numeric', month: 'short' }),
        value: revenueOf(inRange(data.appointments, d, addDays(d, 1))),
      }
    })
    return {
      todayList,
      revToday: revenueOf(todayList),
      revPrev: revenueOf(lastWeekSame),
      countToday: todayList.filter(isLive).length,
      countPrev: lastWeekSame.filter(isLive).length,
      util,
      utilPrev,
      newClients: newIn(addDays(today, -30), tomorrow),
      newPrev: newIn(addDays(today, -60), addDays(today, -30)),
      series,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, fmt])

  const alerts = [
    ...(data.giftCards.filter((g) => g.payment === 'pending').length
      ? [{ icon: CreditCard, text: t.overview.giftPending(data.giftCards.filter((g) => g.payment === 'pending').length), to: '/owner/gift-cards' }]
      : []),
    ...(data.giftCards.filter((g) => g.payment === 'paid' && g.delivery === 'manual_required').length
      ? [{ icon: Gift, text: t.overview.manualDelivery(data.giftCards.filter((g) => g.payment === 'paid' && g.delivery === 'manual_required').length), to: '/owner/gift-cards' }]
      : []),
    ...(data.memberships.filter((x) => x.status === 'past_due').length
      ? [{ icon: AlertTriangle, text: t.overview.pastDue(data.memberships.filter((x) => x.status === 'past_due').length), to: '/owner/memberships' }]
      : []),
    ...data.barbers.flatMap((b) =>
      b.timeOff
        .filter((o) => new Date(o.to) >= today && new Date(o.from) <= addDays(today, 21))
        .map((o) => ({ icon: CalendarOff, text: t.overview.timeOff(b.name.split(' ')[0], fmt.date(new Date(o.from), { weekday: 'short', day: 'numeric', month: 'short' })), to: '/owner/barbers' })),
    ),
  ]

  return (
    <>
      <PageHeader
        eyebrow={fmt.date(now, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        title={
          <>
            {t.overview.greet[greetingPart(now)]} <b>{session.name.split(' ')[0]}</b>
          </>
        }
        intro={t.overview.subtitle(m.countToday)}
      />

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <Kpi accent label={t.overview.revenueToday} value={money(m.revToday)} delta={pctChange(m.revToday, m.revPrev)} />
        <Kpi label={t.overview.bookingsToday} value={m.countToday} delta={pctChange(m.countToday, m.countPrev)} />
        <Kpi label={t.overview.utilization} value={`${fmt.number(Math.round(m.util * 100))}%`} delta={pctChange(m.util, m.utilPrev)} />
        <Kpi label={t.overview.newClients} value={m.newClients} delta={pctChange(m.newClients, m.newPrev)} />
      </div>

      <div className="mt-4 grid gap-4 md:mt-6 lg:grid-cols-3 md:gap-6">
        <Card title={t.overview.revenueChart} className="lg:col-span-2">
          <AreaChart data={m.series} format={(n) => money(n)} caption={t.overview.revenueChart} />
        </Card>
        <Card title={t.overview.attention}>
          {alerts.length === 0 ? (
            <p className="text-sm text-paper/50">{t.overview.allClear}</p>
          ) : (
            <ul className="space-y-2">
              {alerts.map((a, i) => (
                <li key={i}>
                  <Link to={a.to} className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-sm transition-colors hover:border-[#d2b07a]/40">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#d2b07a]/12 text-[#d2b07a]">
                      <a.icon className="size-4" strokeWidth={1.5} />
                    </span>
                    <span className="flex-1 text-paper/80">{a.text}</span>
                    <ArrowUpRight className="size-4 text-paper/30 transition-transform group-hover:rotate-45 group-hover:text-paper" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title={t.overview.todayBoard} className="mt-4 md:mt-6" aside={<span className="label text-paper/40">{t.overview.nowLabel} · {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}</span>}>
        <DayBoard date={today} onOpen={setOpen} />
      </Card>

      <Card title={t.overview.perBarber} className="mt-4 md:mt-6">
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data.barbers.map((b) => {
            const list = m.todayList.filter((a) => a.barberId === b.id && isLive(a))
            return (
              <li key={b.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <BarberAvatar image={b.image} name={b.name} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{b.name}</div>
                  <div className="text-xs text-paper/50">
                    {list.length} {t.overview.booked} · {money(revenueOf(list))}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </Card>

      <AppointmentSheet appt={open} onClose={() => setOpen(null)} />
    </>
  )
}
