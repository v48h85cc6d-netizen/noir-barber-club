import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'

type Variant = 'light' | 'dark' | 'outline-light' | 'outline-dark'

const styles: Record<Variant, { btn: string; dot: string }> = {
  light: { btn: 'bg-paper text-ink hover:bg-white', dot: 'bg-ink text-paper' },
  dark: { btn: 'bg-ink text-paper hover:bg-black', dot: 'bg-paper text-ink' },
  'outline-light': { btn: 'border border-paper/30 text-paper hover:border-paper', dot: 'bg-paper text-ink' },
  'outline-dark': { btn: 'border border-ink/25 text-ink hover:border-ink', dot: 'bg-ink text-paper' },
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
  icon?: boolean
  size?: 'md' | 'lg'
}

/** Pill button with a round arrow badge; the label rolls on hover. */
export function Button({ variant = 'light', children, icon = true, size = 'md', className = '', ...rest }: Props) {
  const s = styles[variant]
  return (
    <button
      type="button"
      {...rest}
      className={`group/btn relative inline-flex items-center justify-center gap-3 overflow-hidden whitespace-nowrap rounded-full transition-[background-color,color,border-color,opacity] duration-500 ease-[var(--ease-expo)] disabled:opacity-35 ${
        size === 'lg' ? 'h-14 text-[0.95rem]' : 'h-11 text-sm'
      } ${icon ? (size === 'lg' ? 'pl-7 pr-2' : 'pl-5 pr-1.5') : size === 'lg' ? 'px-8' : 'px-6'} ${s.btn} ${className}`}
    >
      <RollText className="font-medium">{children}</RollText>
      {icon && (
        <span className={`grid shrink-0 place-items-center rounded-full ${size === 'lg' ? 'size-10' : 'size-8'} ${s.dot}`}>
          <ArrowUpRight
            aria-hidden
            className="size-4 transition-transform duration-500 ease-[var(--ease-expo)] group-hover/btn:rotate-45"
            strokeWidth={1.75}
          />
        </span>
      )}
    </button>
  )
}

export function RollText({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`relative block overflow-hidden leading-[1.3] ${className}`}>
      <span className="block transition-transform duration-500 ease-[var(--ease-expo)] group-hover/btn:-translate-y-full group-hover/link:-translate-y-full">
        {children}
      </span>
      <span
        aria-hidden
        className="absolute inset-0 block translate-y-full transition-transform duration-500 ease-[var(--ease-expo)] group-hover/btn:translate-y-0 group-hover/link:translate-y-0"
      >
        {children}
      </span>
    </span>
  )
}
