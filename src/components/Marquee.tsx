import { Fragment } from 'react'

interface Props {
  items: string[]
  className?: string
  reverse?: boolean
}

export function Marquee({ items, className = '', reverse }: Props) {
  const row = (
    <div className="flex shrink-0 items-center" aria-hidden>
      {items.map((t, i) => (
        <Fragment key={i}>
          <span className="display px-6 text-[clamp(2.75rem,8vw,7.5rem)] md:px-10">{t}</span>
          <span className="serif px-2 text-[clamp(2rem,5vw,4.5rem)] opacity-60">✶</span>
        </Fragment>
      ))}
    </div>
  )
  return (
    <div className={`relative flex overflow-hidden whitespace-nowrap ${className}`} role="presentation">
      <span className="sr-only">{items.join(' · ')}</span>
      <div className={`marquee-track flex ${reverse ? 'marquee-reverse' : ''}`}>
        {row}
        {row}
      </div>
    </div>
  )
}
