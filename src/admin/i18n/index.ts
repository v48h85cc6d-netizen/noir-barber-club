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
  return { ...i, t, pub: i.t, money }
}

export type { AdminDict }
