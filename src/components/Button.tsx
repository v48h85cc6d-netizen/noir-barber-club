import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'

type Variant = 'light' | 'dark' | 'outline-light' | 'outline-dark'

const styles: Record<Variant, string> = {
  light: 'bg-paper text-ink hover:bg-white',
  dark: 'bg-ink text-paper hover:bg-black',
  'outline-light': 'border border-paper/30 text-paper hover:border-paper hover:bg-paper hover:text-ink',
  'outline-dark': 'border border-ink/25 text-ink hover:border-ink hover:bg-ink hover:text-paper',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
  icon?: boolean
  size?: 'md' | 'lg'
}

/** Rectangular editorial button with a rolling label on hover. */
export function Button({ variant = 'light', children, icon = true, size = 'md', className = '', ...rest }: Props) {
  return (
    <button
      type="button"
      {...rest}
      className={`group/btn relative inline-flex items-center justify-center gap-3 overflow-hidden whitespace-nowrap transition-[background-color,color,border-color,opacity] duration-500 ease-[var(--ease-expo)] disabled:opacity-35 ${
        size === 'lg' ? 'h-14 px-7 md:h-16 md:px-9' : 'h-12 px-6'
      } ${styles[variant]} ${className}`}
    >
      <RollText>{children}</RollText>
      {icon && (
        <ArrowUpRight
          aria-hidden
          className="size-4 shrink-0 transition-transform duration-500 ease-[var(--ease-expo)] group-hover/btn:rotate-45"
          strokeWidth={1.5}
        />
      )}
    </button>
  )
}

export function RollText({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`label relative block overflow-hidden ${className}`}>
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
