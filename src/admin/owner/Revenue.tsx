import { useMemo, useState } from 'react'
import { plans } from '../../data/content'
import { useStore } from '../data/store'
import type { PayMethod } from '../data/types'
import { addDays, inRange, pctChange, revenueOf, startOfDay, startOfWeek } from '../data/select'
import { useAdminT } from '../i18n'
import { BarberAvatar, Card, Kpi, PageHeader, Segmented } from '../ui'
import { AreaChart, BarList, Columns, SegmentBar } from '../charts'

type Period = 'day' | 'week' | 'month'

export function Revenue() {
  const { t, fmt, pub, money } = useAdminT()
  const { data } = useStore()
  const [period, setPeriod] = useState<Period>('day')
  const today = startOfDay(new Date())

  const r = useMemo(() => {
    let from: Date
    let to = addDays(today, 1)
    let prevFrom: Date
    let series: { label: string; short: string; value: number }[]
    if (period === 'day') {
      from = addDays(today, -13)
      prevFrom = addDays(from, -14)
      series = Array.from({ length: 14 }, (_, i) => {
        const d = addDays(from, i)
        return { label: fmt.date(d, { weekday: 'long', day: 'numeric', month: 'long' }), short: fmt.date(d, { day: 'numeric', month: 'short' }), value: revenueOf(inRange(data.appointments, d, addDays(d, 1))) }
      })
    } else if (period === 'week') {
      const w0 = addDays(startOfWeek(today), -49)
      from = w0
      to = addDays(startOfWeek(today), 7)
      prevFrom = addDays(from, -56)
      series = Array.from({ length: 8 }, (_, i) => {
        const d = addDays(w0, i * 7)
        return { label: `${fmt.date(d, { day: 'numeric', month: 'short' })} – ${fmt.date(addDays(d, 6), { day: 'numeric', month: 'short' })}`, short: fmt.date(d, { day: 'numeric', month: 'short' }), value: revenueOf(inRange(data.appointments, d, addDays(d, 7))) }
      })
    } else {
      const m0 = new Date(today.getFullYear(), today.getMonth() - 2, 1)
      from = m0
      prevFrom = new Date(today.getFullYear(), today.getMonth() - 4, 1)
      series = Array.from({ length: 3 }, (_, i) => {
        const a = new Date(m0.getFullYear(), m0.getMonth() + i, 1)
        const b = new Date(m0.getFullYear(), m0.getMonth() + i + 1, 1)
        return { label: fmt.date(a, { month: 'long', year: 'numeric' }), short: fmt.date(a, { month: 'short' }), value: revenueOf(inRange(data.appointments, a, b < to ? b : to)) }
      })
    }
    const list = inRange(data.appointments, from, to)
    const prev = inRange(data.appointments, prevFrom, from)
    const done = list.filter((a) => a.status === 'completed')
    const total = revenueOf(list)
    const byService = new Map<string, number>()
    const byBarber = new Map<string, number>()
    const byMethod = new Map<PayMethod, number>()
    for (const a of done) {
      byService.set(a.serviceId, (byService.get(a.serviceId) ?? 0) + a.price)
      byBarber.set(a.barberId, (byBarber.get(a.barberId) ?? 0) + a.price)
      if (a.paidWith) byMethod.set(a.paidWith, (byMethod.get(a.paidWith) ?? 0) + a.price)
    }
    return {
      series,
      total,
      prevTotal: revenueOf(prev),
      count: done.length,
      prevCount: prev.filter((a) => a.status === 'completed').length,
      avg: done.length ? total / done.length : 0,
      lost: list.filter((a) => a.status === 'no_show').reduce((s, a) => s + a.price, 0),
      byService: [...byService.entries()].sort((a, b) => b[1] - a[1]),
      byBarber: [...byBarber.entries()].sort((a, b) => b[1] - a[1]),
      byMethod: (['card', 'cash', 'membership', 'gift_card'] as PayMethod[]).map((m) => ({ label: t.pay[m], value: byMethod.get(m) ?? 0 })),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, period, fmt, t])

  const giftSales = data.giftCards.filter((g) => g.payment === 'paid' && new Date(g.createdAt) >= addDays(today, -60)).reduce((s, g) => s + g.amount, 0)
  const mrr = data.memberships
    .filter((m) => m.status === 'active' || m.status === 'past_due')
    .reduce((s, m) => s + (plans.find((p) => p.id === m.planId)!.monthly * (m.billing === 'annual' ? 0.85 : 1)), 0)

  return (
    <>
      <PageHeader
        title={<b>{t.revenue.title}</b>}
        intro={t.revenue.intro}
        actions={
          <Segmented
            label={t.revenue.title}
            value={period}
            onChange={setPeriod}
            options={[
              { id: 'day', label: t.common.day },
              { id: 'week', label: t.common.week },
              { id: 'month', label: t.common.month },
            ]}
          />
        }
      />
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <Kpi accent label={t.revenue.total} value={money(r.total)} delta={pctChange(r.total, r.prevTotal)} />
        <Kpi label={t.revenue.avgTicket} value={money(r.avg, 0)} />
        <Kpi label={t.revenue.completed} value={fmt.number(r.count)} delta={pctChange(r.count, r.prevCount)} />
        <Kpi label={t.revenue.noShowLoss} value={money(r.lost)} />
      </div>

      <Card title={t.revenue.trend} className="mt-4 md:mt-6">
        {period === 'month' ? <Columns data={r.series} format={(n) => money(n)} caption={t.revenue.trend} height={220} /> : <AreaChart data={r.series} format={(n) => money(n)} caption={t.revenue.trend} height={240} />}
      </Card>

      <div className="mt-4 grid gap-4 md:mt-6 md:gap-6 lg:grid-cols-3">
        <Card title={t.revenue.byService}>
          <BarList caption={t.revenue.byService} format={(n) => money(n)} items={r.byService.slice(0, 7).map(([id, v]) => ({ key: id, label: pub.services.items[id as keyof typeof pub.services.items].name, value: v }))} />
        </Card>
        <Card title={t.revenue.byBarber}>
          <BarList
            caption={t.revenue.byBarber}
            format={(n) => money(n)}
            items={r.byBarber.map(([id, v]) => {
              const b = data.barbers.find((x) => x.id === id)!
              return {
                key: id,
                label: (
                  <span className="flex items-center gap-2">
                    <BarberAvatar image={b.image} name={b.name} size={20} /> {b.name}
                  </span>
                ),
                value: v,
              }
            })}
          />
        </Card>
        <div className="space-y-4 md:space-y-6">
          <Card title={t.revenue.byMethod}>
            <SegmentBar items={r.byMethod} format={(n) => money(n)} caption={t.revenue.byMethod} />
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <Kpi label={t.revenue.giftSales} value={money(giftSales)} hint="60d" />
            <Kpi label={t.revenue.membershipMrr} value={money(mrr)} />
          </div>
        </div>
      </div>
    </>
  )
}
