import { useRef } from 'react'
import { gsap, SplitText, useGSAP } from '../lib/gsap'
import { useReveal } from '../hooks/useReveal'
import { useReady } from '../context/ready'
import { SectionLabel } from '../components/SectionLabel'
import { Img } from '../components/Img'
import { stats } from '../data/content'
import { site } from '../data/site'

export function Club() {
  const root = useRef<HTMLElement>(null)
  const ready = useReady()
  useReveal(root)

  useGSAP(
    () => {
      if (!ready) return
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // statement lights up word by word as it scrolls through
        const split = SplitText.create('[data-scrub-text]', { type: 'words' })
        gsap.fromTo(
          split.words,
          { opacity: 0.14 },
          {
            opacity: 1,
            stagger: 0.1,
            ease: 'none',
            scrollTrigger: { trigger: '[data-scrub-text]', start: 'top 82%', end: 'bottom 50%', scrub: 0.6 },
          },
        )

        root.current?.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
          const target = Number(el.dataset.count)
          const decimals = Number(el.dataset.decimals ?? 0)
          const obj = { v: 0 }
          gsap.to(obj, {
            v: target,
            duration: 2,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 92%', once: true },
            onUpdate: () => {
              el.textContent = obj.v.toFixed(decimals)
            },
          })
        })
        return () => split.revert()
      })
    },
    { scope: root, dependencies: [ready] },
  )

  return (
    <section ref={root} id="club" className="section-y relative bg-paper text-ink">
      <div className="shell">
        <SectionLabel index="01">The Club</SectionLabel>

        <p
          data-scrub-text
          className="display mx-auto mt-12 max-w-[20ch] text-center text-[clamp(2.2rem,5.6vw,5.5rem)] md:mt-16"
        >
          Not a salon. <b>A club for men who care about the details</b> — the line of a fade, the weight of a hot towel.
        </p>

        <div className="mt-16 grid gap-10 md:mt-28 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-5">
            <div data-reveal="img" className="relative aspect-[4/5] overflow-hidden rounded-2xl">
              <div data-parallax="0.08" className="absolute -inset-y-[8%] inset-x-0">
                <Img
                  id="photo-1585747860715-2ba37e788b70"
                  alt="Inside the NOIR barber shop"
                  sizes="(min-width: 768px) 40vw, 100vw"
                  className="h-full w-full"
                />
              </div>
            </div>
            <p className="label mt-3 text-ink/50">{site.address.street} — the floor</p>
          </div>

          <div className="flex flex-col justify-between gap-12 md:col-span-6 md:col-start-7">
            <div className="grid gap-6 text-[1.05rem] leading-relaxed text-ink/75 sm:grid-cols-2">
              <p data-reveal="fade">
                NOIR opened in {site.established} with four chairs and one rule: every client gets the time the cut actually needs.
                Appointments run long by design, and nobody is ever rushed out of the chair.
              </p>
              <p data-reveal="fade" data-delay="0.1">
                We work with scissors, clippers and straight razors — classic technique, modern shapes. Expect a proper
                consultation, a hot towel and a finish that still looks right three weeks later.
              </p>
            </div>

            <div className="grid grid-cols-2 border-t border-ink/15">
              {stats.map((s, i) => (
                <div
                  key={s.label}
                  data-reveal="fade"
                  data-delay={String(i * 0.06)}
                  className={`border-b border-ink/15 py-6 md:py-8 ${i % 2 === 0 ? 'border-r pr-4' : 'pl-4 md:pl-8'}`}
                >
                  <div className="display text-[clamp(2.75rem,6vw,5.5rem)] font-bold tabular-nums">
                    <span data-count={s.value} data-decimals={s.decimals ?? 0}>
                      {s.value.toFixed(s.decimals ?? 0)}
                    </span>
                    {s.suffix}
                  </div>
                  <div className="label mt-3 text-ink/55">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-5 items-end gap-4">
              <div data-reveal="img" className="col-span-2 aspect-square overflow-hidden rounded-2xl">
                <Img id="photo-1621605815971-fbc98d665033" alt="Barber tools laid out" sizes="20vw" className="h-full w-full" />
              </div>
              <p data-reveal="fade" className="display col-span-3 text-[clamp(1.3rem,2.1vw,1.9rem)] leading-[1.12]">
                “A good cut is invisible. You just look like the best version of yourself.”
                <span className="label mt-4 block text-ink/50">
                  Marco Velden — Founder
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
