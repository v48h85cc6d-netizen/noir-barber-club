import { useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useSpring } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import { useReveal } from '../hooks/useReveal'
import { useBooking } from '../context/booking'
import { SectionLabel } from '../components/SectionLabel'
import { Img } from '../components/Img'
import { serviceCategories, services, type ServiceCategory } from '../data/content'
import { formatPrice } from '../data/site'

type Filter = 'All' | ServiceCategory
const filters: Filter[] = ['All', ...serviceCategories]

export function Services() {
  const root = useRef<HTMLElement>(null)
  const { bookService } = useBooking()
  const [filter, setFilter] = useState<Filter>('All')
  const [hovered, setHovered] = useState<string | null>(null)
  useReveal(root)

  // cursor-following preview (pointer devices only)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 220, damping: 26, mass: 0.6 })
  const sy = useSpring(y, { stiffness: 220, damping: 26, mass: 0.6 })

  const list = services.filter((s) => filter === 'All' || s.category === filter)
  const hoveredService = services.find((s) => s.id === hovered)

  return (
    <section
      ref={root}
      id="services"
      className="section-y relative bg-paper text-ink"
      onPointerMove={(e) => {
        x.set(e.clientX)
        y.set(e.clientY)
      }}
    >
      <div className="shell">
        <SectionLabel index="04">The menu</SectionLabel>
        <div className="mt-8 grid gap-6 md:grid-cols-12 md:items-end">
          <h2 data-reveal="lines" className="display text-[clamp(2.6rem,6.4vw,6rem)] md:col-span-8">
            Fixed prices. <b>No surprises.</b>
          </h2>
          <p data-reveal="fade" className="max-w-sm text-sm leading-relaxed text-ink/60 md:col-span-4">
            Every price includes a consultation, the wash and a hot towel on the neck. What you see is what you pay at the
            chair.
          </p>
        </div>

        <div data-reveal="fade" role="tablist" aria-label="Filter services" className="no-scrollbar -mx-4 mt-10 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:mt-14 md:px-0">
          {filters.map((f) => (
            <button
              key={f}
              role="tab"
              type="button"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={`relative shrink-0 rounded-full px-4 py-2 text-sm transition-colors ${
                filter === f ? 'text-paper' : 'text-ink/55 hover:text-ink'
              }`}
            >
              {filter === f && (
                <motion.span layoutId="svc-tab" className="absolute inset-0 -z-0 rounded-full bg-ink" transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} />
              )}
              <span className="relative">
                {f}
                <span className="ml-1.5 opacity-50">
                  {f === 'All' ? services.length : services.filter((s) => s.category === f).length}
                </span>
              </span>
            </button>
          ))}
        </div>

        <motion.ul layout className="relative mt-6 border-t border-ink/12" onPointerLeave={() => setHovered(null)}>
          <AnimatePresence initial={false} mode="popLayout">
            {list.map((s) => {
              const num = services.indexOf(s)
              const dim = hovered && hovered !== s.id
              return (
                <motion.li
                  layout
                  key={s.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="border-b border-ink/12"
                >
                  <button
                    type="button"
                    onClick={() => bookService(s.id)}
                    onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(s.id)}
                    className={`group/row grid w-full grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1 py-5 text-left transition-opacity duration-500 md:grid-cols-12 md:gap-x-6 md:py-7 ${
                      dim ? 'opacity-30' : 'opacity-100'
                    }`}
                  >
                    <span className="display row-span-2 w-12 self-start text-[clamp(1.6rem,3vw,2.6rem)] text-ink/40 md:col-span-1 md:row-span-1 md:w-auto md:self-center">
                      #{num}
                    </span>
                    <span className="md:col-span-5">
                      <span className="block text-[clamp(1.15rem,2.2vw,1.9rem)] font-bold leading-tight tracking-[-0.02em] [font-stretch:122%]">
                        {s.name}
                      </span>
                      <span className="mt-1 block text-sm text-ink/55">{s.description}</span>
                    </span>
                    <span className="label hidden text-ink/50 md:col-span-2 md:block md:text-right">{s.duration} min</span>
                    <span className="text-right md:col-span-2">
                      <span className="block text-[clamp(1.2rem,2.2vw,1.9rem)] font-bold tabular-nums [font-stretch:122%]">
                        {formatPrice(s.price)}
                      </span>
                      <span className="label block text-ink/45 md:hidden">{s.duration} min</span>
                    </span>
                    <span className="hidden justify-end md:col-span-2 md:flex">
                      <span className="flex h-9 items-center gap-1.5 rounded-full border border-ink/20 px-4 text-sm transition-colors duration-300 group-hover/row:border-ink group-hover/row:bg-ink group-hover/row:text-paper">
                        Book <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
                      </span>
                    </span>
                  </button>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </motion.ul>
      </div>

      {/* floating preview */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-30 hidden h-[240px] w-[190px] -translate-x-1/2 -translate-y-1/2 lg:block"
        style={{ x: sx, y: sy }}
      >
        <AnimatePresence>
          {hoveredService && (
            <motion.div
              key={hoveredService.id}
              className="absolute inset-0 overflow-hidden rounded-2xl shadow-[0_30px_60px_-20px_rgba(0,0,0,0.5)]"
              initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: -3 }}
              exit={{ opacity: 0, scale: 0.85, rotate: 4 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <Img id={hoveredService.image} alt="" sizes="190px" maxWidth={480} className="h-full w-full" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  )
}
