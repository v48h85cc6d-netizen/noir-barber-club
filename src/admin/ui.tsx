import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  Ban,
  Check,
  CheckCheck,
  CircleDashed,
  Clock,
  Footprints,
  Scissors,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Img } from '../components/Img'
import type { AppointmentStatus } from './data/types'
import { useAdminT } from './i18n'

export const ease = [0.16, 1, 0.3, 1] as const

/** Current time, refreshed every minute (keeps renders pure). */
export function useNow(every = 60_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), every)
    return () => clearInterval(id)
  }, [every])
  return now
}

/* ———————————————————— layout ———————————————————— */

export function PageHeader({ eyebrow, title, intro, actions }: { eyebrow?: string; title: ReactNode; intro?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="label mb-3 text-paper/45">{eyebrow}</div>}
        <h1 className="display text-[clamp(1.9rem,3.4vw,2.9rem)]">{title}</h1>
        {intro && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-paper/55">{intro}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function Card({ title, aside, children, className = '', pad = true }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section
      className={`rounded-2xl border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.01))] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_24px_48px_-32px_rgba(0,0,0,0.8)] ${className}`}
    >
      {(title || aside) && (
        <div className={`flex items-center justify-between gap-3 ${pad ? 'px-5 pt-5 md:px-6 md:pt-6' : 'px-5 py-4 md:px-6'}`}>
          {title && <h2 className="label text-paper/55">{title}</h2>}
          {aside}
        </div>
      )}
      <div className={pad ? 'p-5 md:p-6' : ''}>{children}</div>
    </section>
  )
}

export function Kpi({ label, value, delta, hint, accent }: { label: string; value: ReactNode; delta?: number | null; hint?: string; accent?: boolean }) {
  const { t, fmt } = useAdminT()
  return (
    <Card className="relative overflow-hidden">
      {accent && <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#d2b07a,transparent)]" />}
      <div className="label text-paper/50">{label}</div>
      <div className="mt-3 text-[clamp(1.8rem,2.6vw,2.4rem)] font-semibold leading-none tracking-[-0.03em] tabular-nums [font-stretch:118%]">{value}</div>
      {delta !== undefined && delta !== null && (
        <div className={`mt-3 text-xs ${delta >= 0 ? 'text-[#7fcfa6]' : 'text-[#e8909f]'}`}>
          {delta >= 0 ? '▲' : '▼'} {t.common.vsPrev(`${fmt.number(Math.abs(delta), { maximumFractionDigits: 0 })}%`)}
        </div>
      )}
      {hint && <div className="mt-3 text-xs text-paper/45">{hint}</div>}
    </Card>
  )
}

/* ———————————————————— status ———————————————————— */

const STATUS: Record<AppointmentStatus, { icon: LucideIcon; cls: string }> = {
  booked: { icon: CircleDashed, cls: 'border-white/15 text-paper/70' },
  confirmed: { icon: Check, cls: 'border-[#5f95d6]/40 bg-[#5f95d6]/10 text-[#a9c6ec]' },
  arrived: { icon: Footprints, cls: 'border-[#d2b07a]/45 bg-[#d2b07a]/10 text-[#e4cc9f]' },
  in_chair: { icon: Scissors, cls: 'border-[#d2b07a] bg-[#d2b07a] text-ink' },
  completed: { icon: CheckCheck, cls: 'border-[#55b386]/35 bg-[#55b386]/10 text-[#9fd8bb]' },
  no_show: { icon: Ban, cls: 'border-[#d97a93]/40 bg-[#d97a93]/10 text-[#efb0c0]' },
  cancelled: { icon: X, cls: 'border-white/10 text-paper/40 line-through decoration-paper/30' },
}

export function StatusPill({ status, size = 'sm' }: { status: AppointmentStatus; size?: 'sm' | 'md' }) {
  const { t } = useAdminT()
  const s = STATUS[status]
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border ${size === 'md' ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[0.7rem]'} font-medium ${s.cls}`}>
      <s.icon className="size-3" strokeWidth={2} aria-hidden />
      {t.status[status]}
    </span>
  )
}

/** Generic labelled pill for non-appointment states (always icon or dot + text). */
export function Tag({ tone = 'neutral', children }: { tone?: 'neutral' | 'gold' | 'good' | 'warn' | 'bad' | 'info'; children: ReactNode }) {
  const map = {
    neutral: 'border-white/12 text-paper/65',
    gold: 'border-[#d2b07a]/45 bg-[#d2b07a]/10 text-[#e4cc9f]',
    good: 'border-[#55b386]/35 bg-[#55b386]/10 text-[#9fd8bb]',
    warn: 'border-[#e0a43a]/45 bg-[#e0a43a]/10 text-[#f0c879]',
    bad: 'border-[#d97a93]/40 bg-[#d97a93]/10 text-[#efb0c0]',
    info: 'border-[#5f95d6]/40 bg-[#5f95d6]/10 text-[#a9c6ec]',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.7rem] font-medium ${map[tone]}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  )
}

/* ———————————————————— controls ———————————————————— */

