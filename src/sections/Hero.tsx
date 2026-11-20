import { useRef } from 'react'
import { ArrowDown, Star } from 'lucide-react'
import { gsap, useGSAP } from '../lib/gsap'
import { useReady } from '../context/ready'
import { useBooking } from '../context/booking'
import { Img } from '../components/Img'
import { Wordmark } from '../components/Logo'
import { Button } from '../components/Button'
import { site } from '../data/site'
import { scrollToId } from '../lib/scroll'

export function Hero() {
  const root = useRef<HTMLElement>(null)
  const ready = useReady()
  const { open } = useBooking()

  useGSAP(
    () => {
      if (!ready) return
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
        tl.fromTo('[data-hero-media]', { scale: 1.25 }, { scale: 1, duration: 2.4 }, 0)
          .fromTo(
            '[data-hero-media]',
            { clipPath: 'inset(18% 12% 18% 12%)' },
            { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.8, ease: 'expo.inOut' },
            0,
          )
          .from('[data-hero-mark]', { yPercent: 101, duration: 1.6 }, 0.55)
          .from('[data-hero-line] > *', { yPercent: 110, duration: 1.3, stagger: 0.08 }, 0.8)
          .from('[data-hero-fade]', { opacity: 0, y: 20, duration: 1.2, stagger: 0.08 }, 1.0)

        // scroll-out: image drifts and dims, wordmark rises faster than the page
        gsap.to('[data-hero-media-inner]', {
          yPercent: 18,
          scale: 1.08,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
        })
        gsap.to('[data-hero-shade]', {
          opacity: 0.85,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
        })
        gsap.to('[data-hero-content]', {
          yPercent: -12,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
        })
      })
    },
    { scope: root, dependencies: [ready] },
  )

  return (
    <section ref={root} id="top" className="relative h-[100svh] min-h-[640px] overflow-hidden bg-ink text-paper">
      <div data-hero-media className="absolute inset-0 will-change-transform">
        <div data-hero-media-inner className="absolute inset-0">
          <Img
            id="photo-1503951914875-452162b0f3f1"
            alt="Barber finishing a precision cut"
            priority
            className="h-full w-full"
            imgClassName="object-[50%_30%]"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/25 to-black/85" />
        <div data-hero-shade className="absolute inset-0 bg-black opacity-0" />
      </div>

      <div data-hero-content className="shell relative z-10 flex h-full flex-col justify-between pb-5 pt-24 md:pb-8 md:pt-32">
        <div className="flex items-start justify-between gap-6">
          <div data-hero-fade className="label leading-[1.9] text-paper/80">
            Barber Club
            <br />
            Est. {site.established} — Amsterdam
          </div>
          <div data-hero-fade className="hidden max-w-[19rem] text-right text-[0.95rem] leading-relaxed text-paper/75 md:block">
            Precision cuts, straight-razor shaves and an hour that belongs to you. No noise, no rush — just the work,
            done properly.
          </div>
        </div>

        <div>
          <h1 className="sr-only">NOIR Barber Club — precision cuts, quietly done.</h1>
          <div data-hero-line aria-hidden className="mb-3 flex flex-wrap items-end gap-x-4 overflow-hidden pb-[0.18em] md:mb-6">
            <span className="serif block text-[clamp(1.9rem,4.4vw,4.25rem)] leading-none">Precision,</span>
            <span className="serif block text-[clamp(1.9rem,4.4vw,4.25rem)] leading-none text-paper/55">quietly done.</span>
          </div>
          <div className="overflow-hidden">
            <div data-hero-mark>
              <Wordmark className="block h-auto w-full" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 items-center gap-4 md:mt-7 md:grid-cols-3">
            <div data-hero-fade className="hidden items-center gap-3 md:flex">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-3.5 fill-paper text-paper" />
                ))}
              </div>
              <span className="label text-paper/70">4.9 · 1,240 reviews</span>
            </div>
            <button
              data-hero-fade
              type="button"
              onClick={() => scrollToId('club')}
              className="label flex items-center gap-3 text-paper/70 transition-colors hover:text-paper md:justify-self-center"
            >
              <ArrowDown className="size-4 animate-bounce" strokeWidth={1.25} />
              Scroll
            </button>
            <div data-hero-fade className="justify-self-end">
              <Button onClick={open} variant="light">
                Book a chair
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
