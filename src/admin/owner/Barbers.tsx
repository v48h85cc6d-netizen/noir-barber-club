import { useState } from 'react'
import { Plus, UserPlus } from 'lucide-react'
import { Img } from '../../components/Img'
import { useStore } from '../data/store'
import type { BarberId } from '../data/types'
import { addDays, inRange, isLive, startOfWeek, toMin, workMinutes } from '../data/select'
import { useAdminT } from '../i18n'
import { Btn, Card, Field, PageHeader, Sheet, Switch, Tag, inputCls, useAct, useNow } from '../ui'

const ORDER = [1, 2, 3, 4, 5, 6, 0]

export function Barbers() {
  const { t, fmt, pub } = useAdminT()
  const { data, setBarberActive, setBarberHours, addTimeOff, inviteBarber } = useStore()
  const act = useAct()
  const [openId, setOpenId] = useState<BarberId | null>(null)
  const [invite, setInvite] = useState(false)
  const [inv, setInv] = useState({ name: '', email: '' })
  const [off, setOff] = useState({ from: '', to: '', reason: '' })
  const wk = startOfWeek(useNow())
  const b = data.barbers.find((x) => x.id === openId)
  const weekday = (d: number) => fmt.weekday(new Date(2024, 0, 7 + d), 'long')

  return (
    <>
      <PageHeader
        title={<b>{t.barbers.title}</b>}
        intro={t.barbers.intro}
        actions={
          <Btn tone="gold" onClick={() => setInvite(true)}>
            <UserPlus className="size-4" strokeWidth={1.75} /> {t.barbers.invite}
          </Btn>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.barbers.map((x) => {
          const week = inRange(data.appointments, wk, addDays(wk, 7)).filter((a) => a.barberId === x.id && isLive(a))
          const avail = Array.from({ length: 7 }, (_, i) => workMinutes(x, addDays(wk, i))).reduce((a, c) => a + c, 0)
          const booked = week.reduce((s, a) => s + a.duration, 0)
          return (
            <button key={x.id} type="button" onClick={() => setOpenId(x.id)} className="group overflow-hidden rounded-2xl border border-paper/[0.07] bg-white/60 text-left transition-[border-color,transform] hover:-translate-y-0.5 hover:border-[#d2b07a]/40">
              <div className="relative aspect-[4/3] overflow-hidden">
                <Img id={x.image} alt={x.name} sizes="(min-width:1280px) 25vw, 50vw" maxWidth={768} className="h-full w-full" imgClassName={`transition-transform duration-700 group-hover:scale-105 ${x.active ? '' : 'opacity-40'}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2 text-white">
                  <div className="min-w-0">
                    <div className="truncate text-lg font-semibold [font-stretch:115%]">{x.name}</div>
                    <div className="label truncate text-white/70">
                      {x.years} {pub.common.yrs} · {pub.barbers.people[x.id].specialty}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/90 backdrop-blur">
                    <Tag tone={x.active ? 'good' : 'bad'}>{x.active ? t.barbers.active : t.barbers.inactive}</Tag>
                  </span>
                </div>
              </div>
              <div className="p-4">
                <div className="label flex justify-between text-paper/45">
                  <span>{t.barbers.weekLoad}</span>
                  <span className="tabular-nums text-paper/70">{avail ? Math.round((booked / avail) * 100) : 0}%</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-paper/[0.06]">
                  <div className="h-1.5 rounded-full bg-[#d2b07a]" style={{ width: `${avail ? Math.min(100, (booked / avail) * 100) : 0}%` }} />
                </div>
                <div className="mt-3 grid grid-cols-7 gap-1">
                  {ORDER.map((d) => (
                    <span key={d} className={`grid h-6 place-items-center rounded-md text-[0.65rem] ${x.hours[d] ? 'bg-paper/[0.07] text-paper/80' : 'text-paper/25 line-through'}`}>
                      {fmt.weekday(new Date(2024, 0, 7 + d), 'short').slice(0, 2)}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <Card title={t.barbers.accounts} className="mt-6">
        <ul className="divide-y divide-paper/[0.05]">
          {data.staff.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm">
              <span className="min-w-40 flex-1 font-medium">{s.name}</span>
              <span className="min-w-56 flex-1 text-paper/55">{s.email}</span>
              <span className="w-24">{s.role === 'owner' ? <Tag tone="gold">{t.common.owner}</Tag> : <Tag>{t.common.barber}</Tag>}</span>
              <span className="w-40">{!s.barberId && !s.active ? <Tag tone="warn">{t.barbers.invited}</Tag> : s.active ? <Tag tone="good">{t.barbers.active}</Tag> : <Tag tone="bad">{t.barbers.inactive}</Tag>}</span>
              <span className="w-32 text-xs text-paper/40">{s.lastSeenAt ? fmt.date(new Date(s.lastSeenAt), { day: 'numeric', month: 'short' }) : '—'}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* barber detail */}
      <Sheet open={!!b} onClose={() => setOpenId(null)} title={b?.name ?? ''} wide>
        {b && (
          <div className="space-y-8">
            <section>
              <div className="label mb-3 text-paper/45">{t.barbers.account}</div>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-paper/[0.07] bg-white/60 p-4">
                <div className="text-sm">
                  <div>{b.email}</div>
                  <div className="text-paper/45">{b.phone}</div>
                </div>
                <Btn tone={b.active ? 'danger' : 'gold'} size="sm" onClick={() => act(setBarberActive(b.id, !b.active))}>
                  {b.active ? t.barbers.deactivate : t.barbers.activate}
                </Btn>
              </div>
            </section>

            <section>
              <div className="label mb-3 text-paper/45">{t.barbers.hours}</div>
              <ul className="space-y-2">
                {ORDER.map((d) => {
                  const h = b.hours[d]
                  return (
                    <li key={d} className="flex items-center gap-3 rounded-xl border border-paper/[0.06] px-3 py-2">
                      <Switch checked={!!h} label={weekday(d)} onChange={(on) => act(setBarberHours(b.id, d, on ? { start: '10:00', end: '19:00' } : null))} />
                      <span className="w-28 text-sm first-letter:uppercase">{weekday(d)}</span>
                      {h ? (
                        <span className="ml-auto flex items-center gap-1.5 text-sm">
                          <input type="time" step={900} value={h.start} aria-label={`${weekday(d)} ${t.common.from}`} onChange={(e) => toMin(e.target.value) < toMin(h.end) && act(setBarberHours(b.id, d, { ...h, start: e.target.value }))} className="rounded-lg border border-paper/10 bg-transparent px-2 py-1 tabular-nums [color-scheme:dark]" />
                          –
                          <input type="time" step={900} value={h.end} aria-label={`${weekday(d)} ${t.common.to}`} onChange={(e) => toMin(e.target.value) > toMin(h.start) && act(setBarberHours(b.id, d, { ...h, end: e.target.value }))} className="rounded-lg border border-paper/10 bg-transparent px-2 py-1 tabular-nums [color-scheme:dark]" />
                        </span>
                      ) : (
                        <span className="ml-auto text-sm text-paper/35">{t.barbers.off}</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>

            <section>
              <div className="label mb-3 text-paper/45">{t.barbers.timeOff}</div>
              {b.timeOff.length === 0 ? (
                <p className="text-sm text-paper/45">{t.barbers.noTimeOff}</p>
              ) : (
                <ul className="space-y-2">
                  {b.timeOff.map((o) => (
                    <li key={o.id} className="flex justify-between gap-3 rounded-xl border border-paper/[0.06] px-3 py-2.5 text-sm">
                      <span>{o.reason}</span>
                      <span className="tabular-nums text-paper/60">
                        {fmt.date(new Date(o.from), { day: 'numeric', month: 'short' })} – {fmt.date(new Date(o.to), { day: 'numeric', month: 'short' })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <form
                className="mt-4 grid grid-cols-2 gap-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (act(addTimeOff(b.id, off.from, off.to, off.reason || t.barbers.timeOff))) setOff({ from: '', to: '', reason: '' })
                }}
              >
                <Field label={t.common.from}>
                  <input type="date" required value={off.from} onChange={(e) => setOff({ ...off, from: e.target.value })} className={`${inputCls} [color-scheme:dark]`} />
                </Field>
                <Field label={t.common.to}>
                  <input type="date" required value={off.to} onChange={(e) => setOff({ ...off, to: e.target.value })} className={`${inputCls} [color-scheme:dark]`} />
                </Field>
                <div className="col-span-2">
                  <Field label={t.barbers.reason}>
                    <input value={off.reason} maxLength={60} onChange={(e) => setOff({ ...off, reason: e.target.value })} className={inputCls} />
                  </Field>
                </div>
                <Btn type="submit" className="col-span-2">
                  <Plus className="size-4" /> {t.barbers.addTimeOff}
                </Btn>
              </form>
            </section>

            <section className="flex items-center justify-between rounded-xl border border-paper/[0.06] p-4 text-sm">
              <span className="label text-paper/45">{t.barbers.commission}</span>
              <span className="tabular-nums">{b.commission ? `${fmt.number(b.commission * 100)}%` : '—'}</span>
            </section>
          </div>
        )}
      </Sheet>

      {/* invite */}
      <Sheet open={invite} onClose={() => setInvite(false)} title={t.barbers.inviteTitle}>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (act(inviteBarber(inv.name, inv.email))) {
              setInv({ name: '', email: '' })
              setInvite(false)
            }
          }}
        >
          <p className="text-sm leading-relaxed text-paper/60">{t.barbers.inviteNote}</p>
          <Field label={t.barbers.name}>
            <input required value={inv.name} maxLength={60} onChange={(e) => setInv({ ...inv, name: e.target.value })} className={inputCls} />
          </Field>
          <Field label={t.barbers.email}>
            <input required type="email" value={inv.email} maxLength={254} onChange={(e) => setInv({ ...inv, email: e.target.value })} className={inputCls} />
          </Field>
          <div className="flex items-center justify-between rounded-xl border border-paper/[0.06] px-4 py-3 text-sm">
            <span className="label text-paper/45">{t.barbers.role}</span>
            <Tag>{t.common.barber}</Tag>
          </div>
          <p className="text-xs text-[#8a6a33]/80">{t.barbers.inviteDemoNote}</p>
          <Btn type="submit" tone="gold" size="lg" className="w-full">
            {t.barbers.sendInvite}
          </Btn>
        </form>
      </Sheet>
    </>
  )
}
