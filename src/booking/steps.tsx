import { useMemo, useState } from 'react'
import { ArrowRight, Check, Clock } from 'lucide-react'
import { barbers, serviceCategories, services } from '../data/content'
import { formatPrice } from '../data/site'
import { useBooking, type Details } from '../context/booking'
import { barberWorks, fromKey, getSlots, isShopOpen, toKey, upcomingDays } from '../lib/schedule'
import { Img } from '../components/Img'

/* ———————————————————————— Shared ———————————————————————— */

const row =
  'group flex w-full items-center gap-4 rounded-xl border p-3 text-left transition-[background-color,border-color] duration-300 md:p-3.5'
const rowIdle = 'border-line bg-ash/40 hover:border-paper/35 hover:bg-ash'
const rowOn = 'border-paper/70 bg-ash'

function Thumb({ id, alt }: { id: string; alt: string }) {
  return <Img id={id} alt={alt} sizes="48px" maxWidth={480} className="size-11 shrink-0 rounded-lg md:size-12" />
}

/* ———————————————————————— 1. Service ———————————————————————— */

export function StepService({ onPicked }: { onPicked: () => void }) {
  const { state, dispatch } = useBooking()
  return (
    <div className="space-y-6">
      {serviceCategories.map((cat) => (
        <div key={cat}>
          <div className="label mb-2.5 text-paper/40">{cat}</div>
          <div className="space-y-1.5">
            {services
              .filter((s) => s.category === cat)
              .map((s) => {
                const on = state.serviceId === s.id
                const num = services.indexOf(s)
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
                        <span className="text-paper/45">#{num}</span> {s.name}
                      </span>
                      <span className="label mt-1 block text-paper/40">
                        {s.duration} min{s.signature ? ' · signature' : ''}
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
  const pick = (id: string) => {
    dispatch({ type: 'barber', id })
    if (state.date && !barberWorks(id, fromKey(state.date))) dispatch({ type: 'date', date: null })
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
          <span className="block font-semibold [font-stretch:115%]">First free chair</span>
          <span className="label mt-1 block text-paper/40">Whoever is free first</span>
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
                {b.specialty} · {b.years} yrs
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
  const [{ days, todayKey }] = useState(() => ({ days: upcomingDays(21), todayKey: toKey(new Date()) }))
  const barber = barbers.find((b) => b.id === state.barberId)
  return (
    <div>
      <p className="-mt-2 mb-5 text-sm text-paper/50">
        Next three weeks{barber ? ` · days ${barber.name.split(' ')[0]} works` : ''}. Closed on Mondays.
      </p>
      <div className="grid grid-cols-4 gap-1.5 xs:grid-cols-5 sm:grid-cols-7">
        {days.map((d) => {
          const key = toKey(d)
          const open = isShopOpen(d)
          const disabled = !barberWorks(state.barberId, d)
          const on = state.date === key
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              aria-pressed={on}
              aria-label={`${d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}${
                disabled ? (open ? ' — barber off' : ' — closed') : ''
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
                {key === todayKey ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short' })}
              </span>
              <span className="text-2xl font-semibold tabular-nums [font-stretch:120%]">{d.getDate()}</span>
              <span className="label text-[0.55rem] opacity-55">
                {disabled ? (open ? 'Off' : 'Closed') : d.toLocaleDateString('en-GB', { month: 'short' })}
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
  const service = services.find((s) => s.id === state.serviceId)
  const date = state.date ? fromKey(state.date) : null
  const duration = service?.duration ?? 0
  const slots = useMemo(
    () => (state.date && duration ? getSlots(state.barberId, fromKey(state.date), duration) : []),
    [state.date, state.barberId, duration],
  )
  const groups = [
    { label: 'Morning', test: (h: number) => h < 12 },
    { label: 'Afternoon', test: (h: number) => h >= 12 && h < 17 },
    { label: 'Evening', test: (h: number) => h >= 17 },
  ]
  const free = slots.filter((s) => s.available).length

  return (
    <div>
      {date && (
        <div className="-mt-2 mb-5 flex flex-wrap items-center justify-between gap-2 text-sm text-paper/50">
          <span>
            {date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · {free} free
          </span>
          <button type="button" onClick={onChangeDate} className="underline underline-offset-4 hover:text-paper">
            Change date
          </button>
        </div>
      )}
      {free === 0 ? (
        <div className="rounded-xl border border-line p-8 text-center">
          <p className="text-paper/70">Fully booked on this day.</p>
          <button
            type="button"
            onClick={onChangeDate}
            className="mt-5 rounded-full border border-paper/30 px-5 py-2.5 text-sm transition-colors hover:bg-paper hover:text-ink"
          >
            Pick another date
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
                        aria-label={`${s.time}${s.available ? '' : ' — taken'}`}
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

export function validateDetails(d: Details) {
  const errors: Partial<Record<keyof Details, string>> = {}
  if (d.name.trim().length < 2) errors.name = 'Please enter your full name'
  if (!/^\+?[\d\s()-]{7,}$/.test(d.phone.trim())) errors.phone = 'Enter a valid phone number'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim())) errors.email = 'Enter a valid email address'
  return errors
}

const box =
  'mt-2 w-full rounded-lg border border-line bg-ash/50 px-3.5 py-3 text-[0.95rem] outline-none transition-colors placeholder:text-paper/30 focus:border-paper/60 aria-[invalid=true]:border-[#d96c5f]'

export function StepDetails({ showErrors }: { showErrors: boolean }) {
  const { state, dispatch } = useBooking()
  const [touched, setTouched] = useState<Partial<Record<keyof Details, boolean>>>({})
  const errors = validateDetails(state.details)
  const field = (key: keyof Details, label: string, props: React.InputHTMLAttributes<HTMLInputElement>) => {
    const err = (showErrors || touched[key]) && errors[key]
    return (
      <label className="block">
        <span className="label text-paper/45">{label}</span>
        <input
          {...props}
          value={state.details[key]}
          onChange={(e) => dispatch({ type: 'details', details: { [key]: e.target.value } })}
          onBlur={() => setTouched((t) => ({ ...t, [key]: true }))}
          aria-invalid={err ? true : undefined}
          aria-describedby={err ? `err-${key}` : undefined}
          className={box}
        />
        {err && (
          <span id={`err-${key}`} className="mt-1.5 block text-xs text-[#e58a7e]">
            {err}
          </span>
        )}
      </label>
    )
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">{field('name', 'Name', { autoComplete: 'name', placeholder: 'Your name', name: 'name' })}</div>
      {field('phone', 'Mobile, for the reminder', {
        autoComplete: 'tel',
        type: 'tel',
        inputMode: 'tel',
        placeholder: '+31 6 1234 5678',
        name: 'phone',
      })}
      {field('email', 'Email', { autoComplete: 'email', type: 'email', inputMode: 'email', placeholder: 'you@email.com', name: 'email' })}
      <label className="block sm:col-span-2">
        <span className="label text-paper/45">Notes for your barber (optional)</span>
        <textarea
          rows={3}
          value={state.details.notes}
          onChange={(e) => dispatch({ type: 'details', details: { notes: e.target.value } })}
          placeholder="Reference photo, sensitive skin, first visit…"
          className={`${box} resize-none`}
          maxLength={400}
        />
      </label>
      <p className="rounded-lg border border-line bg-ash/40 p-4 text-xs leading-relaxed text-paper/55 sm:col-span-2">
        <b className="text-paper/80">No deposit, no card.</b> You pay in the shop after your cut. Changes and
        cancellations are free up to 24 hours before.
      </p>
    </div>
  )
}
