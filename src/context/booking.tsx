import { createContext, useCallback, useContext, useMemo, useReducer, useState, type ReactNode } from 'react'

export const STEPS = ['Barber', 'Service', 'Date', 'Time', 'Details', 'Review'] as const
export type StepIndex = 0 | 1 | 2 | 3 | 4 | 5

/** What the customer booked (set after a successful booking). */
export interface Booked {
  id: string
  ref: string
  barberId: string
}

export interface BookingState {
  step: StepIndex
  barberId: string | null // 'any' allowed
  serviceId: string | null
  date: string | null // yyyy-mm-dd
  time: string | null
  notes: string
  booked: Booked | null
}

/** The part of a booking kept while the visitor signs in or registers. */
export type BookingDraft = Pick<BookingState, 'barberId' | 'serviceId' | 'date' | 'time' | 'notes'>

type Action =
  | { type: 'step'; step: StepIndex }
  | { type: 'service'; id: string }
  | { type: 'barber'; id: string }
  | { type: 'date'; date: string | null }
  | { type: 'time'; time: string | null }
  | { type: 'notes'; notes: string }
  | { type: 'booked'; booked: Booked }
  | { type: 'restore'; draft: BookingDraft; step: StepIndex }
  | { type: 'reset' }

const initial: BookingState = {
  step: 0,
  barberId: null,
  serviceId: null,
  date: null,
  time: null,
  notes: '',
  booked: null,
}

function reducer(s: BookingState, a: Action): BookingState {
  switch (a.type) {
    case 'step':
      return { ...s, step: a.step }
    case 'barber':
      return { ...s, barberId: a.id, time: s.barberId === a.id ? s.time : null, booked: null }
    case 'service':
      // duration may change, so a chosen time might no longer fit
      return { ...s, serviceId: a.id, time: s.serviceId === a.id ? s.time : null, booked: null }
    case 'date':
      return { ...s, date: a.date, time: s.date === a.date ? s.time : null }
    case 'time':
      return { ...s, time: a.time }
    case 'notes':
      return { ...s, notes: a.notes }
    case 'booked':
      return { ...s, booked: a.booked }
    case 'restore':
      return { ...initial, ...a.draft, step: a.step }
    case 'reset':
      return initial
  }
}

/** First step that still needs input. */
export function firstIncomplete(s: Pick<BookingState, 'barberId' | 'serviceId' | 'date' | 'time'>): StepIndex {
  if (!s.barberId) return 0
  if (!s.serviceId) return 1
  if (!s.date) return 2
  if (!s.time) return 3
  return 4
}

/* ———— draft kept across the sign-in / sign-up pages (this tab only) ———— */

const DRAFT_KEY = 'noir.booking.draft'

export function saveDraft(d: BookingDraft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d))
  } catch {
    /* ignore */
  }
}

export function takeDraft(): BookingDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    sessionStorage.removeItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw) as BookingDraft) : null
  } catch {
    return null
  }
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
  /** Re-open a kept draft (after signing in) on the review step. */
  resume: (draft: BookingDraft) => void
  close: () => void
  isOpen: boolean
}

const BookingContext = createContext<Ctx | null>(null)

export function BookingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial)
  const [isOpen, setOpen] = useState(false)

  const go = useCallback((next: Pick<BookingState, 'barberId' | 'serviceId' | 'date' | 'time'>) => {
    dispatch({ type: 'step', step: firstIncomplete(next) })
    setOpen(true)
  }, [])

  const bookService = useCallback(
    (id: string) => {
      const base = state.booked ? initial : state
      if (state.booked) dispatch({ type: 'reset' })
      dispatch({ type: 'service', id })
      go({ ...base, serviceId: id, time: null })
    },
    [state, go],
  )

  const bookBarber = useCallback(
    (id: string) => {
      const base = state.booked ? initial : state
      if (state.booked) dispatch({ type: 'reset' })
      dispatch({ type: 'barber', id })
      go({ ...base, barberId: id, time: null })
    },
    [state, go],
  )

  const resume = useCallback((draft: BookingDraft) => {
    const step = firstIncomplete(draft)
    dispatch({ type: 'restore', draft, step: step === 4 ? 5 : step })
    setOpen(true)
  }, [])

  const open = useCallback(() => setOpen(true), [])
  const close = useCallback(() => setOpen(false), [])

  const value = useMemo(
    () => ({ state, dispatch, bookService, bookBarber, open, resume, close, isOpen }),
    [state, bookService, bookBarber, open, resume, close, isOpen],
  )
  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
}

export function useBooking() {
  const ctx = useContext(BookingContext)
  if (!ctx) throw new Error('useBooking must be used inside BookingProvider')
  return ctx
}
