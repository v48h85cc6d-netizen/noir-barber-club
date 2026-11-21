import { useState } from 'react'
import { plans } from '../../data/content'
import { useStore } from '../data/store'
import type { MembershipStatus } from '../data/types'
import { useAdminT } from '../i18n'
import { Avatar, Btn, Card, Kpi, PageHeader, Segmented, Tag, useAct } from '../ui'

export function Memberships() {
  const { t, fmt, pub, money } = useAdminT()
  const { data, setMembershipStatus } = useStore()
  const act = useAct()
  const [filter, setFilter] = useState<'all' | MembershipStatus>('all')
  const tone = { active: 'good', paused: 'neutral', past_due: 'warn', cancelled: 'bad' } as const
  const monthly = (planId: string, billing: string) => plans.find((p) => p.id === planId)!.monthly * (billing === 'annual' ? 0.85 : 1)
  const live = data.memberships.filter((m) => m.status === 'active' || m.status === 'past_due')
  const list = data.memberships.filter((m) => filter === 'all' || m.status === filter)

  return (
    <>
      <PageHeader title={<b>{t.members.title}</b>} intro={t.members.intro} />
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => {
          const n = live.filter((m) => m.planId === p.id).length
          return (
            <div key={p.id} className={`relative overflow-hidden rounded-2xl border p-5 md:p-6 ${p.featured ? 'border-[#d2b07a]/50 bg-[linear-gradient(160deg,rgba(210,176,122,0.14),rgba(210,176,122,0.02))]' : 'border-paper/[0.07] bg-white/60'}`}>
              <div className="label text-paper/50">{p.name}</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-semibold tabular-nums [font-stretch:118%]">{money(p.monthly)}</span>
                <span className="text-sm text-paper/45">{t.common.perMonth}</span>
              </div>
              <p className="mt-2 text-sm text-paper/60">{pub.membership.plans[p.id].tagline}</p>
              <div className="mt-5 flex items-end justify-between border-t border-paper/[0.07] pt-4">
                <span className="text-sm text-paper/55">{t.members.members(n)}</span>
                <span className="tabular-nums">{money(live.filter((m) => m.planId === p.id).reduce((s, m) => s + monthly(m.planId, m.billing), 0))}</span>
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:mt-6 md:max-w-xl">
        <Kpi accent label={t.members.mrr} value={money(live.reduce((s, m) => s + monthly(m.planId, m.billing), 0))} />
        <Kpi label={t.members.activeCount} value={data.memberships.filter((m) => m.status === 'active').length} />
      </div>

      <div className="mb-4 mt-8 overflow-x-auto">
        <Segmented
          label={t.members.statusLabel}
          value={filter}
          onChange={setFilter}
          options={[{ id: 'all', label: t.common.all }, ...(['active', 'paused', 'past_due', 'cancelled'] as const).map((s) => ({ id: s, label: t.members.status[s] }))]}
        />
      </div>
      <Card pad={false}>
        <ul className="divide-y divide-paper/[0.05]">
          {list.map((m) => {
            const c = data.clients.find((x) => x.id === m.clientId)!
            const plan = plans.find((p) => p.id === m.planId)!
            return (
              <li key={m.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-4 md:grid-cols-[auto_1.4fr_0.8fr_1fr_1fr_auto] md:px-6">
                <Avatar name={c.name} size={36} />
                <div className="min-w-0">
                  <div className="truncate font-medium">{c.name}</div>
                  <div className="text-xs text-paper/45">
                    {t.members.since} {fmt.date(new Date(m.since), { month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <span className="justify-self-end md:justify-self-start">
                  <Tag tone={tone[m.status]}>{t.members.status[m.status]}</Tag>
                </span>
                <div className="col-start-2 text-sm md:col-start-auto">
                  {plan.name} · <span className="text-paper/55">{m.billing === 'annual' ? t.members.annual : t.members.monthly}</span>
                </div>
                <div className="col-start-2 text-sm text-paper/55 md:col-start-auto">
                  {t.members.renews} {fmt.date(new Date(m.renews), { day: 'numeric', month: 'short' })} · {m.visitsThisMonth} {t.members.visits.toLowerCase()}
                </div>
                <div className="col-span-3 flex flex-wrap gap-2 md:col-span-1 md:justify-end">
                  {m.status === 'active' && (
                    <Btn size="sm" onClick={() => act(setMembershipStatus(m.id, 'paused'))}>
                      {t.members.pause}
                    </Btn>
                  )}
                  {(m.status === 'paused' || m.status === 'past_due') && (
                    <Btn size="sm" tone="gold" onClick={() => act(setMembershipStatus(m.id, 'active'))}>
                      {t.members.resume}
                    </Btn>
                  )}
                  {m.status !== 'cancelled' && (
                    <Btn size="sm" tone="danger" onClick={() => act(setMembershipStatus(m.id, 'cancelled'))}>
                      {t.members.cancel}
                    </Btn>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </Card>
    </>
  )
}
