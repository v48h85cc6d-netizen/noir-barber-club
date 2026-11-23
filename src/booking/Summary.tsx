import { useBooking, type StepIndex } from '../context/booking'
import { endTime, fromKey } from '../lib/schedule'
import { useI18n } from '../i18n'
import { useCatalog } from './catalog'

export function useSelection() {
  const { state } = useBooking()
  const { t, fmt } = useI18n()
  const { services, barbers, db } = useCatalog()
  const service = services.find((s) => s.id === state.serviceId) ?? null
  // after booking, show the barber who actually got the appointment
  const barberId = state.booked?.barberId ?? state.barberId
  const barber = barbers.find((b) => b.id === barberId) ?? db.barbers.find((b) => b.id === barberId) ?? null
  const date = state.date ? fromKey(state.date) : null
  return {
    service,
    barber,
    barberLabel: barberId === 'any' ? t.panel.anyAvailable : (barber?.name ?? null),
    serviceName: service ? t.services.items[service.id].name : null,
    date,
    dateLabel: date ? fmt.date(date, { weekday: 'short', day: 'numeric', month: 'long' }) : null,
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
  const { t } = useI18n()
  const muted = tone === 'dark' ? 'text-paper/40' : 'text-ink/45'
  return (
    <div className={`flex items-baseline justify-between gap-4 border-b py-3 ${tone === 'dark' ? 'border-line' : 'border-ink/12'}`}>
      <span className={`label shrink-0 ${muted}`}>{label}</span>
      <span className="flex min-w-0 items-baseline gap-3 text-right">
        <span className={`min-w-0 break-words ${value ? '' : muted}`}>{value ?? '—'}</span>
        {onEdit && value && (
          <button
            type="button"
            onClick={() => onEdit(step)}
            className={`text-xs underline underline-offset-4 ${muted} hover:opacity-100`}
            aria-label={t.panel.editAria(label.toLowerCase())}
          >
            {t.panel.edit}
          </button>
        )}
      </span>
    </div>
  )
}
