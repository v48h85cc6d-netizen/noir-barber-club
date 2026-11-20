import { useMemo, useState } from 'react'
import { Check, Clock, Scissors, Users } from 'lucide-react'
import { barbers, serviceCategories, services } from '../data/content'
import { formatPrice } from '../data/site'
import { useBooking, type Details } from '../context/booking'
import { barberWorks, fromKey, getSlots, isShopOpen, toKey, upcomingDays } from '../lib/schedule'
import { Img } from '../components/Img'

/* ———————————————————————— Shared ———————————————————————— */

export function StepTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-7 md:mb-9">
      <div className="label text-paper/45">{kicker}</div>
      <h3 className="display mt-3 text-[clamp(1.9rem,3.6vw,3.25rem)]">{title}</h3>
    </div>
  )
}

const selectable =
  'relative text-left transition-[background-color,border-color,color] duration-300 border focus-visible:outline-paper'
const idle = 'border-line bg-coal hover:border-paper/40'
const active = 'border-paper bg-paper text-ink'

/* ———————————————————————— 1. Service ———————————————————————— */

export function StepService({ onPicked }: { onPicked: () => void }) {
  const { state, dispatch } = useBooking()
  return (
    <div>
      <StepTitle kicker="Step 01" title="Choose a service" />
      <div className="space-y-8">
        {serviceCategories.map((cat) => (
          <div key={cat}>
            <div className="label mb-3 text-paper/45">{cat}</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {services
                .filter((s) => s.category === cat)
                .map((s) => {
                  const on = state.serviceId === s.id
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        dispatch({ type: 'service', id: s.id })
                        onPicked()
                      }}
                      className={`${selectable} ${on ? active : idle} flex flex-col gap-3 p-4 md:p-5`}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="text-[1.05rem] font-semibold [font-stretch:112%]">{s.name}</span>
                        <span className="text-[1.05rem] font-semibold tabular-nums">{formatPrice(s.price)}</span>
                      </span>
                      <span className={`text-sm leading-snug ${on ? 'text-ink/65' : 'text-paper/50'}`}>{s.description}</span>
                      <span className={`label flex items-center gap-2 ${on ? 'text-ink/60' : 'text-paper/45'}`}>
                        <Clock className="size-3.5" strokeWidth={1.5} /> {s.duration} min
                        {s.signature && <span className="ml-auto">Signature</span>}
                      </span>
                    </button>
                  )
                })}
            </div>
          </div>
        ))}
      </div>
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
    <div>
      <StepTitle kicker="Step 02" title="Choose your barber" />
      <button
        type="button"
        aria-pressed={anyOn}
        onClick={() => pick('any')}
        className={`${selectable} ${anyOn ? active : idle} mb-2 flex w-full items-center gap-4 p-4 md:p-5`}
      >
        <span className={`grid size-14 shrink-0 place-items-center border ${anyOn ? 'border-ink/20' : 'border-line'}`}>
          <Users className="size-5" strokeWidth={1.25} />
        </span>
        <span className="flex-1">
          <span className="block font-semibold [font-stretch:112%]">Any available barber</span>
          <span className={`text-sm ${anyOn ? 'text-ink/60' : 'text-paper/50'}`}>The most times to choose from</span>
        </span>
        {anyOn && <Check className="size-5" />}
      </button>
      <div className="grid grid-cols-2 gap-2">
        {barbers.map((b) => {
          const on = state.barberId === b.id
          return (
            <button
              key={b.id}
              type="button"
              aria-pressed={on}
              onClick={() => pick(b.id)}
              className={`${selectable} ${on ? active : idle} group flex flex-col p-2 md:p-2.5`}
            >
              <Img
                id={b.image}
                alt={b.name}
                sizes="(min-width: 1024px) 16vw, 45vw"
                maxWidth={768}
                className="aspect-[4/3] w-full"
                imgClassName="transition-transform duration-700 group-hover:scale-105"
              />
              <span className="flex items-start justify-between gap-2 px-1.5 pb-1.5 pt-3">
                <span>
                  <span className="block font-semibold leading-tight [font-stretch:112%]">{b.name}</span>
                  <span className={`mt-1 block text-xs md:text-sm ${on ? 'text-ink/60' : 'text-paper/50'}`}>
                    {b.specialty}
                  </span>
                </span>
                {on && <Check className="mt-0.5 size-4 shrink-0" />}
              </span>
            </button>
          )
        })}
      </div>
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
      <StepTitle kicker="Step 03" title="Pick a date" />
      <p className="-mt-4 mb-6 text-sm text-paper/50">
        Next three weeks{barber ? ` · showing days ${barber.name.split(' ')[0]} works` : ''}. Closed on Mondays.
      </p>
      <div className="grid grid-cols-4 gap-1.5 xs:grid-cols-5 sm:grid-cols-7">
        {days.map((d) => {
          const key = toKey(d)
          const open = isShopOpen(d)
          const works = barberWorks(state.barberId, d)
          const disabled = !works
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
              className={`${selectable} flex aspect-[4/5] flex-col items-center justify-center gap-1 ${
                on ? active : disabled ? 'border-transparent bg-transparent text-paper/20' : idle
              }`}
            >
              <span className="label text-[0.6rem]">{d.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
              <span className="display text-2xl md:text-3xl">{d.getDate()}</span>
              <span className={`text-[0.65rem] uppercase tracking-widest ${on ? 'text-ink/55' : 'text-paper/40'}`}>
                {disabled
                  ? open
                    ? 'Off'
                    : 'Closed'
                  : key === todayKey
                    ? 'Today'
                    : d.toLocaleDateString('en-GB', { month: 'short' })}
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
      <StepTitle kicker="Step 04" title="Pick a time" />
      {date && (
        <div className="-mt-4 mb-6 flex flex-wrap items-center justify-between gap-2 text-sm text-paper/50">
          <span>
            {date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · {free} times free
          </span>
          <button type="button" onClick={onChangeDate} className="underline underline-offset-4 hover:text-paper">
            Change date
          </button>
        </div>
      )}
      {free === 0 ? (
        <div className="border border-line p-8 text-center">
          <p className="text-paper/70">Fully booked on this day.</p>
          <button
            type="button"
            onClick={onChangeDate}
            className="label mt-5 border border-paper/30 px-5 py-3 transition-colors hover:bg-paper hover:text-ink"
          >
            Pick another date
          </button>
        </div>
      ) : (
        <div className="space-y-7">
          {groups.map((g) => {
            const list = slots.filter((s) => g.test(Number(s.time.slice(0, 2))))
            if (!list.length) return null
            return (
              <div key={g.label}>
                <div className="label mb-3 text-paper/45">{g.label}</div>
                <div className="grid grid-cols-3 gap-1.5 xs:grid-cols-4 sm:grid-cols-5 lg:grid-cols-6">
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
                        className={`${selectable} h-12 text-center text-[0.95rem] font-medium tabular-nums ${
                          on
                            ? active
                            : s.available
                              ? idle
                              : 'border-transparent bg-transparent text-paper/20 line-through'
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

export function StepDetails({ showErrors }: { showErrors: boolean }) {
  const { state, dispatch } = useBooking()
  const [touched, setTouched] = useState<Partial<Record<keyof Details, boolean>>>({})
  const errors = validateDetails(state.details)
  const field = (key: keyof Details, label: string, props: React.InputHTMLAttributes<HTMLInputElement>) => {
    const err = (showErrors || touched[key]) && errors[key]
    return (
      <label className="block">
        <span className="label text-paper/50">{label}</span>
        <input
          {...props}
          value={state.details[key]}
          onChange={(e) => dispatch({ type: 'details', details: { [key]: e.target.value } })}
          onBlur={() => setTouched((t) => ({ ...t, [key]: true }))}
          aria-invalid={err ? true : undefined}
          aria-describedby={err ? `err-${key}` : undefined}
          className="field"
        />
        {err && (
          <span id={`err-${key}`} className="mt-2 block text-xs text-[#e58a7e]">
            {err}
          </span>
        )}
      </label>
    )
  }
  return (
    <div>
      <StepTitle kicker="Step 05" title="Your details" />
      <div className="grid gap-7 sm:grid-cols-2">
        <div className="sm:col-span-2">
          {field('name', 'Full name', { autoComplete: 'name', placeholder: 'Your name', name: 'name' })}
        </div>
        {field('phone', 'Phone', { autoComplete: 'tel', type: 'tel', inputMode: 'tel', placeholder: '+31 6 1234 5678', name: 'phone' })}
        {field('email', 'Email', { autoComplete: 'email', type: 'email', inputMode: 'email', placeholder: 'you@email.com', name: 'email' })}
        <label className="block sm:col-span-2">
          <span className="label text-paper/50">Notes for your barber (optional)</span>
          <textarea
            rows={3}
            value={state.details.notes}
            onChange={(e) => dispatch({ type: 'details', details: { notes: e.target.value } })}
            placeholder="Reference photo, sensitive skin, first visit…"
            className="field resize-none"
            maxLength={400}
          />
        </label>
      </div>
      <p className="mt-6 flex items-center gap-2 text-xs text-paper/40">
        <Scissors className="size-3.5" strokeWidth={1.5} /> We only use these details for your appointment.
      </p>
    </div>
  )
}
