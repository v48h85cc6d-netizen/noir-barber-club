import { useId, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { Wordmark } from '../components/Logo'
import { Img } from '../components/Img'
import { LanguageSegmented } from '../components/LanguageSwitcher'
import { ease, inputCls } from './ui'

/**
 * Shared layout for every sign-in / sign-up screen (staff and customers):
 * the NOIR brand photo on large screens, a frosted glass card for the form.
 */
export function AuthLayout({
  eyebrow,
  intro,
  backHref,
  backLabel,
  children,
}: {
  eyebrow: string
  intro: string
  backHref: string
  backLabel: string
  children: ReactNode
}) {
  return (
    <div className="relative grid min-h-svh text-paper lg:grid-cols-[1.1fr_1fr]">
      <div aria-hidden className="cc-backdrop" />
      {/* brand panel */}
      <div className="relative m-3 hidden overflow-hidden rounded-[28px] shadow-[0_30px_60px_-30px_rgba(31,30,28,0.55)] lg:sticky lg:top-3 lg:block lg:h-[calc(100svh-24px)] lg:self-start">
        <div className="absolute inset-0">
          <Img id="photo-1585747860715-2ba37e788b70" alt="" priority className="h-full w-full" imgClassName="brightness-[0.45]" />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_30%_0%,rgba(210,176,122,0.18),transparent_70%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/40" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <a href={backHref} className="label flex items-center gap-2 text-white/70 transition-colors hover:text-white">
            <ArrowLeft className="size-3.5" /> {backLabel}
          </a>
          <div>
            <div className="label text-[#e4cc9f]">{eyebrow}</div>
            <Wordmark className="mt-6 w-full max-w-[560px] text-white" />
            <p className="mt-6 max-w-sm text-white/70">{intro}</p>
          </div>
        </div>
      </div>

      {/* form panel */}
      <div className="relative flex min-w-0 flex-col px-4 py-5 sm:px-10 lg:px-14">
        <div className="flex items-center justify-between gap-3">
          <a href={backHref} className="flex min-w-0 items-center gap-2 lg:invisible" aria-label={backLabel}>
            <Wordmark className="w-24 shrink-0" />
          </a>
          <LanguageSegmented />
        </div>
        {/* centred when it fits; a long form simply makes the page longer (never clipped) */}
        <div className="flex flex-1 items-center justify-center py-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease }}
            className="glass flex w-full min-w-0 max-w-md flex-col rounded-[28px] p-5 sm:p-8"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export function TextField({
  label,
  error,
  hint,
  ...props
}: { label: string; error?: string | false; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <label className="block" htmlFor={id}>
      <span className="label text-paper/55">{label}</span>
      <input
        id={id}
        {...props}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className={`${inputCls} aria-[invalid=true]:border-[#b84a66]/60`}
      />
      {error ? (
        <span id={`${id}-err`} role="alert" className="mt-1.5 block text-xs text-[#9a3550]">
          {error}
        </span>
      ) : (
        hint && <span className="mt-1.5 block text-xs text-paper/45">{hint}</span>
      )}
    </label>
  )
}

export function PasswordField({
  label,
  error,
  hint,
  showLabel,
  hideLabel,
  ...props
}: { label: string; error?: string | false; hint?: string; showLabel: string; hideLabel: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  const [show, setShow] = useState(false)
  return (
    <label className="block" htmlFor={id}>
      <span className="label text-paper/55">{label}</span>
      <span className="relative block">
        <input
          id={id}
          {...props}
          type={show ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          className={`${inputCls} pr-12 aria-[invalid=true]:border-[#b84a66]/60`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? hideLabel : showLabel}
          aria-pressed={show}
          className="absolute right-1.5 top-[calc(50%+4px)] grid size-9 -translate-y-1/2 place-items-center rounded-full text-paper/50 hover:text-paper"
        >
          {show ? <EyeOff className="size-4" strokeWidth={1.5} /> : <Eye className="size-4" strokeWidth={1.5} />}
        </button>
      </span>
      {error ? (
        <span id={`${id}-err`} role="alert" className="mt-1.5 block text-xs text-[#9a3550]">
          {error}
        </span>
      ) : (
        hint && <span className="mt-1.5 block text-xs text-paper/45">{hint}</span>
      )}
    </label>
  )
}

export function FormAlert({ tone = 'error', children }: { tone?: 'error' | 'ok'; children: ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex gap-2.5 rounded-xl border p-3 text-sm ${
        tone === 'error' ? 'border-[#b84a66]/30 bg-[#b84a66]/[0.07] text-[#8a2f48]' : 'border-[#2f8f62]/30 bg-[#2f8f62]/[0.08] text-[#1f5a3d]'
      }`}
    >
      {tone === 'error' ? <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />}
      <span className="min-w-0">{children}</span>
    </div>
  )
}

export function DemoAuthNote({ children }: { children: ReactNode }) {
  return <p className="mt-6 rounded-xl border border-dashed border-[#b8935a]/40 bg-[#d2b07a]/[0.08] p-3 text-xs leading-relaxed text-paper/65">{children}</p>
}
