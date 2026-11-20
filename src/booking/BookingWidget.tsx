import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, Info, Phone, RotateCcw } from 'lucide-react'
import { STEPS, firstIncomplete, useBooking, type StepIndex } from '../context/booking'
import { formatPrice, site } from '../data/site'
import { assignBarber } from '../lib/schedule'
import { StepBarber, StepDate, StepDetails, StepService, StepTime, StepTitle, validateDetails } from './steps'
import { Summary, SummaryRow, useSelection } from './Summary'

const ease = [0.16, 1, 0.3, 1] as const

export function BookingWidget() {
  const { state, dispatch } = useBooking()
  const sel = useSelection()
  const [dir, setDir] = useState(1)
  const [showErrors, setShowErrors] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [agreeError, setAgreeError] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const firstRender = useRef(true)

  const detailsValid = Object.keys(validateDetails(state.details)).length === 0
  const fi = firstIncomplete(state)
  const reachable = fi === 4 && detailsValid ? 5 : fi
  const canNext = [!!state.serviceId, !!state.barberId, !!state.date, !!state.time, detailsValid, agreed][state.step]

  const goTo = (s: StepIndex) => {
    setDir(s > state.step ? 1 : -1)
    dispatch({ type: 'step', step: s })
  }

  // keep the active step in view on small screens
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const el = panel.current
    if (!el) return
    const top = el.getBoundingClientRect().top
    if (top < 0 || top > window.innerHeight * 0.5) {
      window.scrollTo({ top: window.scrollY + top - 90, behavior: 'smooth' })
    }
  }, [state.step, state.submitted])

  // latest state for the delayed auto-advance below
  const latest = useRef(state)
  useEffect(() => {
    latest.current = state
  })

  /** After a pick, move to the next step that still needs input (skips preselected ones). */
  const autoAdvance = (from: StepIndex) => () => {
    window.setTimeout(() => {
      const cur = latest.current
      if (cur.step !== from) return
      const target = Math.max(from + 1, firstIncomplete(cur)) as StepIndex
      setDir(1)
      dispatch({ type: 'step', step: target })
    }, 380)
  }

  const next = () => {
    if (state.step === 4 && !detailsValid) {
      setShowErrors(true)
      return
    }
    if (state.step === 5) {
      if (!agreed) {
        setAgreeError(true)
        return
      }
      dispatch({ type: 'submit' })
      return
    }
    if (canNext) goTo((state.step + 1) as StepIndex)
  }

  if (state.submitted) {
    return (
      <div ref={panel}>
        <Confirmation
          onRestart={() => {
            setAgreed(false)
            setShowErrors(false)
            dispatch({ type: 'reset' })
          }}
        />
      </div>
    )
  }

  return (
    <div ref={panel} className="grid gap-6 lg:grid-cols-12 lg:gap-8">
      {/* Step rail — desktop */}
      <ol className="hidden lg:col-span-3 lg:block" aria-label="Booking steps">
        {STEPS.map((label, i) => {
          const current = i === state.step
          const can = i <= reachable
          const values = [sel.service?.name, sel.barberLabel, sel.dateLabel, sel.timeLabel, state.details.name || null, null]
          return (
            <li key={label} className="border-b border-line">
              <button
                type="button"
                disabled={!can}
                onClick={() => goTo(i as StepIndex)}
                aria-current={current ? 'step' : undefined}
                className={`group flex w-full items-start gap-4 py-4 text-left transition-colors ${
                  current ? 'text-paper' : can ? 'text-paper/55 hover:text-paper' : 'text-paper/20'
                }`}
              >
                <span
                  className={`mt-0.5 grid size-6 shrink-0 place-items-center border text-[0.65rem] tabular-nums transition-colors ${
                    current ? 'border-paper bg-paper text-ink' : values[i] ? 'border-paper/50' : 'border-current'
                  }`}
                >
                  {values[i] && !current ? <Check className="size-3" /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className="label block">{label}</span>
                  {values[i] && <span className="mt-1.5 block truncate text-sm text-paper/45">{values[i]}</span>}
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      {/* Main panel */}
      <div className="lg:col-span-6">
        {/* progress — mobile/tablet */}
        <div className="mb-7 lg:hidden">
          <div className="flex gap-1" aria-hidden>
            {STEPS.map((s, i) => (
              <button
                key={s}
                type="button"
                tabIndex={-1}
                disabled={i > reachable}
                onClick={() => goTo(i as StepIndex)}
                className="h-6 flex-1 py-2.5"
              >
                <span
                  className={`block h-px w-full transition-colors duration-500 ${i <= state.step ? 'bg-paper' : 'bg-paper/20'}`}
                />
              </button>
            ))}
          </div>
          <div className="label mt-2 flex justify-between text-paper/50">
            <span>
              Step {state.step + 1} / {STEPS.length}
            </span>
            <span>{STEPS[state.step]}</span>
          </div>
        </div>

        <div className="relative min-h-[420px]">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={state.step}
              custom={dir}
              variants={{
                enter: (d: number) => ({ opacity: 0, x: d * 40 }),
                center: { opacity: 1, x: 0 },
                exit: (d: number) => ({ opacity: 0, x: d * -40 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.45, ease }}
            >
              {state.step === 0 && <StepService onPicked={autoAdvance(0)} />}
              {state.step === 1 && <StepBarber onPicked={autoAdvance(1)} />}
              {state.step === 2 && <StepDate onPicked={autoAdvance(2)} />}
              {state.step === 3 && <StepTime onPicked={autoAdvance(3)} onChangeDate={() => goTo(2)} />}
              {state.step === 4 && <StepDetails showErrors={showErrors} />}
              {state.step === 5 && (
                <Review
                  onEdit={goTo}
                  agreed={agreed}
                  agreeError={agreeError}
                  onAgree={(v) => {
                    setAgreed(v)
                    if (v) setAgreeError(false)
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="sticky bottom-0 z-10 -mx-4 mt-8 flex items-center gap-3 border-t border-line bg-ink/95 px-4 py-3 backdrop-blur md:mx-0 md:px-0 lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <button
            type="button"
            onClick={() => goTo((state.step - 1) as StepIndex)}
            disabled={state.step === 0}
            className="grid size-12 shrink-0 place-items-center border border-line transition-colors hover:border-paper/50 disabled:opacity-25"
            aria-label="Previous step"
          >
            <ArrowLeft className="size-4" strokeWidth={1.5} />
          </button>
          <div className="min-w-0 flex-1 lg:hidden">
            <div className="truncate text-sm">{sel.service?.name ?? 'No service yet'}</div>
            <div className="label mt-1 text-paper/45">{sel.service ? formatPrice(sel.service.price) : '—'}</div>
          </div>
          <button
            type="button"
            onClick={next}
            aria-disabled={!canNext && state.step < 4}
            disabled={!canNext && state.step < 4}
            className="group/btn flex h-12 items-center gap-3 bg-paper px-5 text-ink transition-opacity disabled:opacity-30 md:px-7 lg:ml-auto"
          >
            <span className="label">{state.step === 5 ? 'Confirm request' : 'Continue'}</span>
            <ArrowRight className="size-4 transition-transform duration-500 group-hover/btn:translate-x-1" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Summary — desktop */}
      <aside className="hidden lg:col-span-3 lg:block">
        <div className="sticky top-28">
          <Summary />
        </div>
      </aside>
    </div>
  )
}

/* ———————————————————————— 6. Review ———————————————————————— */

function Review({
  onEdit,
  agreed,
  agreeError,
  onAgree,
}: {
  onEdit: (s: StepIndex) => void
  agreed: boolean
  agreeError: boolean
  onAgree: (v: boolean) => void
}) {
  const { state } = useBooking()
  const sel = useSelection()
  return (
    <div>
      <StepTitle kicker="Step 06" title="Review & confirm" />
      <div className="text-[0.95rem]">
        <SummaryRow label="Service" value={sel.service ? `${sel.service.name} · ${sel.service.duration} min` : null} step={0} onEdit={onEdit} />
        <SummaryRow label="Barber" value={sel.barberLabel} step={1} onEdit={onEdit} />
        <SummaryRow label="Date" value={sel.dateLabel} step={2} onEdit={onEdit} />
        <SummaryRow label="Time" value={sel.timeLabel} step={3} onEdit={onEdit} />
        <SummaryRow label="Name" value={state.details.name} step={4} onEdit={onEdit} />
        <SummaryRow label="Contact" value={`${state.details.phone} · ${state.details.email}`} step={4} onEdit={onEdit} />
        {state.details.notes && <SummaryRow label="Notes" value={state.details.notes} step={4} onEdit={onEdit} />}
      </div>
      <div className="mt-6 flex items-end justify-between">
        <span className="label text-paper/45">Pay in shop</span>
        <span className="display text-4xl tabular-nums">{sel.service ? formatPrice(sel.service.price) : '—'}</span>
      </div>

      <label className={`mt-8 flex cursor-pointer items-start gap-3 text-sm ${agreeError ? 'text-[#e58a7e]' : 'text-paper/65'}`}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => onAgree(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-paper"
        />
        <span>I agree to the 24-hour cancellation policy. Late cancellations and no-shows may be charged 50%.</span>
      </label>

      <DemoNote className="mt-6" />
    </div>
  )
}

export function DemoNote({ className = '' }: { className?: string }) {
  return (
    <p className={`flex gap-3 border border-dashed border-paper/20 p-4 text-xs leading-relaxed text-paper/55 ${className}`}>
      <Info className="mt-px size-4 shrink-0" strokeWidth={1.5} />
      <span>
        Preview mode — online booking is not connected yet. Confirming shows the flow only: no appointment is reserved and
        nobody is notified. To book today, call {site.phone}.
      </span>
    </p>
  )
}

/* ———————————————————————— Done ———————————————————————— */

function Confirmation({ onRestart }: { onRestart: () => void }) {
  const { state } = useBooking()
  const sel = useSelection()
  const assigned =
    state.barberId === 'any' && sel.date && state.time && sel.service
      ? assignBarber(sel.date, state.time, sel.service.duration)
      : null
  const first = state.details.name.trim().split(' ')[0]
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease }}
      className="mx-auto grid max-w-5xl gap-10 border border-line bg-coal p-6 md:grid-cols-2 md:p-12"
      role="status"
    >
      <div>
        <div className="label inline-flex items-center gap-2 border border-paper/25 px-3 py-2 text-paper/70">
          <span className="size-1.5 rounded-full bg-paper/70" /> Demo request — not booked
        </div>
        <h3 className="display mt-6 text-[clamp(2.25rem,5vw,4.5rem)]">
          Looking sharp, <span className="serif normal-case">{first || 'friend'}.</span>
        </h3>
        <p className="mt-5 max-w-md leading-relaxed text-paper/65">
          This is where your confirmation will appear once online booking goes live. Nothing has been reserved yet and no
          message was sent — call the shop to lock in this time.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={site.phoneHref}
            className="group/btn flex h-12 items-center gap-3 bg-paper px-6 text-ink transition-colors hover:bg-white"
          >
            <Phone className="size-4" strokeWidth={1.5} />
            <span className="label">Call to book</span>
          </a>
          <button
            type="button"
            onClick={onRestart}
            className="flex h-12 items-center gap-3 border border-paper/30 px-6 transition-colors hover:border-paper"
          >
            <RotateCcw className="size-4" strokeWidth={1.5} />
            <span className="label">New booking</span>
          </button>
        </div>
      </div>
      <div className="text-[0.95rem]">
        <SummaryRow label="Service" value={sel.service?.name ?? null} step={0} />
        <SummaryRow label="Barber" value={assigned ? `${assigned.name} (assigned)` : sel.barberLabel} step={1} />
        <SummaryRow label="Date" value={sel.dateLabel} step={2} />
        <SummaryRow label="Time" value={sel.timeLabel} step={3} />
        <SummaryRow label="Name" value={state.details.name} step={4} />
        <div className="mt-6 flex items-end justify-between">
          <span className="label text-paper/45">Pay in shop</span>
          <span className="display text-4xl">{sel.service ? formatPrice(sel.service.price) : '—'}</span>
        </div>
      </div>
    </motion.div>
  )
}
