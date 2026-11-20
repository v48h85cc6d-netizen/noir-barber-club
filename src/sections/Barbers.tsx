import { useRef } from 'react'
import { ArrowUpRight, AtSign } from 'lucide-react'
import { useReveal } from '../hooks/useReveal'
import { useBooking } from '../context/booking'
import { SectionLabel } from '../components/SectionLabel'
import { Img } from '../components/Img'
import { barbers } from '../data/content'

export function Barbers() {
  const root = useRef<HTMLElement>(null)
  const { bookBarber } = useBooking()
  useReveal(root)

  return (
    <section ref={root} id="barbers" className="section-y relative overflow-hidden bg-paper text-ink">
      <div className="shell">
        <div className="mb-12 flex flex-col justify-between gap-8 md:mb-20 md:flex-row md:items-end">
          <div>
            <SectionLabel index="03">The barbers</SectionLabel>
            <h2 data-reveal="lines" className="display mt-8 text-[clamp(3rem,9vw,9rem)]">
              Choose <span className="serif normal-case">your</span>
              <br /> barber
            </h2>
          </div>
          <p data-reveal="fade" className="max-w-sm leading-relaxed text-ink/65">
            Four specialists, one standard. Pick the hands that suit your hair — or let us match you with whoever’s free.
          </p>
        </div>
      </div>

      <div
        data-reveal="stagger"
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-8 xl:grid-cols-4 xl:px-12 [max-width:1680px] mx-auto"
      >
        {barbers.map((b, i) => (
          <article key={b.id} className="group w-[78vw] max-w-[360px] shrink-0 snap-start md:w-auto md:max-w-none">
            <button
              type="button"
              onClick={() => bookBarber(b.id)}
              className="relative block w-full overflow-hidden text-left"
              aria-label={`Book with ${b.name}`}
            >
              <Img
                id={b.image}
                alt={`Portrait of ${b.name}`}
                sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 78vw"
                maxWidth={1080}
                className="aspect-[3/4] w-full"
                imgClassName="transition-[transform,filter] duration-[1.4s] ease-[var(--ease-expo)] group-hover:scale-[1.06]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-80 transition-opacity duration-700 group-hover:opacity-100" />
              <span className="label absolute left-4 top-4 text-paper/80">0{i + 1}</span>
              <span className="label absolute right-4 top-4 text-paper/80">{b.years} yrs</span>
              <div className="absolute inset-x-0 bottom-0 p-4 text-paper md:p-5">
                <p className="max-h-0 overflow-hidden text-sm leading-relaxed text-paper/80 opacity-0 transition-all duration-700 ease-[var(--ease-expo)] group-hover:mb-4 group-hover:max-h-28 group-hover:opacity-100">
                  {b.bio}
                </p>
                <span className="flex items-center justify-between">
                  <span className="label">Book with {b.name.split(' ')[0]}</span>
                  <span className="grid size-10 place-items-center bg-paper text-ink transition-transform duration-500 group-hover:rotate-45">
                    <ArrowUpRight className="size-4" strokeWidth={1.5} />
                  </span>
                </span>
              </div>
            </button>
            <div className="mt-4 flex items-start justify-between gap-4 border-t border-ink/15 pt-4">
              <div>
                <h3 className="text-xl font-bold uppercase leading-none tracking-tight [font-stretch:120%]">{b.name}</h3>
                <p className="mt-2 text-sm text-ink/60">{b.role}</p>
              </div>
              <div className="text-right">
                <p className="text-sm">{b.specialty}</p>
                <a
                  href={`https://instagram.com/${b.instagram.slice(1)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-ink/50 hover:text-ink"
                >
                  <AtSign className="size-3" />
                  {b.instagram.slice(1)}
                </a>
              </div>
            </div>
          </article>
        ))}
        <div className="w-1 shrink-0 md:hidden" aria-hidden />
      </div>
    </section>
  )
}
