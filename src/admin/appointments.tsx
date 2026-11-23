import { useEffect, useRef } from 'react'
import { Phone } from 'lucide-react'
import { barberOptions, useStore } from './data/store'
import type { Appointment, AppointmentStatus, BarberId, PayMethod } from './data/types'
import { endOf, hhmm, sameDay, toMin, workMinutes } from './data/select'
import { useAdminT } from './i18n'
import { BarberAvatar, Select, Sheet, StatusPill, Tag, useAct, useNow } from './ui'

const ALL: AppointmentStatus[] = ['booked', 'confirmed', 'arrived', 'in_chair', 'completed', 'no_show', 'cancelled']

/** Block colours for the day board, by status (label is always shown too). */
export const BLOCK: Record<AppointmentStatus, string> = {
  booked: 'border-paper/12 bg-white/90 text-paper/85 shadow-[0_2px_6px_-3px_rgba(31,30,28,0.15)]',
  confirmed: 'border-[#3f74b8]/30 bg-[#eaf1fa] text-[#1f3f6b]',
  arrived: 'border-[#b8935a]/45 bg-[#f6ecdb] text-[#5c4420]',
  in_chair: 'border-[#c9a46b] bg-[#d2b07a] text-[#1f1e1c] shadow-[0_6px_14px_-8px_rgba(168,128,63,0.8)]',
  completed: 'border-[#2f8f62]/25 bg-[#e8f4ee] text-[#1f5a3d]',
  no_show: 'border-[#b84a66]/25 bg-[#f8eaee] text-[#7d2c42]',
  cancelled: 'border-paper/8 bg-transparent text-paper/40 line-through',
}

