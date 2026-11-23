import { useState } from 'react'
import { CalendarPlus, ChevronRight, Phone } from 'lucide-react'
import type { AuthSession } from '../demo/auth'
import { cancelBooking, customerAppointments, customerCanCancel } from '../demo/bookings'
import { useDb } from '../demo/db'
import { site } from '../data/site'
import type { Appointment } from '../admin/data/types'
import { endOf, hhmm } from '../admin/data/select'
import { BarberAvatar, Btn, Card, Sheet, StatusPill, useNow, useToast } from '../admin/ui'
import { FormAlert } from '../admin/auth-ui'
import { useAccountT } from './i18n'
import { WELCOME_KEY } from './AuthPages'

/** The signed-in customer's own appointments — never anybody else's. */
export function MyAppointments({ session }: { session: AuthSession }) {
  const { a, pub, fmt } = useAccountT()
  const db = useDb()
  const toast = useToast()
  const now = useNow()
  const [openId, setOpenId] = useState<string | null>(null)
  const [welcome] = useState(() => {
    try {
      const w = sessionStorage.getItem(WELCOME_KEY)
      sessionStorage.removeItem(WELCOME_KEY)
      return w
    } catch {
      return null
    }
  })

  const mine = customerAppointments(db, session)
  const isUpcoming = (x: Appointment) => endOf(x).getTime() > now.getTime() && x.status !== 'cancelled' && x.status !== 'completed' && x.status !== 'no_show'
  const upcoming = mine.filter(isUpcoming).sort((x, y) => x.start.localeCompare(y.start))
  const history = mine.filter((x) => !isUpcoming(x))
  const open = mine.find((x) => x.id === openId) ?? null
  const barberOf = (x: Appointment) => db.barbers.find((b) => b.id === x.barberId)
  const newest = mine.reduce<Appointment | null>((m, x) => (!m || (x.createdAt ?? '') > (m.createdAt ?? '') ? x : m), null)

  const row = (x: Appointment) => {
    const b = barberOf(x)
    return (
      <li key={x.id}>
        <button
          type="button"
          onClick={() => setOpenId(x.id)}
          className="flex w-full min-w-0 items-center gap-3 rounded-2xl border border-paper/[0.07] bg-white/65 p-3.5 text-left transition-colors hover:border-paper/20 hover:bg-white sm:gap-4 sm:p-4"
        >
          <span className="w-14 shrink-0 text-center sm:w-16">
            <span className="label block text-[0.6rem] text-paper/45">{fmt.date(new Date(x.start), { month: 'short' })}</span>
            <span className="block text-2xl font-semibold tabular-nums [font-stretch:120%]">{new Date(x.start).getDate()}</span>
            <span className="block text-xs tabular-nums text-paper/55">{hhmm(x.start)}</span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold [font-stretch:110%]">{pub.services.items[x.serviceId as keyof typeof pub.services.items].name}</span>
            <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-paper/55">
              {b && <BarberAvatar image={b.image} name={b.name} size={18} />}
              <span className="truncate">{b?.name}</span>
            </span>
            <span className="label mt-1 block truncate text-[0.6rem] text-paper/40">{x.ref}</span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-1.5">
            <StatusPill status={x.status} />
            {newest?.id === x.id && isUpcoming(x) && <span className="label text-[0.6rem] text-[#8a6a33]">{a.appts.justBooked}</span>}
          </span>
          <ChevronRight className="hidden size-4 shrink-0 text-paper/30 sm:block" />
        </button>
      </li>
    )
  }

  return (
    <>
      {welcome && (
        <div className="mb-5">
          <FormAlert tone="ok">{a.auth.registered(welcome)}</FormAlert>
        </div>
      )}
      <h1 className="display text-[clamp(2.2rem,6vw,3.4rem)]">
        {a.appts.hello('')}
        <b>{session.name.split(' ')[0]}</b>
      </h1>
      <p className="mt-2 text-paper/60">{a.appts.lead(upcoming.length)}</p>

      <section className="mt-8" aria-labelledby="upcoming-h">
        <h2 id="upcoming-h" className="label mb-3 text-paper/50">
          {a.appts.upcoming}
        </h2>
        {upcoming.length ? (
          <ul className="space-y-2">{upcoming.map(row)}</ul>
        ) : (
          <Card>
            <p className="text-sm text-paper/60">{a.appts.noUpcoming}</p>
            <a href="/?book=1" className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-paper px-4 text-sm font-medium text-ink hover:bg-paper/90">
              <CalendarPlus className="size-4" strokeWidth={1.5} /> {a.common.book}
            </a>
          </Card>
        )}
      </section>

      <section className="mt-10" aria-labelledby="history-h">
        <h2 id="history-h" className="label mb-3 text-paper/50">
          {a.appts.history}
        </h2>
        {history.length ? <ul className="space-y-2">{history.map(row)}</ul> : <p className="rounded-2xl border border-dashed border-paper/15 bg-white/40 p-5 text-center text-sm text-paper/55">{a.appts.noHistory}</p>}
      </section>

      <Sheet open={!!open} onClose={() => setOpenId(null)} title={a.appts.details}>
        {open && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={open.status} size="md" />
              {open.status === 'cancelled' && open.cancelledBy && <span className="text-sm text-paper/55">{a.appts.cancelledBy[open.cancelledBy]}</span>}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
              <div className="col-span-2">
                <dt className="label text-paper/45">{a.appts.when}</dt>
                <dd className="mt-1 text-base first-letter:uppercase">
                  {fmt.date(new Date(open.start), { weekday: 'long', day: 'numeric', month: 'long' })} · {hhmm(open.start)}–{hhmm(endOf(open))}
                </dd>
              </div>
              <div>
                <dt className="label text-paper/45">{a.appts.service}</dt>
                <dd className="mt-1">{pub.services.items[open.serviceId as keyof typeof pub.services.items].name}</dd>
              </div>
              <div>
                <dt className="label text-paper/45">{a.appts.barber}</dt>
                <dd className="mt-1">{barberOf(open)?.name}</dd>
              </div>
              <div>
                <dt className="label text-paper/45">{a.appts.duration}</dt>
                <dd className="mt-1">
                  {open.duration} {pub.common.min}
                </dd>
              </div>
              <div>
                <dt className="label text-paper/45">{a.appts.price}</dt>
                <dd className="mt-1">
                  €{open.price} · {a.appts.payInShop}
                </dd>
              </div>
              <div>
                <dt className="label text-paper/45">{a.appts.ref}</dt>
                <dd className="mt-1 font-mono text-[0.85rem]">{open.ref ?? '—'}</dd>
              </div>
              {open.createdAt && (
                <div>
                  <dt className="label text-paper/45">{a.appts.bookedOn}</dt>
                  <dd className="mt-1">{fmt.date(new Date(open.createdAt), { day: 'numeric', month: 'short' })}</dd>
                </div>
              )}
            </dl>
            {open.note && (
              <p className="rounded-xl border border-paper/[0.07] bg-white/60 p-3 text-sm">
                <span className="label mr-2 text-paper/45">{a.appts.notes}</span>
                {open.note}
              </p>
            )}
            {isUpcoming(open) &&
              (customerCanCancel(open, db, now) ? (
                <Btn
                  tone="danger"
                  className="w-full"
                  onClick={() => {
                    if (!window.confirm(a.appts.cancelConfirm)) return
                    const r = cancelBooking(session, open.id)
                    if (r.ok) toast(a.appts.cancelled)
                    else toast(r.error === 'too_late' ? a.appts.tooLate(db.settings.cancellationHours) : a.appts.cannotCancel, 'error')
                  }}
                >
                  {a.appts.cancel}
                </Btn>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-paper/60">{open.status === 'booked' || open.status === 'confirmed' ? a.appts.tooLate(db.settings.cancellationHours) : a.appts.cannotCancel}</p>
                  <a href={site.phoneHref} className="inline-flex h-10 items-center gap-2 rounded-full border border-paper/15 bg-white/70 px-4 text-sm hover:bg-white">
                    <Phone className="size-4" strokeWidth={1.5} /> {a.appts.call} · {site.phone}
                  </a>
                </div>
              ))}
          </div>
        )}
      </Sheet>
    </>
  )
}
