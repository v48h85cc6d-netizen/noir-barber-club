import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, animate } from 'motion/react'
import { ArrowLeft, ArrowRight, Star } from 'lucide-react'
import { useReveal } from '../hooks/useReveal'
import { SectionLabel } from '../components/SectionLabel'
import { reviews } from '../data/content'
import { site } from '../data/site'

export function Reviews() {
  const root = useRef<HTMLElement>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const [index, setIndex] = useState(0)
  const [bounds, setBounds] = useState({ left: 0, step: 0, max: 0 })
  useReveal(root)

  // measure card width + drag limits
  useEffect(() => {
    const measure = () => {
      const v = viewport.current
      const t = track.current
      if (!v || !t) return
      const card = t.children[0] as HTMLElement | undefined
      const gap = parseFloat(getComputedStyle(t).columnGap || '0')
      const step = card ? card.offsetWidth + gap : 0
      const left = -Math.max(0, t.scrollWidth - v.offsetWidth)
      const max = step ? Math.ceil(-left / step) : 0
      setBounds({ left, step, max })
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (viewport.current) ro.observe(viewport.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const target = Math.max(bounds.left, -index * bounds.step)
    const controls = animate(x, target, { duration: 0.9, ease: [0.16, 1, 0.3, 1] })
    return () => controls.stop()
  }, [index, bounds, x])

  const go = (d: number) => setIndex((i) => Math.min(bounds.max, Math.max(0, i + d)))

  return (
    <section ref={root} id="reviews" className="section-y relative overflow-hidden bg-ink text-paper">
      <div className="shell">
        <div className="grid gap-10 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <SectionLabel index="08">Reviews</SectionLabel>
            <h2 data-reveal="lines" className="display mt-8 text-[clamp(3rem,9vw,9rem)]">
              Word <br />
              <span className="serif normal-case">on the</span> street
            </h2>
          </div>
          <div data-reveal="fade" className="flex items-end justify-between gap-6 md:col-span-5 md:justify-end md:gap-10">
            <div>
              <div className="display text-[clamp(4rem,8vw,7rem)] tabular-nums">{site.rating.score}</div>
              <div className="mt-3 flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-4 fill-paper text-paper" />
                ))}
              </div>
              <div className="label mt-3 leading-relaxed text-paper/50">
                {site.rating.count.toLocaleString('en-GB')} reviews · {site.rating.source}
              </div>
              {site.demoContent && <div className="mt-2 text-xs text-paper/40">Sample rating and reviews</div>}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => go(-1)}
                disabled={index === 0}
                aria-label="Previous reviews"
                className="grid size-12 place-items-center border border-line transition-colors hover:border-paper disabled:opacity-25"
              >
                <ArrowLeft className="size-4" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                disabled={index >= bounds.max}
                aria-label="Next reviews"
                className="grid size-12 place-items-center border border-line transition-colors hover:border-paper disabled:opacity-25"
              >
                <ArrowRight className="size-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>

        <div ref={viewport} data-reveal="fade" className="mt-14 md:mt-20">
          <motion.div
            ref={track}
            className="flex cursor-grab touch-pan-y gap-3 active:cursor-grabbing md:gap-4"
            style={{ x }}
            drag="x"
            dragConstraints={{ left: bounds.left, right: 0 }}
            dragElastic={0.08}
            onDragEnd={(_, info) => {
              const current = x.get() + info.velocity.x * 0.2
              const next = bounds.step ? Math.round(-current / bounds.step) : 0
              setIndex(Math.min(bounds.max, Math.max(0, next)))
              // ensure snap even if index didn't change
              animate(x, Math.max(bounds.left, -Math.min(bounds.max, Math.max(0, next)) * bounds.step), {
                duration: 0.8,
                ease: [0.16, 1, 0.3, 1],
              })
            }}
          >
            {reviews.map((r) => (
              <figure
                key={r.name}
                className="flex w-[85vw] max-w-[440px] shrink-0 select-none flex-col justify-between border border-line bg-coal p-6 sm:w-[60vw] md:p-8 lg:w-[30vw]"
              >
                <div>
                  <div className="flex gap-1" aria-label={`${r.rating} out of 5 stars`}>
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} className="size-3.5 fill-paper text-paper" />
                    ))}
                  </div>
                  <blockquote className="serif mt-6 text-[clamp(1.4rem,2vw,1.85rem)] leading-[1.18]">“{r.text}”</blockquote>
                </div>
                <figcaption className="mt-10 flex items-center gap-3 border-t border-line pt-5">
                  <span className="grid size-10 place-items-center bg-paper text-sm font-bold text-ink [font-stretch:125%]">
                    {r.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </span>
                  <span>
                    <span className="block font-semibold">{r.name}</span>
                    <span className="label mt-1 block text-paper/45">{r.meta}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </motion.div>
        </div>
        <div className="mt-8 flex gap-1.5" aria-hidden>
          {Array.from({ length: bounds.max + 1 }).map((_, i) => (
            <span key={i} className={`h-px flex-1 transition-colors duration-500 ${i <= index ? 'bg-paper' : 'bg-paper/20'}`} />
          ))}
        </div>
      </div>
    </section>
  )
}
