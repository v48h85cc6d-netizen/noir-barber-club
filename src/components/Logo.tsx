import markRaw from '../assets/logo-mark.svg?raw'
import tagRaw from '../assets/logo-tag.svg?raw'

function parse(raw: string) {
  const viewBox = raw.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 100 100'
  const d = [...raw.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join(' ')
  return { viewBox, d }
}

const MARK = parse(markRaw)
const TAG = parse(tagRaw)

interface Props {
  className?: string
  title?: string
}

/** The NØIR wordmark, traced from the brand logo. Inherits text color. */
export function Wordmark({ className, title = 'NOIR' }: Props) {
  return (
    <svg viewBox={MARK.viewBox} className={className} role="img" aria-label={title} fill="currentColor">
      <path d={MARK.d} fillRule="evenodd" />
    </svg>
  )
}

/** The spaced "BARBER SHOP" line from the logo lockup. */
export function Tagline({ className }: Props) {
  return (
    <svg viewBox={TAG.viewBox} className={className} aria-hidden="true" fill="currentColor">
      <path d={TAG.d} fillRule="evenodd" />
    </svg>
  )
}

/** Full lockup: wordmark above the tagline, matching the logo proportions. */
export function Lockup({ className }: Props) {
  return (
    <div className={className} role="img" aria-label="NOIR Barber Shop">
      <Wordmark className="block h-auto w-full" />
      <Tagline className="mt-[7.5%] block h-auto w-[95.4%]" />
    </div>
  )
}
