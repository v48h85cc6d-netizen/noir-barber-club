import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Info, Phone, RotateCcw, X } from 'lucide-react'
import { STEPS, firstIncomplete, useBooking, type StepIndex } from '../context/booking'
import { formatPrice, site } from '../data/site'
import { assignBarber } from '../lib/schedule'
import { StepBarber, StepDate, StepDetails, StepService, StepTime, validateDetails } from './steps'
import { SummaryRow, useSelection } from './Summary'

const ease = [0.16, 1, 0.3, 1] as const
const TITLES = ['Pick a service', 'Pick your barber', 'Pick a date', 'Pick a time', 'Your details', 'Review & confirm']

/** Slide-in booking panel. Opened from every "Book" control on the page. */
export function BookingDrawer() {
  const { isOpen, close } = useBooking()
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'Tab' && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (!f.length) return
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>('[data-close]')?.focus())
    return () => {
      document.removeEventListener('keydown', onKey)
      document.documentElement.style.overflow = overflow
      prev?.focus?.()
    }
  }, [isOpen, close])

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-[110]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[6px]" onClick={close} aria-hidden />
          <motion.div
            ref={panel}
            id="booking-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Book a chair"
            className="absolute inset-y-0 right-0 flex w-full flex-col bg-coal text-paper shadow-[-40px_0_80px_-20px_rgba(0,0,0,0.6)] sm:w-[560px] lg:w-[min(46vw,640px)]"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.7, ease }}
          >
            <BookingFlow />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function BookingFlow() {
  const { state, dispatch, close } = useBooking()
  const sel = useSelection()
  const [dir, setDir] = useState(1)
  const [showErrors, setShowErrors] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [agreeError, setAgreeError] = useState(false)
  const body = useRef<HTMLDivElement>(null)

  const latest = useRef(state)
  useEffect(() => {
    latest.current = state
  })

  const detailsValid = Object.keys(validateDetails(state.details)).length === 0
  const canNext = [!!state.serviceId, !!state.barberId, !!state.date, !!state.time, detailsValid, agreed][state.step]

  useEffect(() => {
    body.current?.scrollTo({ top: 0 })
  }, [state.step, state.submitted])

  const goTo = (s: StepIndex) => {
    setDir(s > state.step ? 1 : -1)
    dispatch({ type: 'step', step: s })
  }

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

  const summary = [sel.service?.name, sel.service && formatPrice(sel.service.price), sel.barber?.name.split(' ')[0] ?? (state.barberId === 'any' ? 'First free' : null), state.time]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      {/* Header */}
      <div className="px-5 pt-5 md:px-8 md:pt-7">
        <div className="flex items-center justify-between">
          <span className="label text-paper/45">
            {state.submitted ? 'Demo request' : `Step ${state.step + 1} of ${STEPS.length}`}
          </span>
          <button
            type="button"
            data-close
            onClick={close}
            aria-label="Close booking"
            className="grid size-10 place-items-center rounded-full border border-line transition-colors hover:border-paper/50"
          >
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </div>
        <h2 className="display mt-4 text-[clamp(1.9rem,4vw,2.6rem)] font-bold">
          {state.submitted ? 'Preview complete' : TITLES[state.step]}
        </h2>
        <div className="mt-4 h-px bg-line">
          <motion.div
            className="h-px bg-paper"
            animate={{ width: state.submitted ? '100%' : `${((state.step + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.6, ease }}
          />
        </div>
      </div>

      {/* Body */}
      <div ref={body} className="relative flex-1 overflow-y-auto overscroll-contain px-5 py-6 md:px-8">
        {state.submitted ? (
          <Confirmation
            onRestart={() => {
              setAgreed(false)
              setShowErrors(false)
              dispatch({ type: 'reset' })
            }}
          />
        ) : (
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={state.step}
              custom={dir}
              variants={{
                enter: (d: number) => ({ opacity: 0, x: d * 30 }),
                center: { opacity: 1, x: 0 },
                exit: (d: number) => ({ opacity: 0, x: d * -30 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease }}
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
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 border-t border-line px-5 py-3.5 md:px-8">
        <span className="label min-w-0 flex-1 truncate text-paper/45">
          {state.submitted ? 'Demo · nothing was booked or charged' : summary || 'Nothing picked yet'}
        </span>
        {!state.submitted && (
          <>
            {state.step > 0 && (
              <button type="button" onClick={() => goTo((state.step - 1) as StepIndex)} className="px-2 text-sm text-paper/60 hover:text-paper">
                Back
              </button>
            )}
            <button
              type="button"
              onClick={next}
              disabled={!canNext && state.step < 4}
              className="group/btn flex h-11 items-center gap-2 rounded-full bg-paper pl-5 pr-1.5 text-sm font-medium text-ink transition-opacity disabled:opacity-30"
            >
              {state.step === 5 ? 'Send request' : 'Continue'}
              <span className="grid size-8 place-items-center rounded-full bg-ink text-paper">
                <ArrowRight className="size-4 transition-transform duration-500 group-hover/btn:translate-x-0.5" strokeWidth={1.75} />
              </span>
            </button>
          </>
        )}
      </div>
    </>
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
        <span className="label text-paper/45">Pay in the shop</span>
        <span className="text-4xl font-bold tabular-nums [font-stretch:125%]">{sel.service ? formatPrice(sel.service.price) : '—'}</span>
      </div>

      <label className={`mt-7 flex cursor-pointer items-start gap-3 text-sm ${agreeError ? 'text-[#e58a7e]' : 'text-paper/65'}`}>
        <input type="checkbox" checked={agreed} onChange={(e) => onAgree(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-paper" />
        <span>I agree to the 24-hour cancellation policy. Late cancellations and no-shows may be charged 50%.</span>
      </label>

      <DemoNote className="mt-6" />
    </div>
  )
}

export function DemoNote({ className = '' }: { className?: string }) {
  return (
    <p className={`flex gap-3 rounded-xl border border-dashed border-paper/20 p-4 text-xs leading-relaxed text-paper/55 ${className}`}>
      <Info className="mt-px size-4 shrink-0" strokeWidth={1.5} />
      <span>
        Preview mode — online booking is not connected yet. Sending shows the flow only: no appointment is reserved and nobody
        is notified. To book today, call {site.phone}.
      </span>
    </p>
  )
}

/* ———————————————————————— Done ———————————————————————— */

function Confirmation({ onRestart }: { onRestart: () => void }) {
  const { state } = useBooking()
  const sel = useSelection()
  const assigned =
    state.barberId === 'any' && sel.date && state.time && sel.service ? assignBarber(sel.date, state.time, sel.service.duration) : null
  const first = state.details.name.trim().split(' ')[0]
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }} role="status">
      <div className="label inline-flex items-center gap-2 rounded-full border border-paper/25 px-3 py-2 text-paper/70">
        <span className="size-1.5 rounded-full bg-paper/70" /> Demo request — not booked
      </div>
      <p className="mt-5 text-lg leading-snug">
        Thanks{first ? `, ${first}` : ''}. This is where your confirmation will appear once online booking goes live.{' '}
        <span className="text-paper/55">Nothing has been reserved and no message was sent — call the shop to lock in this time.</span>
      </p>
      <div className="mt-6 text-[0.95rem]">
        <SummaryRow label="Service" value={sel.service ? `${sel.service.name} · ${sel.service.duration} min` : null} step={0} />
        <SummaryRow label="Barber" value={assigned ? `${assigned.name} (assigned)` : sel.barberLabel} step={1} />
        <SummaryRow label="When" value={sel.dateLabel && sel.timeLabel ? `${sel.dateLabel}, ${sel.timeLabel}` : null} step={2} />
        <SummaryRow label="Pay" value={sel.service ? `${formatPrice(sel.service.price)} in the shop` : null} step={3} />
      </div>
      <div className="mt-7 flex flex-wrap gap-2">
        <a href={site.phoneHref} className="flex h-11 items-center gap-2 rounded-full bg-paper px-5 text-sm font-medium text-ink hover:bg-white">
          <Phone className="size-4" strokeWidth={1.5} /> Call to book
        </a>
        <button type="button" onClick={onRestart} className="flex h-11 items-center gap-2 rounded-full border border-paper/30 px-5 text-sm hover:border-paper">
          <RotateCcw className="size-4" strokeWidth={1.5} /> New booking
        </button>
      </div>
    </motion.div>
  )
}
