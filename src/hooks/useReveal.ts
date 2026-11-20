import { useRef, type RefObject } from 'react'
import { gsap, ScrollTrigger, SplitText, useGSAP } from '../lib/gsap'
import { useReady } from '../context/ready'
import { useI18n } from '../i18n'

/**
 * Wires declarative scroll animations inside `scope`:
 *  data-reveal="lines"   – masked line-by-line text reveal
 *  data-reveal="fade"    – fade + rise
 *  data-reveal="stagger" – fade + rise for each direct child
 *  data-reveal="img"     – clip-path wipe with an inner image settle
 *  data-parallax="0.2"   – scrubbed vertical drift (fraction of own height)
 *
 * Elements using data-reveal="lines" must carry key={locale}: SplitText rewrites
 * their DOM, so React has to remount them when the language changes. The hook
 * re-runs on a language switch; anything already scrolled into view is shown
 * in its final state instead of replaying its entrance.
 */
export function useReveal(scope: RefObject<HTMLElement | null>) {
  const ready = useReady()
  const { locale } = useI18n()
  const hasRun = useRef(false)

  useGSAP(
    () => {
      if (!ready || !scope.current) return
      const root = scope.current
      const mm = gsap.matchMedia()
      const rerun = hasRun.current
      hasRun.current = true
      /** On a language switch, content already seen should not animate in again. */
      const seen = (el: Element) => rerun && el.getBoundingClientRect().top < window.innerHeight

      mm.add(
        { motion: '(prefers-reduced-motion: no-preference)', reduce: '(prefers-reduced-motion: reduce)' },
        (ctx) => {
          const { reduce } = ctx.conditions as { reduce: boolean }
          const fades = root.querySelectorAll<HTMLElement>('[data-reveal="fade"], [data-reveal="stagger"] > *')
          if (reduce) {
            gsap.set(fades, { opacity: 1 })
            return
          }

          root.querySelectorAll<HTMLElement>('[data-reveal="lines"]').forEach((el) => {
            if (seen(el)) return
            SplitText.create(el, {
              type: 'lines',
              mask: 'lines',
              autoSplit: true,
              linesClass: 'split-line',
              onSplit: (self) =>
                gsap.from(self.lines, {
                  yPercent: 115,
                  duration: 1.35,
                  stagger: 0.08,
                  scrollTrigger: { trigger: el, start: 'top 90%', once: true },
                }),
            })
          })

          root.querySelectorAll<HTMLElement>('[data-reveal="fade"]').forEach((el) => {
            if (seen(el)) return void gsap.set(el, { opacity: 1, y: 0 })
            gsap.fromTo(
              el,
              { opacity: 0, y: 40 },
              {
                opacity: 1,
                y: 0,
                duration: 1.2,
                delay: Number(el.dataset.delay ?? 0),
                scrollTrigger: { trigger: el, start: 'top 92%', once: true },
              },
            )
          })

          root.querySelectorAll<HTMLElement>('[data-reveal="stagger"]').forEach((el) => {
            if (seen(el)) return void gsap.set(el.children, { opacity: 1, y: 0 })
            gsap.fromTo(
              el.children,
              { opacity: 0, y: 50 },
              {
                opacity: 1,
                y: 0,
                duration: 1.2,
                stagger: 0.09,
                scrollTrigger: { trigger: el, start: 'top 88%', once: true },
              },
            )
          })

          root.querySelectorAll<HTMLElement>('[data-reveal="img"]').forEach((el) => {
            if (seen(el)) return
            const inner = el.querySelector('img, [data-img-fallback]')
            const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 90%', once: true } })
            tl.fromTo(
              el,
              { clipPath: 'inset(100% 0% 0% 0%)' },
              { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut' },
            )
            if (inner) tl.fromTo(inner, { scale: 1.35 }, { scale: 1, duration: 1.8, ease: 'expo.out' }, 0.1)
          })

          root.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
            const amount = Number(el.dataset.parallax || 0.15)
            gsap.fromTo(
              el,
              { yPercent: amount * 100 },
              {
                yPercent: -amount * 100,
                ease: 'none',
                scrollTrigger: { trigger: el.parentElement ?? el, start: 'top bottom', end: 'bottom top', scrub: true },
              },
            )
          })
        },
      )

      // images that load late can change layout
      const refresh = () => ScrollTrigger.refresh()
      window.addEventListener('load', refresh)
      return () => window.removeEventListener('load', refresh)
    },
    { scope, dependencies: [ready, locale] },
  )
}
