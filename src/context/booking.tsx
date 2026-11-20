import { createContext, useCallback, useContext, useMemo, useReducer, useState, type ReactNode } from 'react'

export const STEPS = ['Service', 'Barber', 'Date', 'Time', 'Details', 'Review'] as const
export type StepIndex = 0 | 1 | 2 | 3 | 4 | 5

export interface Details {
  name: string
  phone: string
  email: string
  notes: string
}

export interface BookingState {
  step: StepIndex
  serviceId: string | null
  barberId: string | null // 'any' allowed
  date: string | null // yyyy-mm-dd
  time: string | null
  details: Details
  submitted: boolean
}

type Action =
  | { type: 'step'; step: StepIndex }
  | { type: 'service'; id: string }
  | { type: 'barber'; id: string }
  | { type: 'date'; date: string | null }
  | { type: 'time'; time: string }
  | { type: 'details'; details: Partial<Details> }
  | { type: 'submit' }
  | { type: 'reset' }

const initial: BookingState = {
  step: 0,
  serviceId: null,
  barberId: null,
  date: null,
  time: null,
  details: { name: '', phone: '', email: '', notes: '' },
  submitted: false,
}

function reducer(s: BookingState, a: Action): BookingState {
  switch (a.type) {
    case 'step':
      return { ...s, step: a.step }
    case 'service':
      // duration may change, so a chosen time might no longer fit
      return { ...s, serviceId: a.id, time: s.serviceId === a.id ? s.time : null, submitted: false }
    case 'barber':
      return { ...s, barberId: a.id, time: s.barberId === a.id ? s.time : null, submitted: false }
    case 'date':
      return { ...s, date: a.date, time: s.date === a.date ? s.time : null }
    case 'time':
      return { ...s, time: a.time }
    case 'details':
      return { ...s, details: { ...s.details, ...a.details } }
    case 'submit':
      return { ...s, submitted: true }
    case 'reset':
      return { ...initial, details: s.details }
  }
}

/** First step that still needs input. */
export function firstIncomplete(s: BookingState): StepIndex {
  if (!s.serviceId) return 0
  if (!s.barberId) return 1
  if (!s.date) return 2
  if (!s.time) return 3
  return 4
}

interface Ctx {
  state: BookingState
  dispatch: React.Dispatch<Action>
  /** Pre-select a service and open the booking panel. */
  bookService: (id: string) => void
  /** Pre-select a barber and open the booking panel. */
  bookBarber: (id: string) => void
  /** Open the booking panel where the visitor left off. */
  open: () => void
  close: () => void
  isOpen: boolean
}

const BookingContext = createContext<Ctx | null>(null)

export function BookingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial)
  const [isOpen, setOpen] = useState(false)

  const go = useCallback((next: BookingState) => {
    dispatch({ type: 'step', step: firstIncomplete(next) })
    setOpen(true)
  }, [])

  const bookService = useCallback(
    (id: string) => {
      const base = state.submitted ? { ...initial, details: state.details } : state
      if (state.submitted) dispatch({ type: 'reset' })
      dispatch({ type: 'service', id })
      go({ ...base, serviceId: id, time: null })
    },
    [state, go],
  )

  const bookBarber = useCallback(
    (id: string) => {
      const base = state.submitted ? { ...initial, details: state.details } : state
      if (state.submitted) dispatch({ type: 'reset' })
      dispatch({ type: 'barber', id })
      go({ ...base, barberId: id, time: null })
    },
    [state, go],
  )

  const open = useCallback(() => setOpen(true), [])
  const close = useCallback(() => setOpen(false), [])

  const value = useMemo(
    () => ({ state, dispatch, bookService, bookBarber, open, close, isOpen }),
    [state, bookService, bookBarber, open, close, isOpen],
  )
  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
}

export function useBooking() {
  const ctx = useContext(BookingContext)
  if (!ctx) throw new Error('useBooking must be used inside BookingProvider')
  return ctx
}