export function AppointmentSheet({ appt, onClose }: { appt: Appointment | null; onClose: () => void }) {
  const { t, pub, money, fmt } = useAdminT()
  const { data, session, setStatus, reassign, recordPayment } = useStore()
  const act = useAct()
  const a = appt ? (data.appointments.find((x) => x.id === appt.id) ?? appt) : null
  const client = a ? data.clients.find((c) => c.id === a.clientId) : undefined
  const barber = a ? data.barbers.find((b) => b.id === a.barberId) : undefined
  const isOwner = session.role === 'owner'
  // barbers get only the moves the booking rules allow right now; the owner can correct anything
  const options = a ? (isOwner ? ALL.filter((s) => s !== a.status) : barberOptions(a)) : []
  const history = a ? data.appointments.filter((x) => x.clientId === a.clientId && x.status === 'completed' && x.id !== a.id && (isOwner || x.barberId === session.barberId)) : []

  return (
    <Sheet open={!!a} onClose={onClose} title={client?.name ?? ''}>
      {a && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={a.status} size="md" />
            <Tag>{t.source[a.source]}</Tag>
            {a.paidWith && <Tag tone="good">{t.pay[a.paidWith]}</Tag>}
            {a.ref && <Tag tone="gold">{a.ref}</Tag>}
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
            <div>
              <dt className="label text-paper/45">{t.appts.time}</dt>
              <dd className="mt-1 tabular-nums">
                {fmt.date(new Date(a.start), { weekday: 'short', day: 'numeric', month: 'short' })} · {hhmm(a.start)}–{hhmm(endOf(a))}
              </dd>
            </div>
            <div>
              <dt className="label text-paper/45">{t.appts.service}</dt>
              <dd className="mt-1">
                {pub.services.items[a.serviceId].name} · {money(a.price)}
              </dd>
            </div>
            <div>
              <dt className="label text-paper/45">{t.appts.barber}</dt>
              <dd className="mt-1 flex items-center gap-2">
                {barber && <BarberAvatar image={barber.image} name={barber.name} size={22} />}
                {barber?.name}
              </dd>
            </div>
            {client && (
              <div>
                <dt className="label text-paper/45">{t.clients.contact}</dt>
                <dd className="mt-1">
                  <a href={`tel:${client.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline">
                    <Phone className="size-3.5" strokeWidth={1.5} /> {client.phone}
                  </a>
                </dd>
              </div>
            )}
          </dl>
          {a.note && (
            <div className="rounded-xl border border-paper/[0.07] bg-white/60 p-3 text-sm">
              <span className="label mr-2 text-paper/45">{a.source === 'online' ? t.appts.customerNote : t.appts.note}</span>
              {a.note}
            </div>
          )}
          {client?.notes && (
            <div className="rounded-xl border border-[#d2b07a]/25 bg-[#d2b07a]/[0.06] p-3 text-sm text-paper/85">
              <span className="label mr-2 text-[#8a6a33]">{t.clients.notes}</span>
              {client.notes}
            </div>
          )}

          {options.length > 0 && (
            <div>
              <div className="label mb-2 text-paper/45">{t.appts.changeStatus}</div>
              <div className="flex flex-wrap gap-2">
                {options.map((s) => (
                  <button key={s} type="button" onClick={() => act(setStatus(a.id, s))} className="rounded-full transition-transform hover:-translate-y-0.5">
                    <StatusPill status={s} size="md" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {a.status === 'cancelled' && a.cancelledBy && (
            <p className="text-sm text-paper/55">
              {t.appts.cancelledBy}: {a.cancelledBy === 'customer' ? t.common.customer : a.cancelledBy === 'owner' ? t.common.owner : t.common.barber}
            </p>
          )}

          {isOwner && a.status !== 'cancelled' && a.status !== 'no_show' && (
            <div>
              <div className="label mb-2 text-paper/45">{t.appts.recordPayment}</div>
              <Select value={a.paidWith ?? ''} label={t.appts.recordPayment} onChange={(v) => v && act(recordPayment(a.id, v as PayMethod))}>
                <option value="" disabled>
                  {t.appts.notPaid}
                </option>
                {(['card', 'cash', 'gift_card', 'membership'] as const).map((m) => (
                  <option key={m} value={m}>
                    {t.pay[m]}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {isOwner && (
            <div>
              <div className="label mb-2 text-paper/45">{t.appts.reassign}</div>
              <Select value={a.barberId} label={t.appts.reassign} onChange={(v) => act(reassign(a.id, v as BarberId))}>
                {data.barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {history.length > 0 && (
            <div>
              <div className="label mb-2 text-paper/45">{t.clients.history}</div>
              <ul className="divide-y divide-paper/[0.06] text-sm">
                {history.slice(-5).reverse().map((h) => (
                  <li key={h.id} className="flex justify-between gap-3 py-2">
                    <span className="text-paper/70">{fmt.date(new Date(h.start), { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span>{pub.services.items[h.serviceId].name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Sheet>
  )
}

/** Barber lanes on a time axis for one day. */
export function DayBoard({ date, barberIds, onOpen }: { date: Date; barberIds?: BarberId[]; onOpen: (a: Appointment) => void }) {
  const { t, pub } = useAdminT()
  const { data } = useStore()
  const scroller = useRef<HTMLDivElement>(null)
  const now = useNow()
  const lanes = data.barbers.filter((b) => !barberIds || barberIds.includes(b.id))
  const dayHours = lanes.map((b) => b.hours[date.getDay()]).filter(Boolean) as { start: string; end: string }[]
  const open = dayHours.length ? Math.min(...dayHours.map((h) => toMin(h.start))) : 0
  const close = dayHours.length ? Math.max(...dayHours.map((h) => toMin(h.end))) : 0
  const span = close - open
  const pxPerMin = 2.2
  const width = span * pxPerMin
  const hours = Array.from({ length: Math.floor(span / 60) + 1 }, (_, i) => open + i * 60)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const showNow = sameDay(now, date) && nowMin >= open && nowMin <= close

  const dayKey = date.toDateString()
  useEffect(() => {
    if (showNow && scroller.current) scroller.current.scrollLeft = Math.max(0, (nowMin - open) * pxPerMin - 120)
    // only re-centre when the day changes, not every minute
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey])

  if (!dayHours.length) return <div className="rounded-2xl border border-dashed border-paper/15 bg-white/40 px-6 py-10 text-center text-sm text-paper/50">{t.appts.closed}</div>

  return (
    <div className="flex min-w-0">
      <div className="w-28 shrink-0 pt-7 sm:w-36 md:w-44">
        {lanes.map((b) => (
          <div key={b.id} className="flex h-[76px] items-center gap-2.5 pr-3">
            <BarberAvatar image={b.image} name={b.name} size={32} />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{b.name.split(' ')[0]}</div>
              <div className="text-xs text-paper/45">
                {b.hours[date.getDay()] && workMinutes(b, date) ? `${b.hours[date.getDay()]!.start}–${b.hours[date.getDay()]!.end}` : t.appts.off}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div ref={scroller} className="cc-scroll relative min-w-0 flex-1 overflow-x-auto pb-1">
        <div className="relative" style={{ width }}>
          <div className="relative h-7">
            {hours.map((m, i) => (
              <span key={m} className={`absolute font-mono text-[10px] text-paper/40 ${i === 0 ? '' : i === hours.length - 1 ? '-translate-x-full' : '-translate-x-1/2'}`} style={{ left: (m - open) * pxPerMin }}>
                {String(Math.floor(m / 60)).padStart(2, '0')}:00
              </span>
            ))}
          </div>
          {hours.map((m) => (
            <span key={m} aria-hidden className="absolute bottom-0 top-7 w-px bg-paper/[0.05]" style={{ left: (m - open) * pxPerMin }} />
          ))}
          {lanes.map((b) => {
            const h = b.hours[date.getDay()]
            const working = h && workMinutes(b, date) > 0
            const list = data.appointments.filter((a) => a.barberId === b.id && sameDay(new Date(a.start), date))
            return (
              <div key={b.id} className="relative h-[76px] border-t border-paper/[0.05]">
                {!working ? (
                  <div className="absolute inset-y-2 left-0 right-0 rounded-lg bg-[repeating-linear-gradient(135deg,rgba(31,30,28,0.045)_0_6px,transparent_6px_12px)]" />
                ) : (
                  <>
                    {toMin(h!.start) > open && <div className="absolute inset-y-2 left-0 rounded-lg bg-[repeating-linear-gradient(135deg,rgba(31,30,28,0.045)_0_6px,transparent_6px_12px)]" style={{ width: (toMin(h!.start) - open) * pxPerMin }} />}
                    {toMin(h!.end) < close && <div className="absolute inset-y-2 right-0 rounded-lg bg-[repeating-linear-gradient(135deg,rgba(31,30,28,0.045)_0_6px,transparent_6px_12px)]" style={{ width: (close - toMin(h!.end)) * pxPerMin }} />}
                  </>
                )}
                {list.map((a) => {
                  const s = new Date(a.start)
                  const left = (s.getHours() * 60 + s.getMinutes() - open) * pxPerMin
                  const client = data.clients.find((c) => c.id === a.clientId)
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onOpen(a)}
                      title={`${hhmm(a.start)} · ${client?.name} · ${pub.services.items[a.serviceId].name} · ${t.status[a.status]}`}
                      className={`absolute inset-y-2 overflow-hidden rounded-lg border px-2 py-1.5 text-left transition-[transform,box-shadow] hover:z-10 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-12px_rgba(31,30,28,0.45)] ${BLOCK[a.status]}`}
                      style={{ left: left + 1, width: a.duration * pxPerMin - 3 }}
                    >
                      <span className="block truncate text-[0.72rem] font-semibold leading-tight">{client?.name.split(' ')[0]}</span>
                      <span className="block truncate text-[0.68rem] leading-tight opacity-75">{pub.services.items[a.serviceId].name}</span>
                      <span className="mt-0.5 block truncate font-mono text-[0.6rem] opacity-60">{hhmm(a.start)}</span>
                    </button>
                  )
                })}
              </div>
            )
          })}
          {showNow && (
            <div aria-hidden className="pointer-events-none absolute bottom-0 top-5 z-20 w-px bg-[#a5803f]" style={{ left: (nowMin - open) * pxPerMin }}>
              <span className="absolute -left-[3px] -top-1 size-[7px] rounded-full bg-[#a5803f]" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
