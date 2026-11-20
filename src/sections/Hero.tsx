import { useRef, useState } from 'react'
import { Star } from 'lucide-react'
import { gsap, useGSAP } from '../lib/gsap'
import { useReady } from '../context/ready'
import { useBooking } from '../context/booking'
import { Img } from '../components/Img'
import { Wordmark } from '../components/Logo'
import { Button } from '../components/Button'
import { site } from '../data/site'
import { nextFreeChair, openStatus } from '../lib/schedule'
import { scrollToId } from '../lib/scroll'

export function Hero() {
  const root = useRef<HTMLElement>(null)
  const ready = useReady()
  const { open } = useBooking()
  const [{ status, next }] = useState(() => ({ status: openStatus(), next: nextFreeChair() }))

  useGSAP(
    () => {
      if (!ready) return
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
        tl.fromTo('[data-hero-media]', { scale: 1.18, opacity: 0 }, { scale: 1, opacity: 1, duration: 2.4 }, 0)
          .fromTo('[data-hero-spot]', { opacity: 0 }, { opacity: 1, duration: 2 }, 0.3)
          .from('[data-hero-mark]', { yPercent: 101, duration: 1.6 }, 0.5)
          .from('[data-hero-line] > *', { yPercent: 110, duration: 1.3, stagger: 0.08 }, 0.7)
          .from('[data-hero-fade]', { opacity: 0, y: 16, duration: 1.2, stagger: 0.07 }, 0.9)

        const st = { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true }
        gsap.to('[data-hero-media-inner]', { yPercent: 14, scale: 1.06, ease: 'none', scrollTrigger: st })
        gsap.to('[data-hero-mark-wrap]', { yPercent: -18, ease: 'none', scrollTrigger: st })
        gsap.to('[data-hero-shade]', { opacity: 0.8, ease: 'none', scrollTrigger: st })
      })
    },
    { scope: root, dependencies: [ready] },
  )

  return (
    <section ref={root} id="top" className="relative h-[100svh] min-h-[640px] overflow-hidden bg-ink text-paper">
      <div data-hero-media className="absolute inset-0">
        <div data-hero-media-inner className="absolute inset-0">
          <Img
            id="photo-1503951914875-452162b0f3f1"
            alt="Barber detailing a beard with scissors"
            priority
            className="h-full w-full"
            imgClassName="object-[60%_30%] brightness-[0.62]"
          />
        </div>
        {/* overhead spotlight */}
        <div
          data-hero-spot
          className="absolute inset-0 bg-[radial-gradient(42%_70%_at_62%_-8%,rgba(255,255,255,0.16),transparent_70%)]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/10 to-black/90" />
        <div data-hero-shade className="absolute inset-0 bg-black opacity-0" />
      </div>

      <div className="shell relative z-10 flex h-full flex-col justify-between pb-5 pt-24 md:pb-7 md:pt-28">
        <div className="flex items-start justify-between gap-6">
          <h1 data-hero-line className="display overflow-hidden pb-1 text-[clamp(1.6rem,3.3vw,2.75rem)] leading-[1.02]">
            <span className="block">Precision cuts.</span>
            <b className="block">Quietly done.</b>
          </h1>
          <div data-hero-fade className="label hidden items-center gap-2 pt-2 text-paper/70 md:flex">
            <span className={`size-1.5 rounded-full ${status.open ? 'bg-paper' : 'bg-paper/40'}`} />
            {status.open ? 'Open now' : 'Closed now'}
            {next && ` · next chair ${next.when === 'today' ? '' : next.when + ' '}${next.time}`}
          </div>
        </div>

        <div>
          <div className="mb-6 flex flex-col gap-5 md:mb-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-sm">
              <p data-hero-fade className="text-[0.95rem] leading-relaxed text-paper/70">
                Fades, scissor work and hot-towel shaves on {site.address.street}.{' '}
                <b className="font-semibold text-paper">Book your barber in under a minute.</b>
              </p>
              <div data-hero-fade className="mt-5 flex flex-wrap gap-2">
                <Button onClick={open} variant="light">
                  Book a chair
                </Button>
                <Button onClick={() => scrollToId('services')} variant="outline-light" icon={false}>
                  See prices
                </Button>
              </div>
            </div>
            <div data-hero-fade className="label flex items-center gap-2 text-paper/60">
              <span className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-3 fill-paper text-paper" />
                ))}
              </span>
              {site.rating.score} · {site.rating.count.toLocaleString('en-GB')} {site.rating.source} reviews
              {site.demoContent && ' (sample)'}
            </div>
          </div>
          <div data-hero-mark-wrap className="overflow-hidden">
            <div data-hero-mark>
              <Wordmark className="block h-auto w-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
