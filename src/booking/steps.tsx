import { useMemo, useState } from 'react'
import { ArrowRight, Check, Clock, UserRound } from 'lucide-react'
import { serviceCategories, services as siteServices } from '../data/content'
import { formatPrice } from '../data/site'
import { useBooking } from '../context/booking'
import { bookingDays, fromKey, getSlots, shopOpen, toKey, worksOn } from '../demo/bookings'
import { useSession } from '../demo/auth'
import { Img } from '../components/Img'
import { useI18n } from '../i18n'
import { useCatalog } from './catalog'

/* ———————————————————————— Shared ———————————————————————— */

const row =
  'group flex w-full items-center gap-4 rounded-xl border p-3 text-left transition-[background-color,border-color] duration-300 md:p-3.5'
const rowIdle = 'border-line bg-ash/40 hover:border-paper/35 hover:bg-ash'
const rowOn = 'border-paper/70 bg-ash'

function Thumb({ id, alt }: { id: string; alt: string }) {
  if (!id)
    return (
      <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-lg border border-line bg-ash text-sm font-semibold [font-stretch:120%] md:size-12">
        {alt.split(' ').map((w) => w[0]).join('').slice(0, 2)}
      </span>
    )
  return <Img id={id} alt={alt} sizes="48px" maxWidth={480} className="size-11 shrink-0 rounded-lg md:size-12" />
}

/* ———————————————————————— 1. Service ———————————————————————— */

