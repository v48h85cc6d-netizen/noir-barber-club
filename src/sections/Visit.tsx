import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, Plus } from 'lucide-react'
import { useReveal } from '../hooks/useReveal'
import { SectionLabel } from '../components/SectionLabel'
import { dayNames, faqs, hours, site } from '../data/site'
import { openStatus } from '../lib/schedule'

const order = [1, 2, 3, 4, 5, 6, 0] // Monday first

export function Visit() {
  const root = useRef<HTMLElement>(null)
  const [now, setNow] = useState(() => new Date())
  const [mapOn, setMapOn] = useState(false)
  const [faq, setFaq] = useState<number | null>(0)
  useReveal(root)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  const status = openStatus(now)
  const today = now.getDay()
  const q = encodeURIComponent(site.address.mapQuery)

  return (
    <section ref={root} id="visit" className="section-y relative bg-ink text-paper">
      <div className="shell">
        <SectionLabel index="09">Find the chair</SectionLabel>

        <div className="mt-8 overflow-hidden rounded-3xl border border-line bg-coal lg:grid lg:grid-cols-12">
          <div className="p-6 md:p-10 lg:col-span-5">
            <h2 data-reveal="lines" className="display text-[clamp(2.4rem,5vw,4.5rem)]">
              {site.address.walk.split(' from ')[0]} <b>from the tram.</b>
            </h2>
            <div data-reveal="fade" className="mt-6 space-y-1 text-[0.95rem] text-paper/70">
              <p>
                {site.address.street}, {site.address.city}
              </p>
              <a href={site.phoneHref} className="block text-lg font-semibold text-paper hover:underline">
                {site.phone}
              </a>
            </div>

            <div data-reveal="fade" className="label mt-8 flex items-center gap-2 text-paper/70">
              <span className={`relative flex size-2 ${status.open ? '' : 'opacity-50'}`}>
                {status.open && <span className="absolute inset-0 animate-ping rounded-full bg-paper/60" />}
                <span className="relative size-2 rounded-full bg-paper" />
              </span>
              {status.label}
            </div>
            <ul data-reveal="stagger" className="label mt-4 border-t border-line">
              {order.map((d) => {
                const h = hours[d]
                const isToday = d === today
                return (
                  <li key={d} className={`flex items-center justify-between border-b border-line py-2.5 ${isToday ? 'text-paper' : 'text-paper/50'}`}>
                    <span>
                      {dayNames[d]}
                      {isToday && ' · today'}
                    </span>
                    <span className="tabular-nums">{h ? `${h.open} – ${h.close}` : 'Closed'}</span>
                  </li>
                )
              })}
            </ul>

            <a
              data-reveal="fade"
              href={`https://www.google.com/maps/dir/?api=1&destination=${q}`}
              target="_blank"
              rel="noreferrer"
              className="group/btn mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-paper pl-5 pr-1.5 text-sm font-medium text-ink transition-colors hover:bg-white"
            >
              Get directions
              <span className="grid size-8 place-items-center rounded-full bg-ink text-paper">
                <ArrowUpRight className="size-4 transition-transform duration-500 group-hover/btn:rotate-45" strokeWidth={1.75} />
              </span>
            </a>
          </div>

          <div className="relative min-h-[380px] border-t border-line lg:col-span-7 lg:min-h-full lg:border-l lg:border-t-0">
            {mapOn ? (
              <iframe
                title={`Map of ${site.address.mapQuery}`}
                src={`https://maps.google.com/maps?q=${q}&z=16&output=embed`}
                className="absolute inset-0 h-full w-full grayscale invert-[0.9] contrast-[0.9]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <button type="button" onClick={() => setMapOn(true)} className="group absolute inset-0 h-full w-full overflow-hidden" aria-label="Load interactive map">
                <StreetMap />
                <span className="label absolute bottom-4 right-4 rounded-full border border-line bg-ink/80 px-3 py-2 text-paper/60 backdrop-blur transition-colors group-hover:text-paper">
                  Tap to load map
                </span>
              </button>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 grid gap-8 md:mt-24 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div data-reveal="fade" className="label text-paper/50">
              Before you come
            </div>
            <h3 data-reveal="lines" className="display mt-4 text-[clamp(1.9rem,3.4vw,3rem)]">
              Good <b>questions.</b>
            </h3>
          </div>
          <ul data-reveal="stagger" className="lg:col-span-7 lg:col-start-6">
            {faqs.map((f, i) => {
              const open = faq === i
              return (
                <li key={f.q} className="border-b border-line">
                  <button
                    type="button"
                    onClick={() => setFaq(open ? null : i)}
                    aria-expanded={open}
                    aria-controls={`faq-${i}`}
                    className="flex w-full items-center justify-between gap-6 py-5 text-left font-semibold [font-stretch:112%] md:text-lg"
                  >
                    {f.q}
                    <Plus className={`size-4 shrink-0 transition-transform duration-500 ${open ? 'rotate-45' : ''}`} strokeWidth={1.5} />
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        id={`faq-${i}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="max-w-xl pb-5 text-sm leading-relaxed text-paper/60">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}

/** Stylised street map: a lightweight placeholder until the visitor asks for Google Maps. */
function StreetMap() {
  return (
    <svg className="absolute inset-0 h-full w-full text-paper" preserveAspectRatio="xMidYMid slice" viewBox="0 0 800 560" aria-hidden>
      <rect width="800" height="560" fill="#101012" />
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        {/* canals */}
        <path d="M-40 140 C 220 90, 520 120, 860 60" strokeWidth="26" opacity="0.06" />
        <path d="M-40 470 C 260 420, 560 470, 860 400" strokeWidth="26" opacity="0.06" />
        {/* streets */}
        {[60, 190, 300, 380, 520].map((y, i) => (
          <path key={y} d={`M-20 ${y} L 820 ${y - 70 + i * 6}`} strokeWidth={i === 2 ? 14 : 6} opacity={i === 2 ? 0.16 : 0.09} />
        ))}
        {[90, 250, 430, 610, 740].map((x, i) => (
          <path key={x} d={`M${x} -20 L ${x + 110} 580`} strokeWidth={i === 2 ? 12 : 5} opacity={i === 2 ? 0.14 : 0.08} />
        ))}
        {/* walking route */}
        <path d="M200 430 C 300 400, 360 360, 470 300" strokeWidth="2.5" strokeDasharray="2 9" opacity="0.8" />
      </g>
      {/* transit stop */}
      <g transform="translate(200 430)">
        <circle r="13" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle r="4" fill="currentColor" />
      </g>
      <text x="222" y="466" fill="currentColor" opacity="0.55" fontFamily="JetBrains Mono, monospace" fontSize="13" letterSpacing="1">
        {site.address.transit.toUpperCase()}
      </text>
      {/* shop */}
      <g transform="translate(470 300)">
        <circle r="34" fill="currentColor" opacity="0.08" />
        <circle r="9" fill="currentColor" />
      </g>
      <text x="492" y="290" fill="currentColor" fontFamily="JetBrains Mono, monospace" fontSize="13" letterSpacing="1">
        NOIR · {site.address.street.toUpperCase()}
      </text>
    </svg>
  )
}
