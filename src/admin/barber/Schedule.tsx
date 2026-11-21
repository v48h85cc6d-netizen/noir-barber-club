import { Info } from 'lucide-react'
import type { BarberRecord } from '../data/types'
import { useAdminT } from '../i18n'
import { Card, useNow } from '../ui'

const ORDER = [1, 2, 3, 4, 5, 6, 0]

/** Own hours and time off — read-only; the owner manages them. */
export function Schedule({ me }: { me: BarberRecord }) {
  const { t, fmt } = useAdminT()
  const today = useNow().getDay()
  return (
    <div className="space-y-5">
      <h1 className="display text-[2rem]">
        <b>{t.nav.schedule}</b>
      </h1>
      <Card title={t.bApp.myHours}>
        <ul className="divide-y divide-paper/[0.06]">
          {ORDER.map((d) => {
            const h = me.hours[d]
            return (
              <li key={d} className={`flex items-center justify-between py-3 ${d === today ? 'font-semibold text-paper' : 'text-paper/75'}`}>
                <span className="first-letter:uppercase">{fmt.weekday(new Date(2024, 0, 7 + d), 'long')}</span>
                <span className="tabular-nums">{h ? `${h.start} – ${h.end}` : <span className="text-paper/35">{t.barbers.off}</span>}</span>
              </li>
            )
          })}
        </ul>
      </Card>
      <Card title={t.bApp.myTimeOff}>
        {me.timeOff.length === 0 ? (
          <p className="text-sm text-paper/45">{t.barbers.noTimeOff}</p>
        ) : (
          <ul className="space-y-2">
            {me.timeOff.map((o) => (
              <li key={o.id} className="flex justify-between gap-3 rounded-xl border border-paper/[0.06] px-3 py-3 text-sm">
                <span>{o.reason}</span>
                <span className="tabular-nums text-paper/60">
                  {fmt.date(new Date(o.from), { day: 'numeric', month: 'short' })} – {fmt.date(new Date(o.to), { day: 'numeric', month: 'short' })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="flex gap-3 rounded-2xl border border-paper/[0.07] p-4 text-sm text-paper/60">
        <Info className="mt-0.5 size-4 shrink-0 text-[#8a6a33]" strokeWidth={1.5} />
        {t.bApp.hoursNote}
      </p>
    </div>
  )
}
