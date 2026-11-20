import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown } from 'lucide-react'
import { LOCALES, useI18n } from '../i18n'

/** Segmented SQ · DE · EN control (desktop nav and the mobile menu overlay). */
export function LanguageSegmented({ size = 'sm', className = '' }: { size?: 'sm' | 'lg'; className?: string }) {
  const { locale, setLocale, t } = useI18n()
  const id = useId()
  return (
    <div
      role="radiogroup"
      aria-label={t.lang.label}
      className={`relative flex items-center rounded-full border border-white/10 bg-ink/70 p-1 text-paper backdrop-blur-md ${className}`}
    >
      {LOCALES.map((l) => {
        const on = l === locale
        return (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={on}
            lang={l}
            aria-label={t.lang.names[l]}
            title={t.lang.names[l]}
            onClick={() => setLocale(l)}
            className={`label relative rounded-full transition-colors duration-300 ${
              size === 'lg' ? 'h-11 px-5 text-sm' : 'h-8 px-3'
            } ${on ? 'text-ink' : 'text-paper/60 hover:text-paper'}`}
          >
            {on && (
              <motion.span
                layoutId={`lang-pill-${id}`}
                className="absolute inset-0 rounded-full bg-paper"
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
            <span className="relative">{l.toUpperCase()}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Compact dropdown for the mobile header, where space is tight. */
export function LanguageDropdown({ className = '' }: { className?: string }) {
  const { locale, setLocale, t } = useI18n()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${t.lang.change} (${t.lang.names[locale]})`}
        className="label flex h-10 items-center gap-1 rounded-full border border-white/10 bg-ink/70 pl-3 pr-2 text-paper backdrop-blur-md"
      >
        {locale.toUpperCase()}
        <ChevronDown className={`size-3.5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} strokeWidth={1.75} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            id={listId}
            role="listbox"
            aria-label={t.lang.label}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full mt-2 w-44 origin-top-right overflow-hidden rounded-2xl border border-white/10 bg-ink/95 p-1 text-paper shadow-[0_20px_40px_-12px_rgba(0,0,0,0.6)] backdrop-blur-md"
          >
            {LOCALES.map((l) => {
              const on = l === locale
              return (
                <li key={l} role="option" aria-selected={on}>
                  <button
                    type="button"
                    lang={l}
                    onClick={() => {
                      setLocale(l)
                      setOpen(false)
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                      on ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <span>
                      {t.lang.names[l]}
                      <span className="label ml-2 text-paper/40">{l.toUpperCase()}</span>
                    </span>
                    {on && <Check className="size-4" strokeWidth={1.75} />}
                  </button>
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
