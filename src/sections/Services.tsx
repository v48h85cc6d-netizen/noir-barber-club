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
      className="section-y relative bg-ink text-paper"
      onPointerMove={(e) => {
        x.set(e.clientX)
        y.set(e.clientY)
      }}
    >
      <div className="shell">
        <div className="grid gap-8 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            <SectionLabel index="04">Services & pricing</SectionLabel>
            <h2 data-reveal="lines" className="display mt-8 text-[clamp(3rem,9vw,9rem)]">
              The <span className="serif normal-case">work</span>
            </h2>
          </div>
          <p data-reveal="fade" className="max-w-sm leading-relaxed text-paper/60 md:col-span-4">
            Every service includes a consultation, wash and hot towel finish. Prices are fixed — no surprises at the till.
          </p>
        </div>

        <div
          data-reveal="fade"
          role="tablist"
          aria-label="Filter services"
          className="no-scrollbar -mx-4 mt-12 flex gap-6 overflow-x-auto border-b border-line px-4 md:mx-0 md:mt-20 md:gap-10 md:px-0"
        >
          {filters.map((f) => (
            <button
              key={f}
              role="tab"
              type="button"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={`label relative shrink-0 pb-4 transition-colors ${filter === f ? 'text-paper' : 'text-paper/40 hover:text-paper/70'}`}
            >
              {f}
              <span className="ml-1.5 opacity-50">
                {f === 'All' ? services.length : services.filter((s) => s.category === f).length}
              </span>
              {filter === f && (
                <motion.span layoutId="svc-tab" className="absolute inset-x-0 -bottom-px h-px bg-paper" transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} />
              )}
            </button>
          ))}
        </div>

        <motion.ul layout className="relative" onPointerLeave={() => setHovered(null)}>
          <AnimatePresence initial={false} mode="popLayout">
            {list.map((s, i) => (
              <motion.li
                layout
                key={s.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: i * 0.03 }}
                className="border-b border-line"
              >
                <button
                  type="button"
                  onClick={() => bookService(s.id)}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(s.id)}
                  className="group relative grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 py-6 text-left md:grid-cols-12 md:py-8"
                >
                  <span className="absolute inset-0 origin-bottom scale-y-0 bg-paper transition-transform duration-500 ease-[var(--ease-expo)] group-hover:scale-y-100" />
                  <span className="label relative hidden text-paper/40 transition-colors duration-500 group-hover:text-ink/50 md:col-span-1 md:block md:pl-4">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="relative col-start-1 row-start-1 md:col-span-5 md:col-start-auto md:row-start-auto">
                    <span className="block text-[clamp(1.4rem,3vw,2.6rem)] font-extrabold uppercase leading-none tracking-[-0.02em] [font-stretch:122%] transition-colors duration-500 group-hover:text-ink">
                      {s.name}
                    </span>
                    {s.signature && (
                      <span className="serif mt-1 block text-lg text-paper/50 transition-colors duration-500 group-hover:text-ink/60">
                        House signature
                      </span>
                    )}
                  </span>
                  <span className="relative col-span-2 row-start-2 max-w-md text-sm leading-relaxed text-paper/55 transition-colors duration-500 group-hover:text-ink/65 md:col-span-3 md:row-start-auto">
                    {s.description}
                  </span>
                  <span className="label relative hidden text-paper/50 transition-colors duration-500 group-hover:text-ink/60 md:col-span-1 md:block">
                    {s.duration} min
                  </span>
                  <span className="relative col-start-2 row-start-1 flex items-center justify-end gap-4 md:col-span-2 md:col-start-auto md:row-start-auto md:pr-4">
                    <span className="text-right">
                      <span className="display block text-[clamp(1.5rem,2.6vw,2.4rem)] tabular-nums transition-colors duration-500 group-hover:text-ink">
                        {formatPrice(s.price)}
                      </span>
                      <span className="label mt-1 block text-paper/40 md:hidden">{s.duration} min</span>
                    </span>
                    <span className="hidden size-10 place-items-center border border-line transition-all duration-500 group-hover:rotate-45 group-hover:border-ink group-hover:bg-ink sm:grid">
                      <ArrowUpRight className="size-4" strokeWidth={1.5} />
                    </span>
                  </span>
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      </div>

      {/* floating preview */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-30 hidden h-[260px] w-[200px] -translate-x-1/2 -translate-y-1/2 lg:block"
        style={{ x: sx, y: sy }}
      >
        <AnimatePresence>
          {hoveredService && (
            <motion.div
              key={hoveredService.id}
              className="absolute inset-0 overflow-hidden"
              initial={{ clipPath: 'inset(50% 50% 50% 50%)', rotate: -6 }}
              animate={{ clipPath: 'inset(0% 0% 0% 0%)', rotate: 0 }}
              exit={{ clipPath: 'inset(50% 50% 50% 50%)', rotate: 6 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <Img id={hoveredService.image} alt="" sizes="200px" maxWidth={480} className="h-full w-full" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  )
}
