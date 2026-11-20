interface Props {
  index: string
  children: string
  className?: string
}

/** "#03 — The barbers" eyebrow used at the top of each section. */
export function SectionLabel({ index, children, className = '' }: Props) {
  return (
    <div data-reveal="fade" className={`label opacity-60 ${className}`}>
      #{index} — {children}
    </div>
  )
}
