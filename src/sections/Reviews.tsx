import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Star } from 'lucide-react'
import { useReveal } from '../hooks/useReveal'
import { SectionLabel } from '../components/SectionLabel'
import { reviews } from '../data/content'
import { site } from '../data/site'
import { useI18n } from '../i18n'

const ease = [0.16, 1, 0.3, 1] as const

export function Reviews() {
  const root = useRef<HTMLElement>(null)
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(1)
  const { t, fmt } = useI18n()
  useReveal(root)

  const go = (d: number) => {
    setDir(d)
    setIndex((i) => (i + d + reviews.length) % reviews.length)
  }
  const r = { ...reviews[index], ...t.reviews.items[index] }

  return (
    <section ref={root} id="reviews" className="section-y relative overflow-hidden bg-paper text-ink">
      <div className="shell">
        <SectionLabel index="08">{t.reviews.label}</SectionLabel>

        <div className="mt-8 grid items-center gap-10 lg:grid-cols-12 lg:gap-6">
          <div data-reveal="fade" className="lg:col-span-5">
            <div className="display text-[clamp(7rem,22vw,17rem)] font-[200] leading-[0.85] tracking-[-0.06em] tabular-nums">
              {fmt.number(site.rating.score)}
            </div>
            <div className="label mt-4 flex flex-wrap items-center gap-2 text-ink/55">
              <span className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-3 fill-ink text-ink" />
                ))}
              </span>
              {t.reviews.count(fmt.number(site.rating.count), site.rating.source)}
            </div>
            {site.demoContent && <div className="mt-2 text-xs text-ink/45">{t.reviews.sample}</div>}
          </div>

          {/* Review deck */}
          <div data-reveal="fade" className="relative lg:col-span-7">
            <div className="relative mx-auto max-w-xl lg:ml-0">
              {/* cards stacked behind */}
              <div aria-hidden className="absolute inset-x-0 top-0 h-[calc(100%-4.25rem)] translate-x-3 translate-y-3 rotate-[2.5deg] rounded-3xl bg-ink/70" />
              <div aria-hidden className="absolute inset-x-0 top-0 h-[calc(100%-4.25rem)] translate-x-1.5 translate-y-1.5 rotate-[1deg] rounded-3xl bg-ink/85" />
              <div className="relative overflow-hidden rounded-3xl bg-ink p-7 text-paper md:p-10" aria-live="polite">
                <AnimatePresence mode="wait" custom={dir} initial={false}>
                  <motion.figure
                    key={index}
                    custom={dir}
                    initial={{ opacity: 0, y: dir * 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: dir * -24 }}
                    transition={{ duration: 0.5, ease }}
                    className="flex min-h-[244px] cursor-grab touch-pan-y flex-col justify-between active:cursor-grabbing md:min-h-[240px]"
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.25}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -50) go(1)
                      else if (info.offset.x > 50) go(-1)
                    }}
                  >
                    <blockquote className="text-[clamp(1.25rem,2.3vw,1.85rem)] font-medium leading-[1.22] tracking-[-0.015em] [font-stretch:110%]">
                      “{r.text}”
                    </blockquote>
                    <figcaption className="label mt-8 text-paper/50">
                      {r.name} · {r.meta}
                    </figcaption>
                  </motion.figure>
                </AnimatePresence>
              </div>
              <div className="relative mt-6 flex items-center justify-end gap-2">
                <span className="label mr-auto text-ink/50 tabular-nums">
                  {index + 1} / {reviews.length}
                </span>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label={t.reviews.prev}
                  className="grid size-11 place-items-center rounded-full border border-ink/20 transition-colors hover:border-ink"
                >
                  <ArrowLeft className="size-4" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label={t.reviews.nextAria}
                  className="flex h-11 items-center gap-2 rounded-full bg-ink pl-5 pr-1.5 text-sm text-paper transition-colors hover:bg-black"
                >
                  {t.reviews.next}
                  <span className="grid size-8 place-items-center rounded-full bg-paper text-ink">
                    <ArrowRight className="size-4" strokeWidth={1.75} />
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
