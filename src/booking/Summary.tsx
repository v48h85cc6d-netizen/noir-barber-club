import { barbers, services } from '../data/content'
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
    <div className={`flex items-baseline justify-between gap-4 border-b py-3 ${tone === 'dark' ? 'border-line' : 'border-ink/12'}`}>
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
