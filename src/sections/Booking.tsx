import { useRef } from 'react'
import { BellRing, CreditCard, RefreshCcw } from 'lucide-react'
import { useReveal } from '../hooks/useReveal'
import { useBooking, STEPS } from '../context/booking'
import { SectionLabel } from '../components/SectionLabel'
import { Button } from '../components/Button'
import { site } from '../data/site'

const stepNotes = ['Nine cuts and rituals', 'Or the first free chair', 'Three weeks ahead', 'Live demo availability', 'Name and mobile', 'Check, then send']

const perks = [
  { icon: BellRing, title: 'A reminder the day before', note: 'By text, so you never miss the chair' },
  { icon: RefreshCcw, title: 'Free changes up to 24h', note: 'Move or cancel in two taps' },
  { icon: CreditCard, title: 'Pay in the shop', note: 'No card needed to book' },
]

export function Booking() {
  const root = useRef<HTMLElement>(null)
  const { open } = useBooking()
  useReveal(root)

  return (
    <section ref={root} id="book" className="section-y relative bg-paper text-ink">
      <div className="shell">
        <div className="flex items-center justify-between">
          <SectionLabel index="02">Book online</SectionLabel>
          <span data-reveal="fade" className="label hidden text-ink/45 sm:block">
            Preview mode · call {site.phone} to book today
          </span>
        </div>

        <div className="mt-10 grid gap-12 md:mt-14 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-6">
            <h2 data-reveal="lines" className="display text-[clamp(2.6rem,6.4vw,6rem)]">
              Your chair, <b>booked in a minute.</b>
            </h2>
            <p data-reveal="fade" className="mt-6 max-w-md leading-relaxed text-ink/65">
              Pick the work, the barber and the hour. No calls, no DMs, no waiting for a reply — the whole booking takes
              six steps.
            </p>
            <div data-reveal="fade" className="mt-8 flex flex-wrap gap-2">
              <Button variant="dark" size="lg" onClick={open}>
                Book a chair
              </Button>
            </div>
            <ul data-reveal="stagger" className="mt-12 grid gap-2 sm:grid-cols-3 lg:mt-16">
              {perks.map((p) => (
                <li key={p.title} className="rounded-2xl border border-ink/10 bg-bone/50 p-4">
                  <p.icon className="size-5" strokeWidth={1.25} />
                  <div className="mt-4 text-sm font-semibold [font-stretch:112%]">{p.title}</div>
                  <div className="mt-1 text-xs text-ink/55">{p.note}</div>
                </li>
              ))}
            </ul>
          </div>

          <ol data-reveal="stagger" className="lg:col-span-5 lg:col-start-8">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-5 border-b border-ink/12 py-4 first:border-t md:py-5">
                <span className="display w-10 text-2xl text-ink/35 md:text-3xl">#{i + 1}</span>
                <span className="flex-1">
                  <span className="block text-lg font-semibold [font-stretch:118%]">{s}</span>
                  <span className="label mt-1 block text-ink/45">{stepNotes[i]}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
