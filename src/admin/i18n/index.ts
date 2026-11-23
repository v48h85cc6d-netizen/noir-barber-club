import { useI18n } from '../../i18n'
import en, { type AdminDict } from './en'
import de from './de'
import sq from './sq'

const dicts = { en, de, sq } as const

/** Dashboard copy for the active language, plus the shared formatters and public copy (service names etc.). */
export function useAdminT() {
  const i = useI18n()
  const t: AdminDict = dicts[i.locale]
  const money = (n: number, digits = 0) => `€${i.fmt.number(n, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
  /** Role, specialty and bio of a barber: website copy for the founding team, the owner's entries for barbers added later. */
  const person = (b: { id: string; specialty: string; bio: string }) => {
    const p = (i.t.barbers.people as Record<string, { role: string; specialty: string; bio: string } | undefined>)[b.id]
    return { role: p?.role ?? t.common.barber, specialty: b.specialty || p?.specialty || '', bio: b.bio || p?.bio || '' }
  }
  return { ...i, t, pub: i.t, money, person }
}

export type { AdminDict }
