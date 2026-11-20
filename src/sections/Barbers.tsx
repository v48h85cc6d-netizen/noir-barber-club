import { useRef, useState } from 'react'
import { AtSign } from 'lucide-react'
import { useReveal } from '../hooks/useReveal'
import { useBooking } from '../context/booking'
import { SectionLabel } from '../components/SectionLabel'
import { Img } from '../components/Img'
import { Button } from '../components/Button'
import { barbers, type Barber } from '../data/content'
import { useI18n } from '../i18n'

/** Pendant lamp drawn above each mirror; glows when its barber is selected. */
function Lamp({ on }: { on: boolean }) {
  return (
    <div className="relative mx-auto flex w-16 flex-col items-center" aria-hidden>
      <span className="h-8 w-px bg-paper/25 md:h-12" />
      <span className={`h-3 w-9 rounded-t-full transition-colors duration-700 ${on ? 'bg-paper' : 'bg-paper/30'}`} />
      <span
        className={`pointer-events-none absolute top-full h-40 w-48 bg-[radial-gradient(50%_100%_at_50%_0%,rgba(255,255,255,0.28),transparent_70%)] transition-opacity duration-700 ${
          on ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  )
}

function Mirror({ b, i, active, onActivate }: { b: Barber; i: number; active: boolean; onActivate: () => void }) {
  const { bookBarber } = useBooking()
  const { t } = useI18n()
  const p = t.barbers.people[b.id]
  return (
    <article
      onPointerEnter={(e) => e.pointerType === 'mouse' && onActivate()}
      onFocus={onActivate}
      className={`flex min-w-0 flex-col transition-[flex-grow] duration-700 ease-[var(--ease-expo)] ${active ? 'grow-[3.2]' : 'grow'}`}
      style={{ flexBasis: 0 }}
    >
      <Lamp on={active} />
      <div
        className={`relative mt-2 h-[min(64vh,620px)] overflow-hidden rounded-[22px] border p-1.5 transition-colors duration-700 ${
          active ? 'border-paper/45' : 'border-paper/10'
        }`}
      >
        <button type="button" onClick={onActivate} className="relative block h-full w-full overflow-hidden rounded-[16px] text-left" aria-label={`${b.name}, ${p.specialty}`}>
          <Img
            id={b.image}
            alt={t.barbers.portrait(b.name)}
            sizes="(min-width: 1024px) 45vw, 80vw"
            maxWidth={1080}
            className="h-full w-full"
            imgClassName={`transition-[filter,transform] duration-[1.2s] ease-[var(--ease-expo)] ${active ? 'brightness-100 scale-100' : 'brightness-[0.45] scale-105'}`}
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
          <span className="absolute inset-x-0 bottom-0 p-4 md:p-5">
            <span className="label block text-paper/60">#{i + 1}</span>
            <span className="mt-1 block truncate text-xl font-bold [font-stretch:122%] md:text-2xl">{b.name.split(' ')[0]}</span>
          </span>
        </button>
      </div>
      <div className={`grid transition-[grid-template-rows,opacity] duration-700 ease-[var(--ease-expo)] ${active ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-4 pt-5">
            <div className="max-w-sm">
              <div className="label text-paper/50">
                {p.role} · {b.years} {t.common.yrs}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-paper/70">
                <b className="font-semibold text-paper">{p.specialty}.</b> {p.bio}
              </p>
            </div>
            <Button variant="light" onClick={() => bookBarber(b.id)} tabIndex={active ? 0 : -1} aria-label={t.barbers.bookWith(b.name)}>
              {t.barbers.bookWith(b.name.split(' ')[0])}
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}

export function Barbers() {
  const root = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)
  const { bookBarber } = useBooking()
  const { t, locale } = useI18n()
  useReveal(root)

  return (
    <section ref={root} id="barbers" className="section-y relative overflow-hidden bg-ink text-paper">
      <div className="shell">
        <SectionLabel index="03">{t.barbers.label}</SectionLabel>
        <div className="mt-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <h2 key={locale} data-reveal="lines" className="display text-[clamp(2.6rem,6.4vw,6rem)]">
            {t.barbers.a}
            <b>{t.barbers.b}</b>
          </h2>
          <p data-reveal="fade" className="max-w-sm text-sm leading-relaxed text-paper/60">
            {t.barbers.body}
          </p>
        </div>

        {/* Desktop: mirror accordion */}
        <div data-reveal="fade" className="mt-10 hidden gap-3 lg:flex">
          {barbers.map((b, i) => (
            <Mirror key={b.id} b={b} i={i} active={active === i} onActivate={() => setActive(i)} />
          ))}
        </div>
      </div>

      {/* Mobile & tablet: swipeable mirrors */}
      <div data-reveal="stagger" className="no-scrollbar mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:px-8 lg:hidden">
        {barbers.map((b, i) => (
          <article key={b.id} className="w-[78vw] max-w-[340px] shrink-0 snap-start">
            <Lamp on />
            <div className="mt-2 overflow-hidden rounded-[22px] border border-paper/30 p-1.5">
              <div className="relative overflow-hidden rounded-[16px]">
                <Img id={b.image} alt={t.barbers.portrait(b.name)} sizes="78vw" maxWidth={1080} className="aspect-[3/4] w-full" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-4">
                  <span className="label block text-paper/60">
                    #{i + 1} · {b.years} {t.common.yrs}
                  </span>
                  <span className="mt-1 block text-xl font-bold [font-stretch:122%]">{b.name}</span>
                </span>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-paper/65">
              <b className="font-semibold text-paper">{t.barbers.people[b.id].specialty}.</b> {t.barbers.people[b.id].bio}
            </p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <Button variant="light" onClick={() => bookBarber(b.id)} aria-label={t.barbers.bookWith(b.name)}>
                {t.barbers.bookWith(b.name.split(' ')[0])}
              </Button>
              <a
                href={`https://instagram.com/${b.instagram.slice(1)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-paper/50 hover:text-paper"
              >
                <AtSign className="size-3" />
                {b.instagram.slice(1)}
              </a>
            </div>
          </article>
        ))}
        <div className="w-1 shrink-0" aria-hidden />
      </div>
    </section>
  )
}
