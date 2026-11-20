import { useMemo } from 'react'
import { useStore } from '../data/store'
import { addDays, inRange, startOfDay, startOfWeek, toMin, workMinutes } from '../data/select'
import { useAdminT } from '../i18n'
import { Card, Kpi, PageHeader, useNow } from '../ui'
import { BarList, Columns, Heatmap } from '../charts'

const DAYS = [1, 2, 3, 4, 5, 6, 0]

export function Reports() {
  const { t, fmt, pub } = useAdminT()
  const { data } = useStore()
  const now = useNow()

  const r = useMemo(() => {
    const today = startOfDay(now)
    const from = addDays(today, -56)
    const past = inRange(data.appointments, from, today)
    const n = past.length || 1
    const visits = new Map<string, number>()
    for (const a of past) if (a.status === 'completed') visits.set(a.clientId, (visits.get(a.clientId) ?? 0) + 1)
    const seen = [...visits.values()]
    // heatmap: booked minutes ÷ working minutes per weekday-hour
    const hoursAxis = Array.from({ length: 12 }, (_, i) => 9 + i)
    const booked = DAYS.map(() => hoursAxis.map(() => 0))
    const avail = DAYS.map(() => hoursAxis.map(() => 0))
    for (let d = from; d < today; d = addDays(d, 1)) {
      const di = DAYS.indexOf(d.getDay())
      for (const b of data.barbers) {
        if (!workMinutes(b, d)) continue
        const h = b.hours[d.getDay()]!
        hoursAxis.forEach((hr, hi) => {
          const s = Math.max(toMin(h.start), hr * 60)
          const e = Math.min(toMin(h.end), hr * 60 + 60)
          if (e > s) avail[di][hi] += e - s
        })
      }
    }
    for (const a of past) {
      if (a.status === 'cancelled' || a.status === 'no_show') continue
      const s = new Date(a.start)
      const di = DAYS.indexOf(s.getDay())
      let m = s.getHours() * 60 + s.getMinutes()
      const end = m + a.duration
      while (m < end) {
        const hi = Math.floor(m / 60) - 9
        const next = Math.min(end, (Math.floor(m / 60) + 1) * 60)
        if (hi >= 0 && hi < hoursAxis.length) booked[di][hi] += next - m
        m = next
      }
    }
    const heat = booked.map((row, i) => row.map((v, j) => (avail[i][j] ? Math.min(1, v / avail[i][j]) : 0)))
    const w0 = addDays(startOfWeek(today), -49)
    const weekly = Array.from({ length: 8 }, (_, i) => {
      const d = addDays(w0, i * 7)
      return { label: `${fmt.date(d, { day: 'numeric', month: 'short' })} – ${fmt.date(addDays(d, 6), { day: 'numeric', month: 'short' })}`, short: fmt.date(d, { day: 'numeric', month: 'short' }), value: inRange(data.appointments, d, addDays(d, 7)).filter((a) => a.status !== 'cancelled').length }
    })
    const count = new Map<string, number>()
    for (const a of past) if (a.status === 'completed') count.set(a.serviceId, (count.get(a.serviceId) ?? 0) + 1)
    return {
      noShow: past.filter((a) => a.status === 'no_show').length / n,
      cancel: past.filter((a) => a.status === 'cancelled').length / n,
      online: past.filter((a) => a.source === 'online').length / n,
      retention: seen.length ? seen.filter((v) => v >= 2).length / seen.length : 0,
      heat,
      hoursAxis,
      weekly,
      top: [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
    }
  }, [data, fmt, now])

  const pct = (v: number) => `${fmt.number(v * 100, { maximumFractionDigits: 1 })}%`
  return (
    <>
      <PageHeader title={<b>{t.reports.title}</b>} intro={t.reports.intro} />
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <Kpi label={t.reports.noShowRate} value={pct(r.noShow)} />
        <Kpi label={t.reports.cancelRate} value={pct(r.cancel)} />
        <Kpi accent label={t.reports.online} value={pct(r.online)} />
        <Kpi label={t.reports.retention} value={pct(r.retention)} />
      </div>
      <Card title={t.reports.heatmap} className="mt-4 md:mt-6" aside={<span className="hidden text-xs text-paper/40 md:block">{t.reports.heatmapNote}</span>}>
        <Heatmap
          caption={t.reports.heatmap}
          rows={DAYS.map((d) => fmt.weekday(new Date(2024, 0, 7 + d), 'short'))}
          cols={r.hoursAxis.map((h) => `${String(h).padStart(2, '0')}:00`)}
          values={r.heat}
          format={pct}
          lowLabel={t.reports.low}
          highLabel={t.reports.high}
        />
      </Card>
      <div className="mt-4 grid gap-4 md:mt-6 md:gap-6 lg:grid-cols-2">
        <Card title={t.reports.weekly}>
          <Columns data={r.weekly} caption={t.reports.weekly} height={200} />
        </Card>
        <Card title={t.reports.topServices}>
          <BarList caption={t.reports.topServices} format={(n) => fmt.number(n)} items={r.top.map(([id, v]) => ({ key: id, label: pub.services.items[id as keyof typeof pub.services.items].name, value: v }))} />
        </Card>
      </div>
    </>
  )
}
