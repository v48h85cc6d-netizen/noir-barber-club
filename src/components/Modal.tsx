import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { useI18n } from '../i18n'

interface Props {
  open: boolean
  onClose: () => void
  label: string
  children: ReactNode
  variant?: 'panel' | 'full'
}

export function Modal({ open, onClose, label, children, variant = 'panel' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const { t } = useI18n()

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        if (!f.length) return
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>('[data-autofocus], button')?.focus())
    return () => {
      document.removeEventListener('keydown', onKey)
      document.documentElement.style.overflow = overflow
      prev?.focus?.()
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className={
              variant === 'full'
                ? 'relative flex h-full w-full items-center justify-center'
                : 'relative max-h-[92svh] w-full overflow-y-auto bg-paper text-ink sm:max-w-lg'
            }
            initial={{ y: variant === 'full' ? 0 : 60, opacity: 0, scale: variant === 'full' ? 0.96 : 1 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: variant === 'full' ? 0 : 40, opacity: 0, scale: variant === 'full' ? 0.98 : 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label={t.common.close}
              className={`absolute right-3 top-3 z-10 grid size-11 place-items-center transition-transform duration-500 hover:rotate-90 ${
                variant === 'full' ? 'text-paper' : 'text-ink'
              }`}
            >
              <X strokeWidth={1.25} className="size-6" />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
