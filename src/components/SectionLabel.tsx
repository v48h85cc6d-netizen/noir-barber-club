interface Props {
  index: string
  children: string
  className?: string
}

/** "(03) — Booking" style eyebrow used at the top of each section. */
export function SectionLabel({ index, children, className = '' }: Props) {
  return (
    <div data-reveal="fade" className={`label flex items-center gap-4 ${className}`}>
      <span className="opacity-50">({index})</span>
      <span className="h-px w-10 bg-current opacity-30" />
      <span>{children}</span>
    </div>
  )
}
