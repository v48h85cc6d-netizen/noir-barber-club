import { useState } from 'react'

const widths = [480, 768, 1080, 1440, 1920]
const unsplash = (id: string, w: number) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=72`

interface Props {
  id: string
  alt: string
  className?: string
  /** classes for the <img> itself */
  imgClassName?: string
  sizes?: string
  priority?: boolean
  maxWidth?: number
}

/**
 * Responsive, lazy, monochrome image. Falls back to a branded tile if the
 * temporary photo fails to load, so layouts never show a broken image.
 */
export function Img({ id, alt, className = '', imgClassName = '', sizes = '100vw', priority, maxWidth = 1920 }: Props) {
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading')
  const ws = widths.filter((w) => w <= maxWidth)
  return (
    <div className={`relative overflow-hidden bg-ash ${className}`}>
      {state !== 'error' ? (
        <img
          src={unsplash(id, ws[Math.min(2, ws.length - 1)])}
          srcSet={ws.map((w) => `${unsplash(id, w)} ${w}w`).join(', ')}
          sizes={sizes}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          onLoad={() => setState('loaded')}
          onError={() => setState('error')}
          className={`absolute inset-0 h-full w-full object-cover grayscale contrast-[1.08] transition-opacity duration-1000 ${
            state === 'loaded' ? 'opacity-100' : 'opacity-0'
          } ${imgClassName}`}
        />
      ) : (
        <div
          data-img-fallback
          role="img"
          aria-label={alt}
          className={`absolute inset-0 bg-[radial-gradient(120%_90%_at_30%_20%,#3a3a3a_0%,#1a1a1a_45%,#0e0e0e_100%)] ${imgClassName}`}
        />
      )}
    </div>
  )
}
