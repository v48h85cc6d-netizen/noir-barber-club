import { useMemo, useState } from 'react'
import { Img } from '../../components/Img'
import { services as publicServices } from '../../data/content'
import { useStore } from '../data/store'
import { addDays, inRange, startOfDay } from '../data/select'
import { useAdminT } from '../i18n'
import { Card, PageHeader, Switch, useAct } from '../ui'

export function Services() {
  const { t, pub, money } = useAdminT()
  const { data, updateService } = useStore()
  const act = useAct()
  const [draft, setDraft] = useState<Record<string, { price: string; duration: string }>>({})
  const stats = useMemo(() => {
    const list = inRange(data.appointments, addDays(startOfDay(new Date()), -30), addDays(startOfDay(new Date()), 1)).filter((a) => a.status === 'completed')
    const m = new Map<string, { n: number; rev: number }>()
    for (const a of list) {
      const r = m.get(a.serviceId) ?? { n: 0, rev: 0 }
      r.n++
      r.rev += a.price
      m.set(a.serviceId, r)
    }
    return m
  }, [data.appointments])

  const cats = ['haircuts', 'beard', 'rituals'] as const
  return (
    <>
      <PageHeader title={<b>{t.services.title}</b>} intro={t.services.intro} />
      <div className="space-y-6">
        {cats.map((cat) => (
          <Card key={cat} title={pub.steps.categories[cat]} pad={false}>
            <ul className="divide-y divide-paper/[0.05]">
              {data.services
                .filter((s) => s.category === cat)
                .map((s) => {
                  const d = draft[s.id] ?? { price: String(s.price), duration: String(s.duration) }
                  const st = stats.get(s.id) ?? { n: 0, rev: 0 }
                  const commit = () => {
                    const price = Number(d.price)
                    const duration = Number(d.duration)
                    if (price !== s.price || duration !== s.duration) act(updateService(s.id, { price, duration }))
                    setDraft((x) => {
                      const { [s.id]: _, ...rest } = x
                      void _
                      return rest
                    })
                  }
                  return (
                    <li key={s.id} className={`grid grid-cols-[56px_1fr] items-center gap-x-4 gap-y-3 px-5 py-4 md:grid-cols-[56px_1.6fr_1fr_1fr_auto] md:px-6 ${s.active ? '' : 'opacity-50'}`}>
                      <Img id={publicServices.find((x) => x.id === s.id)!.image} alt="" sizes="56px" maxWidth={480} className="row-span-2 size-14 rounded-xl md:row-span-1" />
                      <div className="min-w-0">
                        <div className="font-semibold [font-stretch:112%]">{pub.services.items[s.id].name}</div>
                        <div className="line-clamp-1 text-xs text-paper/50">{pub.services.items[s.id].description}</div>
                      </div>
                      <div className="col-start-2 flex items-center gap-3 md:col-start-auto">
                        <label className="flex items-center gap-1.5 rounded-xl border border-paper/10 px-2.5 py-1.5 focus-within:border-[#d2b07a]/60">
                          <span className="text-paper/45">€</span>
                          <input
                            inputMode="numeric"
                            aria-label={`${t.services.price} ${pub.services.items[s.id].name}`}
                            value={d.price}
                            onChange={(e) => setDraft((x) => ({ ...x, [s.id]: { ...d, price: e.target.value.replace(/[^\d]/g, '').slice(0, 3) } }))}
                            onBlur={commit}
                            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                            className="w-10 bg-transparent font-semibold tabular-nums outline-none"
                          />
                        </label>
                        <label className="flex items-center gap-1.5 rounded-xl border border-paper/10 px-2.5 py-1.5 focus-within:border-[#d2b07a]/60">
                          <input
                            inputMode="numeric"
                            aria-label={`${t.services.duration} ${pub.services.items[s.id].name}`}
                            value={d.duration}
                            onChange={(e) => setDraft((x) => ({ ...x, [s.id]: { ...d, duration: e.target.value.replace(/[^\d]/g, '').slice(0, 3) } }))}
                            onBlur={commit}
                            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                            className="w-8 bg-transparent tabular-nums outline-none"
                          />
                          <span className="text-paper/45">{t.common.min}</span>
                        </label>
                      </div>
                      <div className="col-start-2 text-xs text-paper/55 md:col-start-auto">
                        <div>
                          {t.services.bookings30}: <span className="tabular-nums text-paper">{st.n}</span>
                        </div>
                        <div>
                          {t.services.revenue30}: <span className="tabular-nums text-paper">{money(st.rev)}</span>
                        </div>
                      </div>
                      <div className="col-start-2 flex items-center gap-2 md:col-start-auto">
                        <Switch checked={s.active} label={t.services.active} onChange={(v) => act(updateService(s.id, { active: v }))} />
                        <span className="text-xs text-paper/50">{s.active ? t.services.active : t.services.hidden}</span>
                      </div>
                    </li>
                  )
                })}
            </ul>
          </Card>
        ))}
      </div>
    </>
  )
}
