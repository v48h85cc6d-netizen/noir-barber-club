import { barbers, services } from '../data/content'
import { formatPrice } from '../data/site'
import { useBooking, type StepIndex } from '../context/booking'
import { endTime, fromKey } from '../lib/schedule'

export function useSelection() {
  const { state } = useBooking()
  const service = services.find((s) => s.id === state.serviceId) ?? null
  const barber = barbers.find((b) => b.id === state.barberId) ?? null
  const date = state.date ? fromKey(state.date) : null
  return {
    service,
    barber,
    barberLabel: state.barberId === 'any' ? 'Any available' : (barber?.name ?? null),
    date,
    dateLabel: date ? date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' }) : null,
    timeLabel: state.time && service ? `${state.time} – ${endTime(state.time, service.duration)}` : null,
  }
}

interface RowProps {
  label: string
  value: string | null
  step: StepIndex
  onEdit?: (s: StepIndex) => void
  tone?: 'dark' | 'light'
}

export function SummaryRow({ label, value, step, onEdit, tone = 'dark' }: RowProps) {
  const muted = tone === 'dark' ? 'text-paper/40' : 'text-ink/45'
  return (
    <div className={`flex items-baseline justify-between gap-4 border-b py-3.5 ${tone === 'dark' ? 'border-line' : 'border-ink/12'}`}>
      <span className={`label ${muted}`}>{label}</span>
      <span className="flex items-baseline gap-3 text-right">
        <span className={value ? '' : muted}>{value ?? '—'}</span>
        {onEdit && value && (
          <button
            type="button"
            onClick={() => onEdit(step)}
            className={`text-xs underline underline-offset-4 ${muted} hover:opacity-100`}
            aria-label={`Edit ${label.toLowerCase()}`}
          >
            Edit
          </button>
        )}
      </span>
    </div>
  )
}

/** Live order summary shown beside the steps on desktop. */
export function Summary() {
  const sel = useSelection()
  return (
    <div className="border border-line bg-coal p-5 md:p-6">
      <div className="label text-paper/45">Your appointment</div>
      <div className="mt-4 text-[0.95rem]">
        <SummaryRow label="Service" value={sel.service?.name ?? null} step={0} />
        <SummaryRow label="Barber" value={sel.barberLabel} step={1} />
        <SummaryRow label="Date" value={sel.dateLabel} step={2} />
        <SummaryRow label="Time" value={sel.timeLabel} step={3} />
      </div>
      <div className="mt-6 flex items-end justify-between">
        <span className="label text-paper/45">Total</span>
        <span className="display text-4xl tabular-nums">{sel.service ? formatPrice(sel.service.price) : '—'}</span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-paper/40">Pay in the shop after your cut. Free cancellation up to 24 hours before.</p>
    </div>
  )
}
