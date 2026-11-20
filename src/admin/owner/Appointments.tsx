import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '../data/store'
import type { Appointment, AppointmentStatus } from '../data/types'
import { addDays, endOf, hhmm, inRange, isLive, revenueOf, sameDay, startOfDay, startOfWeek } from '../data/select'
import { useAdminT } from '../i18n'
import { BarberAvatar, Btn, Card, Empty, PageHeader, Segmented, Select, StatusPill, useNow } from '../ui'
import { AppointmentSheet, BLOCK, DayBoard } from '../appointments'

type View = 'day' | 'week' | 'list'

export function Appointments() {
  const { t, fmt, pub, money } = useAdminT()
  const { data } = useStore()
  const [view, setView] = useState<View>('day')
  const [date, setDate] = useState(() => startOfDay(new Date()))
  const [open, setOpen] = useState<Appointment | null>(null)
  const [barber, setBarber] = useState('all')
  const [status, setStatus] = useState<'all' | AppointmentStatus>('all')
  const [when, setWhen] = useState<'upcoming' | 'past'>('upcoming')

  const step = view === 'week' ? 7 : 1
  const weekStart = startOfWeek(date)
  const rangeLabel =
    view === 'week'
      ? `${fmt.date(weekStart, { day: 'numeric', month: 'short' })} – ${fmt.date(addDays(weekStart, 6), { day: 'numeric', month: 'short', year: 'numeric' })}`
      : fmt.date(date, { weekday: 'long', day: 'numeric', month: 'long' })

  const nowDate = useNow()
  const list = useMemo(() => {
    const now = nowDate.getTime()
    return data.appointments
      .filter((a) => (barber === 'all' || a.barberId === barber) && (status === 'all' || a.status === status))
      .filter((a) => (when === 'upcoming' ? endOf(a).getTime() >= now : endOf(a).getTime() < now))
      .sort((a, b) => (when === 'upcoming' ? a.start.localeCompare(b.start) : b.start.localeCompare(a.start)))
      .slice(0, 80)
  }, [data.appointments, barber, status, when, nowDate])

  const clientName = (id: string) => data.clients.find((c) => c.id === id)?.name ?? ''
  const barberOf = (id: string) => data.barbers.find((b) => b.id === id)

  return (
    <>
      <PageHeader
        title={<b>{t.appts.title}</b>}
        actions={
          <Segmented
            label={t.appts.title}
            value={view}
            onChange={setView}
            options={[
              { id: 'day', label: t.common.day },
              { id: 'week', label: t.common.week },
              { id: 'list', label: t.common.list },
            ]}
          />
        }
      />

      {view !== 'list' && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Btn size="sm" onClick={() => setDate((d) => addDays(d, -step))} aria-label={t.appts.prev}>
            <ChevronLeft className="size-4" />
          </Btn>
          <Btn size="sm" onClick={() => setDate(startOfDay(new Date()))}>
            {t.common.today}
          </Btn>
          <Btn size="sm" onClick={() => setDate((d) => addDays(d, step))} aria-label={t.appts.next}>
            <ChevronRight className="size-4" />
          </Btn>
          <span className="ml-2 text-lg font-semibold first-letter:uppercase [font-stretch:112%]">{rangeLabel}</span>
        </div>
      )}

      {view === 'day' && (
        <Card pad={false} className="p-4 md:p-6">
          <DayBoard date={date} onOpen={setOpen} />
        </Card>
      )}

      {view === 'week' && (
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <div className="grid min-w-[900px] grid-cols-7 gap-2">
            {Array.from({ length: 7 }, (_, i) => {
              const d = addDays(weekStart, i)
              const items = inRange(data.appointments, d, addDays(d, 1)).filter(isLive)
              const isToday = sameDay(d, new Date())
              return (
                <div key={i} className={`rounded-2xl border p-2 ${isToday ? 'border-[#d2b07a]/50 bg-[#d2b07a]/[0.04]' : 'border-white/[0.07] bg-white/[0.02]'}`}>
                  <button type="button" onClick={() => { setDate(d); setView('day') }} className="mb-2 w-full rounded-xl px-2 py-1.5 text-left hover:bg-white/[0.04]">
                    <div className="label text-paper/45">{fmt.weekday(d, 'short')}</div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-semibold tabular-nums">{d.getDate()}</span>
                      <span className="text-[0.7rem] text-paper/45">
                        {items.length} · {money(revenueOf(items) || items.reduce((s, a) => s + a.price, 0))}
                      </span>
                    </div>
                  </button>
                  <ul className="max-h-[520px] space-y-1 overflow-y-auto">
                    {items.length === 0 && <li className="px-2 py-4 text-center text-xs text-paper/35">{t.appts.closed}</li>}
                    {items.map((a) => (
                      <li key={a.id}>
                        <button type="button" onClick={() => setOpen(a)} className={`flex w-full items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[0.72rem] transition-transform hover:-translate-y-px ${BLOCK[a.status]}`}>
                          <span className="font-mono tabular-nums opacity-70">{hhmm(a.start)}</span>
                          <span className="min-w-0 flex-1 truncate font-medium">{clientName(a.clientId).split(' ')[0]}</span>
                          <span className="size-1.5 shrink-0 rounded-full bg-current opacity-60" title={barberOf(a.barberId)?.name} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {view === 'list' && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Segmented
              label={t.appts.upcoming}
              value={when}
              onChange={setWhen}
              options={[
                { id: 'upcoming', label: t.appts.upcoming },
                { id: 'past', label: t.appts.past },
              ]}
            />
            <Select value={barber} onChange={setBarber} label={t.appts.barber}>
              <option value="all">{t.appts.allBarbers}</option>
              {data.barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
            <Select value={status} onChange={(v) => setStatus(v as typeof status)} label={t.appts.status}>
              <option value="all">{t.appts.allStatuses}</option>
              {(Object.keys(t.status) as AppointmentStatus[]).map((s) => (
                <option key={s} value={s}>
                  {t.status[s]}
                </option>
              ))}
            </Select>
            <span className="ml-auto text-sm text-paper/45">{t.appts.count(list.length)}</span>
          </div>
          {list.length === 0 ? (
            <Empty>{t.appts.empty}</Empty>
          ) : (
            <Card pad={false}>
              {/* table on wide screens, cards on phones */}
              <table className="hidden w-full text-sm md:table">
                <thead>
                  <tr className="label border-b border-white/[0.06] text-left text-paper/40">
                    <th className="px-5 py-3.5 font-normal">{t.appts.time}</th>
                    <th className="px-3 py-3.5 font-normal">{t.appts.client}</th>
                    <th className="px-3 py-3.5 font-normal">{t.appts.service}</th>
                    <th className="px-3 py-3.5 font-normal">{t.appts.barber}</th>
                    <th className="px-3 py-3.5 font-normal">{t.appts.source}</th>
                    <th className="px-3 py-3.5 font-normal">{t.appts.status}</th>
                    <th className="px-5 py-3.5 text-right font-normal">{t.appts.price}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {list.map((a) => {
                    const b = barberOf(a.barberId)
                    return (
                      <tr key={a.id} onClick={() => setOpen(a)} className="cursor-pointer transition-colors hover:bg-white/[0.025]">
                        <td className="whitespace-nowrap px-5 py-3 tabular-nums">
                          <span className="text-paper/50">{fmt.date(new Date(a.start), { weekday: 'short', day: 'numeric', month: 'short' })}</span> {hhmm(a.start)}
                        </td>
                        <td className="px-3 py-3 font-medium">{clientName(a.clientId)}</td>
                        <td className="px-3 py-3 text-paper/75">{pub.services.items[a.serviceId].name}</td>
                        <td className="px-3 py-3">
                          <span className="flex items-center gap-2">
                            {b && <BarberAvatar image={b.image} name={b.name} size={22} />}
                            {b?.name.split(' ')[0]}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-paper/55">{t.source[a.source]}</td>
                        <td className="px-3 py-3">
                          <StatusPill status={a.status} />
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums">{money(a.price)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <ul className="divide-y divide-white/[0.05] md:hidden">
                {list.map((a) => (
                  <li key={a.id}>
                    <button type="button" onClick={() => setOpen(a)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                      <div className="w-14 shrink-0 text-center">
                        <div className="text-xs text-paper/45">{fmt.date(new Date(a.start), { day: 'numeric', month: 'short' })}</div>
                        <div className="font-semibold tabular-nums">{hhmm(a.start)}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{clientName(a.clientId)}</div>
                        <div className="truncate text-xs text-paper/50">
                          {pub.services.items[a.serviceId].name} · {barberOf(a.barberId)?.name.split(' ')[0]}
                        </div>
                      </div>
                      <StatusPill status={a.status} />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      <AppointmentSheet appt={open} onClose={() => setOpen(null)} />
    </>
  )
}
