import { useRef } from 'react'
import { gsap, SplitText, useGSAP } from '../lib/gsap'
import { useReveal } from '../hooks/useReveal'
import { useReady } from '../context/ready'
import { SectionLabel } from '../components/SectionLabel'
import { Img } from '../components/Img'
import { stats } from '../data/content'

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
          className="mt-10 max-w-[22ch] text-[clamp(2rem,5.2vw,5.4rem)] font-[520] leading-[1.02] tracking-[-0.03em] [font-stretch:108%] md:mt-14"
        >
          Not a salon. A club for men who take the <span className="serif">details</span> seriously — the line of a
          fade, the weight of a hot towel, the quiet between <span className="serif">conversations.</span>
        </p>

        <div className="mt-16 grid gap-10 md:mt-28 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-5">
            <div data-reveal="img" className="relative aspect-[4/5] overflow-hidden">
              <div data-parallax="0.08" className="absolute -inset-y-[8%] inset-x-0">
                <Img
                  id="photo-1585747860715-2ba37e788b70"
                  alt="Inside the NOIR barber shop"
                  sizes="(min-width: 768px) 40vw, 100vw"
                  className="h-full w-full"
                />
              </div>
            </div>
            <p className="label mt-4 text-ink/50">Kerkstraat 118 — the floor</p>
          </div>

          <div className="flex flex-col justify-between gap-12 md:col-span-6 md:col-start-7">
            <div className="grid gap-6 text-[1.05rem] leading-relaxed text-ink/75 sm:grid-cols-2">
              <p data-reveal="fade">
                NOIR opened in {2016} with four chairs and one rule: every client gets the time the cut actually needs.
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
                  <div className="display text-[clamp(2.75rem,6vw,5.5rem)] tabular-nums">
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
              <div data-reveal="img" className="col-span-2 aspect-square overflow-hidden">
                <Img id="photo-1621605815971-fbc98d665033" alt="Barber tools laid out" sizes="20vw" className="h-full w-full" />
              </div>
              <p data-reveal="fade" className="serif col-span-3 text-[clamp(1.5rem,2.4vw,2.25rem)] leading-[1.1]">
                “A good cut is invisible. You just look like the best version of yourself.”
                <span className="label mt-4 block not-italic text-ink/50 [font-family:var(--font-sans)]">
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
