import { useRef } from 'react'
import { gsap, useGSAP, prefersReducedMotion } from '../lib/gsap'
import { Wordmark } from './Logo'

/** Intro curtain: wordmark wipes in, counter runs, curtain lifts. */
export function Preloader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const count = useRef<HTMLSpanElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        onDone()
        gsap.set(root.current, { autoAlpha: 0 })
        return
      }
      const counter = { v: 0 }
      const fonts = document.fonts?.ready ?? Promise.resolve()
      const tl = gsap.timeline({ paused: true })
      tl.from('[data-pl-mark]', { yPercent: 105, duration: 1.3, ease: 'expo.out' })
        .from('[data-pl-meta]', { opacity: 0, y: 10, duration: 0.8, stagger: 0.08 }, 0.2)
        .to(
          counter,
          {
            v: 100,
            duration: 1.6,
            ease: 'power3.inOut',
            onUpdate: () => {
              if (count.current) count.current.textContent = String(Math.round(counter.v)).padStart(3, '0')
            },
          },
          0,
        )
        .to('[data-pl-mark]', { yPercent: -105, duration: 0.9, ease: 'expo.in' }, '+=0.1')
        .to('[data-pl-meta]', { opacity: 0, duration: 0.4 }, '<')
        .add(() => onDone(), '-=0.15')
        .to(root.current, { yPercent: -100, duration: 1.2, ease: 'expo.inOut' }, '-=0.2')
        .set(root.current, { autoAlpha: 0 })
      // never hold the visitor for long if fonts are slow
      Promise.race([fonts, new Promise((r) => setTimeout(r, 1500))]).then(() => tl.play())
    },
    { scope: root },
  )

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[200] flex flex-col justify-between bg-ink p-4 text-paper md:p-8"
      aria-hidden
    >
      <div className="flex justify-between">
        <span data-pl-meta className="label">Barber Club</span>
        <span data-pl-meta className="label">Est. 2016</span>
      </div>
      <div className="overflow-hidden">
        <div data-pl-mark>
          <Wordmark className="mx-auto block w-[min(78vw,720px)]" />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <span data-pl-meta className="label opacity-60">Loading the chair</span>
        <span ref={count} data-pl-meta className="display text-5xl tabular-nums md:text-7xl">
          000
        </span>
      </div>
    </div>
  )
}
