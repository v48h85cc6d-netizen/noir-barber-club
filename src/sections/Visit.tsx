import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Clock, MapPin, Phone } from 'lucide-react'
import { useReveal } from '../hooks/useReveal'
import { SectionLabel } from '../components/SectionLabel'
import { dayNames, hours, site } from '../data/site'
import { openStatus } from '../lib/schedule'

const order = [1, 2, 3, 4, 5, 6, 0] // Monday first

export function Visit() {
  const root = useRef<HTMLElement>(null)
  const [now, setNow] = useState(() => new Date())
  const [mapOn, setMapOn] = useState(false)
  useReveal(root)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  const status = openStatus(now)
  const today = now.getDay()
  const q = encodeURIComponent(site.address.mapQuery)

  return (
    <section ref={root} id="visit" className="section-y relative bg-paper text-ink">
      <div className="shell">
        <SectionLabel index="09">Hours & location</SectionLabel>
        <h2 data-reveal="lines" className="display mt-8 text-[clamp(3rem,9vw,9rem)]">
          Find <span className="serif normal-case">the</span> chair
        </h2>

        <div className="mt-14 grid gap-12 md:mt-20 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <div data-reveal="fade" className="flex items-center gap-3">
              <span className={`relative flex size-2.5 ${status.open ? '' : 'opacity-50'}`}>
                {status.open && <span className="absolute inset-0 animate-ping rounded-full bg-ink/50" />}
                <span className="relative size-2.5 rounded-full bg-ink" />
              </span>
              <span className="label">{status.label}</span>
            </div>

            <ul data-reveal="stagger" className="mt-8 border-t border-ink/15">
              {order.map((d) => {
                const h = hours[d]
                const isToday = d === today
                return (
                  <li
                    key={d}
                    className={`flex items-center justify-between border-b border-ink/15 py-4 ${isToday ? 'font-semibold' : 'text-ink/70'}`}
                  >
                    <span className="flex items-center gap-3">
                      {dayNames[d]}
                      {isToday && <span className="label bg-ink px-2 py-1 text-[0.6rem] text-paper">Today</span>}
                    </span>
                    <span className="tabular-nums">{h ? `${h.open} — ${h.close}` : 'Closed'}</span>
                  </li>
                )
              })}
            </ul>

            <div data-reveal="stagger" className="mt-10 grid gap-6 sm:grid-cols-2">
              <div>
                <div className="label flex items-center gap-2 text-ink/50">
                  <MapPin className="size-3.5" strokeWidth={1.5} /> Address
                </div>
                <p className="mt-3 text-lg leading-snug">
                  {site.address.street}
                  <br />
                  {site.address.city}
                </p>
              </div>
              <div>
                <div className="label flex items-center gap-2 text-ink/50">
                  <Phone className="size-3.5" strokeWidth={1.5} /> Walk-ins
                </div>
                <p className="mt-3 text-lg leading-snug">
                  Welcome when a chair is free.
                  <br />
                  <a href={site.phoneHref} className="underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
                    {site.phone}
                  </a>
                </p>
              </div>
            </div>

            <a
              data-reveal="fade"
              href={`https://www.google.com/maps/dir/?api=1&destination=${q}`}
              target="_blank"
              rel="noreferrer"
              className="group/btn mt-10 inline-flex h-14 items-center gap-3 bg-ink px-8 text-paper transition-colors hover:bg-black"
            >
              <span className="label">Get directions</span>
              <ArrowUpRight className="size-4 transition-transform duration-500 group-hover/btn:rotate-45" strokeWidth={1.5} />
            </a>
          </div>

          <div className="lg:col-span-7">
            <div data-reveal="img" className="relative aspect-[4/5] overflow-hidden bg-bone sm:aspect-[4/3] lg:aspect-auto lg:h-full lg:min-h-[560px]">
              {mapOn ? (
                <iframe
                  title={`Map of ${site.address.mapQuery}`}
                  src={`https://maps.google.com/maps?q=${q}&z=16&output=embed`}
                  className="absolute inset-0 h-full w-full grayscale invert-[0.92] contrast-[0.9]"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setMapOn(true)}
                  className="group absolute inset-0 flex h-full w-full items-center justify-center overflow-hidden bg-ink text-paper"
                  aria-label="Load interactive map"
                >
                  <MapGraphic />
                  <span className="relative flex flex-col items-center gap-4">
                    <span className="relative grid size-16 place-items-center rounded-full bg-paper text-ink">
                      <span className="absolute inset-0 animate-ping rounded-full bg-paper/40" />
                      <MapPin className="relative size-6" strokeWidth={1.5} />
                    </span>
                    <span className="label bg-ink/80 px-3 py-2">{site.address.street}</span>
                    <span className="label text-paper/55 transition-colors group-hover:text-paper">Tap to load map</span>
                  </span>
                </button>
              )}
              <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-2 bg-paper px-3 py-2 text-ink">
                <Clock className="size-3.5" strokeWidth={1.5} />
                <span className="label">5 min from Leidseplein</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/** Abstract street grid used as a lightweight map placeholder (no third-party load until asked). */
function MapGraphic() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-30" preserveAspectRatio="xMidYMid slice" viewBox="0 0 800 600" aria-hidden>
      <g fill="none" stroke="currentColor">
        {Array.from({ length: 14 }).map((_, i) => (
          <path key={`h${i}`} d={`M-20 ${i * 48 + 10} C 200 ${i * 48 - 20}, 500 ${i * 48 + 40}, 820 ${i * 48}`} strokeWidth={i % 4 === 0 ? 6 : 1} />
        ))}
        {Array.from({ length: 12 }).map((_, i) => (
          <path key={`v${i}`} d={`M${i * 72} -20 L ${i * 72 + 60} 620`} strokeWidth={i % 3 === 0 ? 3 : 0.8} />
        ))}
        <path d="M-20 420 C 200 360, 420 520, 820 380" strokeWidth={22} opacity={0.5} />
      </g>
    </svg>
  )
}
