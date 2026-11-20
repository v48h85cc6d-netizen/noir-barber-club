import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import en, { type Dict } from './en'
import de from './de'
import sq from './sq'

/** Order shown in the switcher. */
export const LOCALES = ['sq', 'de', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en'

const dictionaries: Record<Locale, Dict> = { en, de, sq }
/** BCP 47 tags used for Intl date/number formatting. */
const intlTags: Record<Locale, string> = { en: 'en-GB', de: 'de-DE', sq: 'sq-AL' }
const STORAGE_KEY = 'noir.locale'

const isLocale = (v: unknown): v is Locale => typeof v === 'string' && (LOCALES as readonly string[]).includes(v)

/** First visit → English. Afterwards the visitor's last choice, or an explicit ?lang= link. */
function initialLocale(storageKey: string): Locale {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('lang')
    if (isLocale(fromUrl)) return fromUrl
    const stored = window.localStorage.getItem(storageKey)
    if (isLocale(stored)) return stored
  } catch {
    /* storage unavailable (private mode etc.) */
  }
  return DEFAULT_LOCALE
}

/**
 * Albanian calendar names. Chromium ships without Albanian locale data, so
 * Intl would silently fall back to English; these tables cover that case.
 */
const SQ = {
  weekdays: ['e diel', 'e hënë', 'e martë', 'e mërkurë', 'e enjte', 'e premte', 'e shtunë'],
  weekdaysShort: ['Die', 'Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht'],
  months: ['janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor', 'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor'],
  monthsShort: ['jan', 'shk', 'mar', 'pri', 'maj', 'qer', 'korr', 'gush', 'sht', 'tet', 'nën', 'dhj'],
}

const supported = (tag: string) => {
  try {
    return Intl.DateTimeFormat.supportedLocalesOf([tag]).length > 0
  } catch {
    return false
  }
}

export function makeFormat(locale: Locale) {
  const tag = intlTags[locale]
  const native = locale !== 'sq' || supported(tag)

  /** Albanian fallback for the few patterns the site uses (weekday / day / month). */
  const sqDate = (d: Date, o: Intl.DateTimeFormatOptions) => {
    const wd = o.weekday ? (o.weekday === 'long' ? SQ.weekdays : SQ.weekdaysShort)[d.getDay()] : ''
    const mo = o.month ? (o.month === 'long' ? SQ.months : SQ.monthsShort)[d.getMonth()] : ''
    const dm = [o.day ? d.getDate() : '', mo].filter(Boolean).join(' ')
    return [wd, dm].filter(Boolean).join(', ')
  }

  return {
    tag,
    /** e.g. "Sat 22 November" / "Sa., 22. November" / "Sht, 22 nëntor" */
    date: (d: Date, opts: Intl.DateTimeFormatOptions) => (native ? d.toLocaleDateString(tag, opts) : sqDate(d, opts)),
    weekday: (d: Date, style: 'long' | 'short' = 'long') =>
      native ? d.toLocaleDateString(tag, { weekday: style }) : (style === 'long' ? SQ.weekdays : SQ.weekdaysShort)[d.getDay()],
    // Albanian uses a decimal comma and a space as thousands separator (same as French formatting)
    number: (n: number, opts?: Intl.NumberFormatOptions) => n.toLocaleString(native ? tag : 'fr-FR', opts),
  }
}

interface Ctx {
  locale: Locale
  t: Dict
  setLocale: (l: Locale) => void
  fmt: ReturnType<typeof makeFormat>
}

const I18nContext = createContext<Ctx | null>(null)

interface ProviderProps {
  children: ReactNode
  /** Where the choice is remembered. The dashboard uses one key per signed-in user. */
  storageKey?: string
  /** Public site: keep <title> and meta description in sync. The dashboard sets its own. */
  manageDocument?: boolean
}

export function I18nProvider({ children, storageKey = STORAGE_KEY, manageDocument = true }: ProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => initialLocale(storageKey))

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    try {
      window.localStorage.setItem(storageKey, l)
    } catch {
      /* ignore */
    }
  }, [storageKey])

  const t = dictionaries[locale]

  // keep the document language, title and description in sync
  useEffect(() => {
    document.documentElement.lang = locale
    if (manageDocument) {
      document.title = t.meta.title
      document.querySelector('meta[name="description"]')?.setAttribute('content', t.meta.description)
    }
    // a ?lang= link has done its job once applied; keep URLs clean
    try {
      const url = new URL(window.location.href)
      if (url.searchParams.has('lang')) {
        url.searchParams.delete('lang')
        window.history.replaceState(null, '', url)
      }
      window.localStorage.setItem(storageKey, locale)
    } catch {
      /* ignore */
    }
  }, [locale, t, storageKey, manageDocument])

  const value = useMemo(() => ({ locale, t, setLocale, fmt: makeFormat(locale) }), [locale, t, setLocale])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}

/** "today" / "tomorrow" / weekday name, in the active language. */
export function relativeDay(offset: number, date: Date, t: Dict, fmt: Ctx['fmt']) {
  if (offset === 0) return t.common.todayLower
  if (offset === 1) return t.common.tomorrowLower
  return fmt.weekday(date)
}

export type { Dict }
