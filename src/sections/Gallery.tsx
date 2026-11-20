import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, ArrowUpRight, Maximize2 } from 'lucide-react'
import { useReveal } from '../hooks/useReveal'
import { useBooking } from '../context/booking'
import { SectionLabel } from '../components/SectionLabel'
import { Img } from '../components/Img'
import { Modal } from '../components/Modal'
import { gallery, services } from '../data/content'
import { formatPrice } from '../data/site'
import { useI18n } from '../i18n'

export function Gallery() {
  const root = useRef<HTMLElement>(null)
  const { bookService } = useBooking()
  const { t, locale } = useI18n()
  const [active, setActive] = useState<number | null>(null)
  useReveal(root)

  return (
    <section ref={root} id="gallery" className="section-y relative bg-ink text-paper">
      <div className="shell">
        <SectionLabel index="05">{t.gallery.label}</SectionLabel>
        <div className="mt-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <h2 key={locale} data-reveal="lines" className="display text-[clamp(2.6rem,6.4vw,6rem)]">
            {t.gallery.a}
            <b>{t.gallery.b}</b>
          </h2>
          <p data-reveal="fade" className="max-w-sm text-sm leading-relaxed text-paper/60">
            {t.gallery.body}
          </p>
        </div>

        <ul data-reveal="stagger" className="mt-10 grid grid-cols-2 gap-2 md:mt-14 md:gap-3 lg:grid-cols-3">
          {gallery.map((g, i) => {
            const svc = services.find((s) => s.id === g.service)
            const caption = t.gallery.captions[g.service]
            return (
              <li key={g.id} className="group relative overflow-hidden rounded-2xl bg-coal">
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  className="relative block w-full overflow-hidden"
                  aria-label={t.gallery.open(caption)}
                >
                  <span className="absolute inset-x-0 top-0 h-1/2 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(255,255,255,0.12),transparent_70%)]" />
                  <Img
                    id={g.id}
                    alt={caption}
                    sizes="(min-width: 1024px) 31vw, 48vw"
                    maxWidth={1080}
                    className="aspect-[4/5] w-full"
                    imgClassName="transition-transform duration-[1.2s] ease-[var(--ease-expo)] group-hover:scale-[1.04]"
                  />
                  <span className="label absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1.5 text-paper/80 backdrop-blur md:left-4 md:top-4">
                    <Maximize2 className="size-3" strokeWidth={1.5} /> #{String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                </button>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 md:p-5">
                  <div className="min-w-0">
                    <div className="text-sm font-bold leading-tight [font-stretch:112%] xs:text-base md:text-xl md:[font-stretch:118%]">{caption}</div>
                    {svc && (
                      <button
                        type="button"
                        onClick={() => bookService(svc.id)}
                        className="label pointer-events-auto mt-1.5 flex items-center gap-1 text-paper/60 transition-colors hover:text-paper"
                      >
                        {t.gallery.bookCut} <ArrowUpRight className="size-3" strokeWidth={1.75} />
                      </button>
                    )}
                  </div>
                  {svc && <span className="shrink-0 text-sm font-semibold tabular-nums md:text-lg">{formatPrice(svc.price)}</span>}
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <Lightbox index={active} onChange={setActive} />
    </section>
  )
}

function Lightbox({ index, onChange }: { index: number | null; onChange: (i: number | null) => void }) {
  const [dir, setDir] = useState(1)
  const close = useCallback(() => onChange(null), [onChange])
  const step = useCallback(
    (d: number) => {
      if (index === null) return
      setDir(d)
      onChange((index + d + gallery.length) % gallery.length)
    },
    [index, onChange],
  )

  useEffect(() => {
    if (index === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [index, step])

  const { t } = useI18n()
  const item = index !== null ? gallery[index] : null
  const caption = item ? t.gallery.captions[item.service] : ''
  return (
    <Modal open={index !== null} onClose={close} label={t.gallery.viewer} variant="full">
      <div className="flex h-full w-full flex-col items-center justify-center gap-5 px-4 py-16 text-paper">
        <div className="relative h-[70svh] w-full max-w-5xl overflow-hidden rounded-2xl">
          <AnimatePresence initial={false} custom={dir} mode="popLayout">
            {item && (
              <motion.div
                key={index}
                custom={dir}
                className="absolute inset-0"
                initial={{ opacity: 0, x: dir * 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -60 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.4}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -60) step(1)
                  else if (info.offset.x > 60) step(-1)
                }}
              >
                <Img id={item.id} alt={caption} sizes="90vw" className="h-full w-full" imgClassName="object-contain! bg-black" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex w-full max-w-5xl items-center justify-between">
          <span className="label">
            {String((index ?? 0) + 1).padStart(2, '0')} / {String(gallery.length).padStart(2, '0')} — {caption}
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={() => step(-1)} aria-label={t.gallery.prev} className="grid size-11 place-items-center rounded-full border border-paper/30 hover:border-paper">
              <ArrowLeft className="size-4" strokeWidth={1.5} />
            </button>
            <button type="button" onClick={() => step(1)} aria-label={t.gallery.next} className="grid size-11 place-items-center rounded-full border border-paper/30 hover:border-paper">
              <ArrowRight className="size-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
