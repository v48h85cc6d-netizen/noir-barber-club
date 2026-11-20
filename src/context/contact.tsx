import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { scrollToId } from '../lib/scroll'

/** Subject ids; labels come from the dictionaries (contact.subjects). */
export const SUBJECTS = ['general', 'membership', 'gift', 'events', 'press'] as const
export type Subject = (typeof SUBJECTS)[number]

interface Prefill {
  subject: Subject
  message: string
  /** bumps on every request so the form can re-apply the same prefill */
  nonce: number
}

interface Ctx {
  prefill: Prefill | null
  contactAbout: (subject: Subject, message: string) => void
}

const ContactContext = createContext<Ctx | null>(null)

export function ContactProvider({ children }: { children: ReactNode }) {
  const [prefill, setPrefill] = useState<Prefill | null>(null)
  const contactAbout = useCallback((subject: Subject, message: string) => {
    setPrefill({ subject, message, nonce: Date.now() })
    scrollToId('contact')
  }, [])
  const value = useMemo(() => ({ prefill, contactAbout }), [prefill, contactAbout])
  return <ContactContext.Provider value={value}>{children}</ContactContext.Provider>
}

export function useContact() {
  const ctx = useContext(ContactContext)
  if (!ctx) throw new Error('useContact must be used inside ContactProvider')
  return ctx
}