export function StepService({ onPicked }: { onPicked: () => void }) {
  const { state, dispatch } = useBooking()
  const { t } = useI18n()
  const { services } = useCatalog()
  return (
    <div className="space-y-6">
      {serviceCategories.map((cat) => (
        <div key={cat}>
          <div className="label mb-2.5 text-paper/40">{t.steps.categories[cat]}</div>
          <div className="space-y-1.5">
            {services
              .filter((s) => s.category === cat)
              .map((s) => {
                const on = state.serviceId === s.id
                // numbering follows the full menu, so it stays stable when a service is paused
                const num = siteServices.findIndex((x) => x.id === s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      dispatch({ type: 'service', id: s.id })
                      onPicked()
                    }}
                    className={`${row} ${on ? rowOn : rowIdle}`}
                  >
                    <Thumb id={s.image} alt="" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold [font-stretch:115%]">
                        <span className="text-paper/45">#{num}</span> {t.services.items[s.id].name}
                      </span>
                      <span className="label mt-1 block text-paper/40">
                        {s.duration} {t.common.min}
                        {s.signature ? ` · ${t.steps.signature}` : ''}
                      </span>
                    </span>
                    <span className="font-semibold tabular-nums">{formatPrice(s.price)}</span>
                    {on && <Check className="size-4 shrink-0" />}
                  </button>
                )
              })}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ———————————————————————— 2. Barber ———————————————————————— */

export function StepBarber({ onPicked }: { onPicked: () => void }) {
  const { state, dispatch } = useBooking()
  const { t } = useI18n()
  const { barbers, db } = useCatalog()
  const pick = (id: string) => {
    dispatch({ type: 'barber', id })
    if (state.date && !worksOn(db, id, fromKey(state.date))) dispatch({ type: 'date', date: null })
    onPicked()
  }
  const anyOn = state.barberId === 'any'
  return (
    <div className="space-y-1.5">
      <button type="button" aria-pressed={anyOn} onClick={() => pick('any')} className={`${row} ${anyOn ? rowOn : rowIdle}`}>
        <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-line md:size-12">
          <Clock className="size-5" strokeWidth={1.25} />
        </span>
        <span className="flex-1">
          <span className="block font-semibold [font-stretch:115%]">{t.steps.firstFreeChair}</span>
          <span className="label mt-1 block text-paper/40">{t.steps.whoeverFree}</span>
        </span>
        {anyOn ? <Check className="size-4" /> : <ArrowRight className="size-4 text-paper/40" strokeWidth={1.5} />}
      </button>
      {barbers.map((b) => {
        const on = state.barberId === b.id
        return (
          <button key={b.id} type="button" aria-pressed={on} onClick={() => pick(b.id)} className={`${row} ${on ? rowOn : rowIdle}`}>
            <Thumb id={b.image} alt={b.name} />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold [font-stretch:115%]">{b.name}</span>
              <span className="label mt-1 block truncate text-paper/40">
                {[b.specialty, b.years ? `${b.years} ${t.common.yrs}` : ''].filter(Boolean).join(' · ')}
              </span>
            </span>
            {on ? <Check className="size-4" /> : <ArrowRight className="size-4 text-paper/40" strokeWidth={1.5} />}
          </button>
        )
      })}
    </div>
  )
}

/* ———————————————————————— 3. Date ———————————————————————— */

export function StepDate({ onPicked }: { onPicked: () => void }) {
  const { state, dispatch } = useBooking()
  const { t, fmt } = useI18n()
  const { db, barbers } = useCatalog()
  const [{ days, todayKey }] = useState(() => ({ days: bookingDays(db), todayKey: toKey(new Date()) }))
  const barber = barbers.find((b) => b.id === state.barberId)
  return (
    <div>
      <p className="-mt-2 mb-5 text-sm text-paper/50">
        {t.steps.dateIntro(barber ? barber.name.split(' ')[0] : null)}
      </p>
      <div className="grid grid-cols-4 gap-1.5 xs:grid-cols-5 sm:grid-cols-7">
        {days.map((d) => {
          const key = toKey(d)
          const open = shopOpen(db, d)
          const disabled = !worksOn(db, state.barberId, d)
          const on = state.date === key
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              aria-pressed={on}
              aria-label={`${fmt.date(d, { weekday: 'long', day: 'numeric', month: 'long' })}${
                disabled ? (open ? t.steps.barberOff : t.steps.closedSuffix) : ''
              }`}
              onClick={() => {
                dispatch({ type: 'date', date: key })
                onPicked()
              }}
              className={`flex aspect-[4/5] flex-col items-center justify-center gap-1 rounded-xl border transition-colors ${
                on
                  ? 'border-paper bg-paper text-ink'
                  : disabled
                    ? 'border-transparent text-paper/20'
                    : 'border-line bg-ash/40 hover:border-paper/40'
              }`}
            >
              <span className="label text-[0.6rem] opacity-70">
                {key === todayKey ? t.common.today : fmt.weekday(d, 'short')}
              </span>
              <span className="text-2xl font-semibold tabular-nums [font-stretch:120%]">{d.getDate()}</span>
              <span className="label text-[0.55rem] opacity-55">
                {disabled ? (open ? t.steps.off : t.common.closed) : fmt.date(d, { month: 'short' })}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ———————————————————————— 4. Time ———————————————————————— */

export function StepTime({ onPicked, onChangeDate }: { onPicked: () => void; onChangeDate: () => void }) {
  const { state, dispatch } = useBooking()
  const { t, fmt } = useI18n()
  const { db, services } = useCatalog()
  const service = services.find((s) => s.id === state.serviceId)
  const date = state.date ? fromKey(state.date) : null
  const duration = service?.duration ?? 0
  // recomputed whenever bookings change (this tab or another), so taken times disappear live
  const slots = useMemo(
    () => (state.date && duration ? getSlots(db, state.barberId, fromKey(state.date), duration) : []),
    [db, state.date, state.barberId, duration],
  )
  const groups = [
    { label: t.steps.morning, test: (h: number) => h < 12 },
    { label: t.steps.afternoon, test: (h: number) => h >= 12 && h < 17 },
    { label: t.steps.evening, test: (h: number) => h >= 17 },
  ]
  const free = slots.filter((s) => s.available).length

  return (
    <div>
      {date && (
        <div className="-mt-2 mb-5 flex flex-wrap items-center justify-between gap-2 text-sm text-paper/50">
          <span>
            {t.steps.freeCount(fmt.date(date, { weekday: 'long', day: 'numeric', month: 'long' }), free)}
          </span>
          <button type="button" onClick={onChangeDate} className="underline underline-offset-4 hover:text-paper">
            {t.steps.changeDate}
          </button>
        </div>
      )}
      {free === 0 ? (
        <div className="rounded-xl border border-line p-8 text-center">
          <p className="text-paper/70">{t.steps.fullyBooked}</p>
          <button
            type="button"
            onClick={onChangeDate}
            className="mt-5 rounded-full border border-paper/30 px-5 py-2.5 text-sm transition-colors hover:bg-paper hover:text-ink"
          >
            {t.steps.pickAnother}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => {
            const list = slots.filter((s) => g.test(Number(s.time.slice(0, 2))))
            if (!list.length) return null
            return (
              <div key={g.label}>
                <div className="label mb-2.5 text-paper/40">{g.label}</div>
                <div className="grid grid-cols-3 gap-1.5 xs:grid-cols-4 sm:grid-cols-5">
                  {list.map((s) => {
                    const on = state.time === s.time
                    return (
                      <button
                        key={s.time}
                        type="button"
                        disabled={!s.available}
                        aria-pressed={on}
                        aria-label={`${s.time}${s.available ? '' : t.steps.taken}`}
                        onClick={() => {
                          dispatch({ type: 'time', time: s.time })
                          onPicked()
                        }}
                        className={`h-11 rounded-lg border text-center text-sm font-medium tabular-nums transition-colors ${
                          on
                            ? 'border-paper bg-paper text-ink'
                            : s.available
                              ? 'border-line bg-ash/40 hover:border-paper/40'
                              : 'border-transparent text-paper/20 line-through'
                        }`}
                      >
                        {s.time}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ———————————————————————— 5. Details ———————————————————————— */

const box =
  'mt-2 w-full rounded-lg border border-line bg-ash/50 px-3.5 py-3 text-[0.95rem] outline-none transition-colors placeholder:text-paper/30 focus:border-paper/60'

/** Contact details come from the customer account; only the note is typed here. */
export function StepDetails() {
  const { state, dispatch } = useBooking()
  const { t } = useI18n()
  const session = useSession()
  const customer = session?.role === 'customer' ? session : null
  return (
    <div className="grid gap-5">
      {customer ? (
        <div className="rounded-xl border border-line bg-ash/40 p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line">
              <UserRound className="size-4" strokeWidth={1.5} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{customer.name}</span>
              <span className="block truncate text-sm text-paper/55">
                {customer.phone} · {customer.email}
              </span>
            </span>
          </div>
          <p className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-paper/50">
            {t.steps.profileNote}
            <a href="/account/profile" className="underline underline-offset-4 hover:text-paper">
              {t.steps.editProfile}
            </a>
          </p>
        </div>
      ) : (
        <p className="rounded-xl border border-line bg-ash/40 p-4 text-sm leading-relaxed text-paper/65">{t.steps.signInLater}</p>
      )}
      <label className="block">
        <span className="label text-paper/45">{t.steps.notesLabel}</span>
        <textarea
          rows={3}
          value={state.notes}
          onChange={(e) => dispatch({ type: 'notes', notes: e.target.value })}
          placeholder={t.steps.notesPh}
          className={`${box} resize-none`}
          maxLength={400}
        />
      </label>
      <p className="rounded-lg border border-line bg-ash/40 p-4 text-xs leading-relaxed text-paper/55">
        <b className="text-paper/80">{t.steps.noDepositBold}</b> {t.steps.noDeposit}
      </p>
    </div>
  )
}
