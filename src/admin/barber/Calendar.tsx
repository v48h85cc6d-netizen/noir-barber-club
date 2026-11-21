import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '../data/store'
import type { Appointment } from '../data/types'
import { addDays, endOf, hhmm, inRange, sameDay, startOfDay, startOfWeek } from '../data/select'
import { useAdminT } from '../i18n'
import { Empty, StatusPill } from '../ui'
import { AppointmentSheet } from '../appointments'

/** Week strip + the chosen day's appointments (own appointments only). */
export function Calendar() {
  const { t, fmt, pub } = useAdminT()
  const { data } = useStore()
  const [day, setDay] = useState(() => startOfDay(new Date()))
  const [open, setOpen] = useState<Appointment | null>(null)
  const wk = startOfWeek(day)
  const list = inRange(data.appointments, day, addDays(day, 1)).filter((a) => a.status !== 'cancelled')

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="display text-[2rem] first-letter:uppercase">
          <b>{fmt.date(day, { month: 'long', year: 'numeric' })}</b>
        </h1>
        <div className="flex gap-2">
          <button type="button" aria-label={t.appts.prev} onClick={() => setDay(addDays(day, -7))} className="grid size-11 place-items-center rounded-full border border-paper/10">
            <ChevronLeft className="size-5" />
          </button>
          <button type="button" aria-label={t.appts.next} onClick={() => setDay(addDays(day, 7))} className="grid size-11 place-items-center rounded-full border border-paper/10">
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
      <div role="radiogroup" aria-label={t.common.week} className="mt-5 grid grid-cols-7 gap-1.5">
        {Array.from({ length: 7 }, (_, i) => {
          const d = addDays(wk, i)
          const n = inRange(data.appointments, d, addDays(d, 1)).filter((a) => a.status !== 'cancelled').length
          const on = sameDay(d, day)
          const isToday = sameDay(d, new Date())
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setDay(d)}
              className={`flex h-[76px] flex-col items-center justify-center gap-0.5 rounded-2xl border transition-colors ${on ? 'border-[#d2b07a] bg-[#d2b07a] text-[#1f1e1c]' : isToday ? 'border-[#d2b07a]/40' : 'border-paper/[0.07] bg-white/60'}`}
            >
              <span className="label text-[0.58rem] opacity-70">{fmt.weekday(d, 'short')}</span>
              <span className="text-xl font-semibold tabular-nums">{d.getDate()}</span>
              <span className={`text-[0.6rem] tabular-nums ${on ? 'text-[#1f1e1c]/70' : 'text-paper/45'}`}>{n || '·'}</span>
            </button>
          )
        })}
      </div>
      <div className="mt-6">
        <div className="label mb-3 text-paper/45">{fmt.date(day, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        {list.length === 0 ? (
          <Empty>{t.bApp.noneLeft}</Empty>
        ) : (
          <ul className="space-y-2">
            {list.map((a) => {
              const c = data.clients.find((x) => x.id === a.clientId)
              return (
                <li key={a.id}>
                  <button type="button" onClick={() => setOpen(a)} className="flex w-full items-stretch gap-3 rounded-2xl border border-paper/[0.07] bg-white/60 p-3.5 text-left hover:border-paper/20">
                    <span className="flex w-14 shrink-0 flex-col justify-center border-r border-paper/[0.08] pr-3 tabular-nums">
                      <span className="font-semibold">{hhmm(a.start)}</span>
                      <span className="text-xs text-paper/45">{hhmm(endOf(a))}</span>
                    </span>
                    <span className="min-w-0 flex-1 self-center">
                      <span className="block truncate font-medium">{c?.name}</span>
                      <span className="block truncate text-xs text-paper/50">{pub.services.items[a.serviceId].name}</span>
                    </span>
                    <span className="self-center">
                      <StatusPill status={a.status} />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <AppointmentSheet appt={open} onClose={() => setOpen(null)} />
    </div>
  )
}