export function Segmented<T extends string>({ value, options, onChange, label, size = 'sm' }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string; size?: 'sm' | 'md' }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
      {options.map((o) => {
        const on = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={`relative rounded-full ${size === 'md' ? 'h-10 px-4 text-sm' : 'h-8 px-3.5 text-[0.8rem]'} transition-colors ${on ? 'text-ink' : 'text-paper/60 hover:text-paper'}`}
          >
            {on && <motion.span layoutId={`seg-${label}`} className="absolute inset-0 rounded-full bg-paper" transition={{ duration: 0.4, ease }} />}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function Select({ value, onChange, label, children, className = '' }: { value: string; onChange: (v: string) => void; label: string; children: ReactNode; className?: string }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-10 appearance-none rounded-full border border-white/10 bg-white/[0.03] bg-[url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='12'%20height='8'%20fill='none'%20stroke='%238b8a86'%20stroke-width='1.5'%3E%3Cpath%20d='M1%201l5%205%205-5'/%3E%3C/svg%3E")] bg-[position:right_14px_center] bg-no-repeat pl-4 pr-9 text-sm text-paper outline-none transition-colors hover:border-white/25 focus:border-[#d2b07a]/60 ${className}`}
    >
      {children}
    </select>
  )
}

export function Btn({ children, onClick, tone = 'ghost', size = 'md', disabled, type = 'button', className = '', ...rest }: { children: ReactNode; onClick?: () => void; tone?: 'primary' | 'ghost' | 'gold' | 'danger'; size?: 'sm' | 'md' | 'lg'; disabled?: boolean; type?: 'button' | 'submit'; className?: string } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children' | 'type'>) {
  const tones = {
    primary: 'bg-paper text-ink hover:bg-white',
    gold: 'bg-[#d2b07a] text-ink hover:bg-[#dcbd8b]',
    ghost: 'border border-white/12 text-paper hover:border-white/30 hover:bg-white/[0.04]',
    danger: 'border border-[#d97a93]/40 text-[#efb0c0] hover:bg-[#d97a93]/10',
  }
  const sizes = { sm: 'h-8 px-3.5 text-[0.8rem]', md: 'h-10 px-4 text-sm', lg: 'h-14 px-6 text-base' }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      {...rest}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[background-color,border-color,color,opacity,transform] duration-300 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-35 ${tones[tone]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className="grid shrink-0 place-items-center rounded-full border border-white/10 bg-[linear-gradient(140deg,#2a2a2e,#18181b)] font-semibold text-paper/80 [font-stretch:115%]"
    >
      {initials}
    </span>
  )
}

/** Photo avatar for barbers with a fixed pixel size. */
export function BarberAvatar({ image, name, size = 36 }: { image: string; name: string; size?: number }) {
  return (
    <span style={{ width: size, height: size }} className="relative block shrink-0 overflow-hidden rounded-full ring-1 ring-white/15">
      <Img id={image} alt={name} sizes={`${size * 2}px`} maxWidth={480} className="h-full w-full" />
    </span>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-white/10 px-6 py-10 text-center text-sm text-paper/45">{children}</div>
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label text-paper/50">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-paper/40">{hint}</span>}
    </label>
  )
}

export const inputCls =
  'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[0.95rem] text-paper outline-none transition-colors placeholder:text-paper/30 focus:border-[#d2b07a]/60'

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${checked ? 'border-[#d2b07a] bg-[#d2b07a]' : 'border-white/15 bg-white/[0.06]'}`}
    >
      <span className={`absolute top-1/2 size-5 -translate-y-1/2 rounded-full transition-[left,background-color] duration-300 ${checked ? 'left-[24px] bg-ink' : 'left-[3px] bg-paper/70'}`} />
    </button>
  )
}

/* ———————————————————— side sheet ———————————————————— */

export function Sheet({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const { t } = useAdminT()
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>('[data-close]')?.focus())
    return () => {
      document.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [open, onClose])
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[120]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px]" onClick={onClose} aria-hidden />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : undefined}
            className={`absolute inset-x-0 bottom-0 max-h-[92svh] overflow-y-auto rounded-t-3xl border border-white/10 bg-[#141416] text-paper shadow-[0_-30px_80px_-20px_rgba(0,0,0,0.7)] sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[460px] sm:rounded-none sm:rounded-l-3xl ${wide ? 'lg:w-[560px]' : ''}`}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.5, ease }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/[0.06] bg-[#141416]/95 px-5 py-4 backdrop-blur md:px-6">
              <div className="min-w-0 text-lg font-semibold [font-stretch:115%]">{title}</div>
              <button type="button" data-close onClick={onClose} aria-label={t.common.close} className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 hover:border-white/30">
                <X className="size-4" strokeWidth={1.5} />
              </button>
            </div>
            <div className="p-5 pb-10 md:p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/* ———————————————————— toasts ———————————————————— */

type Toast = { id: number; text: string; tone: 'ok' | 'error' }
const ToastCtx = createContext<(text: string, tone?: Toast['tone']) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const push = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = Date.now() + Math.random()
    setItems((s) => [...s, { id, text, tone }])
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 3200)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[130] flex flex-col items-center gap-2 px-4 lg:bottom-6">
        <AnimatePresence>
          {items.map((x) => (
            <motion.div
              key={x.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.35, ease }}
              className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm shadow-[0_20px_40px_-12px_rgba(0,0,0,0.7)] backdrop-blur ${
                x.tone === 'ok' ? 'border-[#d2b07a]/40 bg-[#1a1814]/95 text-paper' : 'border-[#d97a93]/40 bg-[#1d1418]/95 text-[#f2c2cf]'
              }`}
            >
              {x.tone === 'ok' ? <Check className="size-4 text-[#d2b07a]" /> : <Ban className="size-4" />}
              {x.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)

/** Runs a store action and reports the outcome in the active language. */
export function useAct() {
  const toast = useToast()
  const { t } = useAdminT()
  return (r: { ok: true } | { ok: false; reason: 'forbidden' | 'invalid' }, okText?: string) => {
    if (r.ok) toast(okText ?? t.common.savedDemo)
    else toast(r.reason === 'forbidden' ? t.common.forbidden : t.common.invalid, 'error')
    return r.ok
  }
}

export const ClockIcon = Clock
