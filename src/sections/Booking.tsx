import { useRef } from 'react'
import { useReveal } from '../hooks/useReveal'
import { SectionLabel } from '../components/SectionLabel'
import { BookingWidget } from '../booking/BookingWidget'
import { site } from '../data/site'

export function Booking() {
  const root = useRef<HTMLElement>(null)
  useReveal(root)
  return (
    <section ref={root} id="book" className="section-y relative bg-ink text-paper">
      <div className="shell">
        <div className="mb-12 grid gap-8 md:mb-20 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            <SectionLabel index="02">Online booking</SectionLabel>
            <h2 data-reveal="lines" className="display mt-8 text-[clamp(3rem,9vw,9rem)]">
              Book your <br />
              chair
            </h2>
          </div>
          <div className="md:col-span-4" data-reveal="fade">
            <p className="max-w-sm leading-relaxed text-paper/60">
              Six steps, about a minute. Pick the work, the barber and the hour — we’ll have the towels hot.
            </p>
            <div className="label mt-5 inline-flex items-center gap-2 text-paper/45">
              <span className="size-1.5 animate-pulse rounded-full bg-paper/60" />
              Preview mode</div>
            <p className="mt-2 text-sm text-paper/45">To book today, call <a href={site.phoneHref} className="underline underline-offset-4 hover:text-paper">{site.phone}</a>.</p>
          </div>
        </div>
        <div data-reveal="fade">
          <BookingWidget />
        </div>
      </div>
    </section>
  )
}
