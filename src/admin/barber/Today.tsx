import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Ban, Check, Footprints, Phone, Scissors } from 'lucide-react'
import { useStore } from '../data/store'
import type { Appointment, AppointmentStatus, BarberRecord } from '../data/types'
import { addDays, endOf, hhmm, inRange, startOfDay, workMinutes } from '../data/select'
import { useAdminT } from '../i18n'
import { Avatar, StatusPill, ease, useAct, useNow } from '../ui'
import { AppointmentSheet } from '../appointments'

/** The barber's day: who is next, one big button for the next step, then the timeline. */
export function Today({ me }: { me: BarberRecord }) {
  const { t, fmt, pub } = useAdminT()
  const { data, session, setStatus } = useStore()
  const act = useAct()
  const [open, setOpen] = useState<Appointment | null>(null)
  const nowDate = useNow()
  const today = startOfDay(nowDate)
  const list = inRange(data.appointments, today, addDays(today, 1)).filter((a) => a.status !== 'cancelled')
  const done = list.filter((a) => a.status === 'completed').length
  const now = nowDate.getTime()
  const todayFocus = list.find((a) => a.status === 'in_chair') ?? list.find((a) => (a.status === 'arrived' || a.status === 'confirmed' || a.status === 'booked') && endOf(a).getTime() > now - 15 * 60000)
  // when today is done, show the next booking ahead instead of an empty card
  const later = todayFocus ? undefined : data.appointments.find((a) => new Date(a.start) >= addDays(today, 1) && (a.status === 'booked' || a.status === 'confirmed'))
  const focus = todayFocus ?? later
  const client = focus ? data.clients.find((c) => c.id === focus.clientId) : undefined
  const visitsWithMe = (clientId: string) => data.appointments.filter((a) => a.clientId === clientId && a.status === 'completed').length
  const first = session.name.split(' ')[0]

  const next: Partial<Record<AppointmentStatus, { to: AppointmentStatus; label: string; icon: typeof Check }>> = {
    booked: { to: 'arrived', label: t.bApp.arrived, icon: Footprints },
    confirmed: { to: 'arrived', label: t.bApp.arrived, icon: Footprints },
    arrived: { to: 'in_chair', label: t.bApp.start, icon: Scissors },
    in_chair: { to: 'completed', label: t.bApp.done, icon: Check },
  }

  return (
    <div>
      <div className="label text-paper/45">{fmt.date(today, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      <h1 className="display mt-2 text-[2.2rem]">
        {t.bApp.hello} <b>{first}</b>
      </h1>
      <p className="mt-1 text-sm text-paper/55">{t.bApp.dayLine(list.length, done)}</p>
      <div className="mt-4 h-1.5 rounded-full bg-white/[0.06]" aria-hidden>
        <motion.div className="h-1.5 rounded-full bg-[#d2b07a]" initial={false} animate={{ width: `${list.length ? (done / list.length) * 100 : 0}%` }} transition={{ duration: 0.8, ease }} />
      </div>

      {/* focus card */}
      <AnimatePresence mode="wait">
        {focus && client ? (
          <motion.section
            key={focus.id + focus.status}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45, ease }}
            className={`mt-6 overflow-hidden rounded-3xl border p-5 ${focus.status === 'in_chair' ? 'border-[#d2b07a]/60 bg-[linear-gradient(160deg,rgba(210,176,122,0.18),rgba(210,176,122,0.03))]' : 'border-white/10 bg-white/[0.03]'}`}
          >
            <div className="flex items-center justify-between">
              <span className="label text-[#d2b07a]">
                {later ? `${t.bApp.nextDay} · ${fmt.date(new Date(focus.start), { weekday: 'long', day: 'numeric', month: 'short' })}` : focus.status === 'in_chair' ? t.bApp.inChair : t.bApp.next}
              </span>
              <StatusPill status={focus.status} />
            </div>
            <div className="mt-4 flex items-center gap-4">
              <Avatar name={client.name} size={56} />
              <div className="min-w-0">
                <div className="truncate text-2xl font-semibold [font-stretch:115%]">{client.name}</div>
                <div className="text-sm text-paper/60">
                  {hhmm(focus.start)}–{hhmm(endOf(focus))} · {pub.services.items[focus.serviceId].name}
                </div>
                <div className="text-xs text-paper/45">{visitsWithMe(client.id) ? t.bApp.visitsWithYou(visitsWithMe(client.id)) : t.bApp.firstVisit}</div>
              </div>
            </div>
            {(client.notes || focus.note) && (
              <p className="mt-4 rounded-2xl bg-black/25 p-3 text-sm text-paper/85">
                <span className="label mr-2 text-paper/45">{t.bApp.notes}</span>
                {[focus.note, client.notes].filter(Boolean).join(' · ')}
              </p>
            )}
            <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
              {later && focus.status === 'booked' && (
                <button type="button" onClick={() => act(setStatus(focus.id, 'confirmed'))} className="flex h-16 items-center justify-center gap-2.5 rounded-2xl bg-[#d2b07a] text-lg font-semibold text-ink transition-transform active:scale-[0.98]">
                  <Check className="size-5" strokeWidth={2} /> {t.bApp.confirm}
                </button>
              )}
              {later && focus.status !== 'booked' && <span className="flex h-16 items-center justify-center rounded-2xl border border-white/10 text-sm text-paper/55">{t.status.confirmed}</span>}
              {!later && next[focus.status] && (
                <button
                  type="button"
                  onClick={() => act(setStatus(focus.id, next[focus.status]!.to))}
                  className="flex h-16 items-center justify-center gap-2.5 rounded-2xl bg-[#d2b07a] text-lg font-semibold text-ink transition-transform active:scale-[0.98]"
                >
                  {(() => {
                    const N = next[focus.status]!
                    return (
                      <>
                        <N.icon className="size-5" strokeWidth={2} /> {N.label}
                      </>
                    )
                  })()}
                </button>
              )}
              <a href={`tel:${client.phone.replace(/\s/g, '')}`} aria-label={`${t.bApp.call} ${client.name}`} className="grid size-16 place-items-center rounded-2xl border border-white/12 hover:border-white/30">
                <Phone className="size-5" strokeWidth={1.5} />
              </a>
              {!later && (focus.status === 'booked' || focus.status === 'confirmed' || focus.status === 'arrived') && (
                <button type="button" onClick={() => act(setStatus(focus.id, 'no_show'))} className="col-span-2 flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 text-sm text-paper/65 hover:border-[#d97a93]/50 hover:text-[#efb0c0]">
                  <Ban className="size-4" strokeWidth={1.5} /> {t.bApp.noShow}
                </button>
              )}
            </div>
          </motion.section>
        ) : (
          <motion.p key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 rounded-3xl border border-dashed border-white/10 p-8 text-center text-paper/55">
            {workMinutes(me, today) ? t.bApp.noneLeft : t.bApp.off}
          </motion.p>
        )}
      </AnimatePresence>

      {/* timeline */}
      {list.length > 0 && (
        <section className="mt-8">
          <h2 className="label mb-3 text-paper/45">{t.bApp.timeline}</h2>
          <ol className="relative space-y-2 border-l border-white/[0.08] pl-5">
            {list.map((a) => {
              const c = data.clients.find((x) => x.id === a.clientId)
              const isFocus = focus?.id === a.id
              return (
                <li key={a.id} className="relative">
                  <span className={`absolute -left-[26px] top-5 size-2.5 rounded-full ring-4 ring-ink ${a.status === 'completed' ? 'bg-[#55b386]' : isFocus ? 'bg-[#d2b07a]' : 'bg-white/25'}`} />
                  <button type="button" onClick={() => setOpen(a)} className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors ${isFocus ? 'border-[#d2b07a]/40 bg-white/[0.04]' : 'border-white/[0.07] bg-white/[0.02] hover:border-white/20'} ${a.status === 'completed' || a.status === 'no_show' ? 'opacity-60' : ''}`}>
                    <span className="w-12 shrink-0 font-semibold tabular-nums">{hhmm(a.start)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{c?.name}</span>
                      <span className="block truncate text-xs text-paper/50">
                        {pub.services.items[a.serviceId].name} · {a.duration} {t.common.min}
                      </span>
                    </span>
                    <StatusPill status={a.status} />
                  </button>
                </li>
              )
            })}
          </ol>
        </section>
      )}
      <AppointmentSheet appt={open} onClose={() => setOpen(null)} />
    </div>
  )
}
