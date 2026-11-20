import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Plus } from 'lucide-react'
import { gsap, useGSAP } from '../lib/gsap'
import { useReveal } from '../hooks/useReveal'
import { useReady } from '../context/ready'
import { SectionLabel } from '../components/SectionLabel'
import { Img } from '../components/Img'
import { Modal } from '../components/Modal'
import { gallery } from '../data/content'

export function Gallery() {
  const root = useRef<HTMLElement>(null)
  const ready = useReady()
  const [active, setActive] = useState<number | null>(null)
  useReveal(root)

  useGSAP(
    () => {
      if (!ready) return
      const mm = gsap.matchMedia()
      mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        const pin = root.current!.querySelector<HTMLElement>('[data-pin]')!
        const track = root.current!.querySelector<HTMLElement>('[data-track]')!
        const distance = () => Math.max(0, track.scrollWidth - window.innerWidth)
        const tween = gsap.to(track, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: pin,
            pin: true,
            scrub: 0.8,
            start: 'top top',
            end: () => `+=${distance()}`,
            invalidateOnRefresh: true,
          },
        })
        // each frame's photo drifts inside its frame for depth
        track.querySelectorAll<HTMLElement>('[data-drift]').forEach((el) => {
          gsap.fromTo(
            el,
            { xPercent: -8 },
            {
              xPercent: 8,
              ease: 'none',
              scrollTrigger: {
                trigger: el.parentElement,
                containerAnimation: tween,
                start: 'left right',
                end: 'right left',
                scrub: true,
              },
            },
          )
        })
      })
    },
    { scope: root, dependencies: [ready] },
  )

  return (
    <section ref={root} id="gallery" className="relative bg-paper text-ink">
      <div data-pin className="overflow-hidden lg:flex lg:h-[100svh] lg:items-center">
        <div
          data-track
          className="no-scrollbar flex snap-x snap-mandatory items-center gap-3 overflow-x-auto py-24 pl-4 pr-4 md:gap-5 md:pl-8 lg:snap-none lg:overflow-visible lg:py-0 lg:pl-12 lg:pr-[12vw] lg:will-change-transform"
        >
          <div className="w-[82vw] shrink-0 snap-start pr-6 sm:w-[60vw] lg:w-[40vw] lg:pr-16">
            <SectionLabel index="05">Gallery</SectionLabel>
            <h2 data-reveal="lines" className="display mt-8 text-[clamp(3rem,6.6vw,8rem)]">
              Fresh <br />
              off the <br />
              <span className="serif normal-case">chair</span>
            </h2>
            <p data-reveal="fade" className="mt-8 max-w-xs leading-relaxed text-ink/60">
              Work from the floor this season. Tap any frame to look closer.
            </p>
            <div className="label mt-8 hidden items-center gap-3 text-ink/50 lg:flex">
              Scroll <ArrowRight className="size-4" strokeWidth={1.25} />
            </div>
          </div>

          {gallery.map((g, i) => (
            <button
              key={g.id + i}
              type="button"
              onClick={() => setActive(i)}
              className={`group relative shrink-0 snap-start overflow-hidden text-left ${
                g.tall
                  ? 'h-[62svh] w-[70vw] sm:w-[44vw] lg:h-[72vh] lg:w-[28vw]'
                  : 'h-[46svh] w-[82vw] sm:w-[60vw] lg:h-[52vh] lg:w-[38vw]'
              } ${i % 2 ? 'lg:self-end lg:mb-[8vh]' : 'lg:self-start lg:mt-[10vh]'}`}
              aria-label={`Open photo: ${g.caption}`}
            >
              <div data-drift className="absolute -inset-x-[10%] inset-y-0">
                <Img
                  id={g.id}
                  alt={g.caption}
                  sizes="(min-width: 1024px) 38vw, 82vw"
                  maxWidth={1440}
                  className="h-full w-full"
                  imgClassName="transition-transform duration-[1.2s] ease-[var(--ease-expo)] group-hover:scale-105"
                />
              </div>
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-4 text-paper">
                <span className="label">
                  {String(i + 1).padStart(2, '0')} — {g.caption}
                </span>
                <span className="grid size-9 place-items-center bg-paper text-ink transition-transform duration-500 group-hover:rotate-90">
                  <Plus className="size-4" strokeWidth={1.5} />
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <Lightbox index={active} onChange={setActive} />
    </section>
  )
}

function Lightbox({ index, onChange }: { index: number | null; onChange: (i: number | null) => void }) {
  const [dir, setDir] = useState(1)
  const close = useCallback(() => onChange(null), [onChange])
  const step = useCallback(
    (d: number) => {
      if (index === null) return
      setDir(d)
      onChange((index + d + gallery.length) % gallery.length)
    },
    [index, onChange],
  )

  useEffect(() => {
    if (index === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [index, step])

  const item = index !== null ? gallery[index] : null
  return (
    <Modal open={index !== null} onClose={close} label="Gallery viewer" variant="full">
      <div className="flex h-full w-full flex-col items-center justify-center gap-5 px-4 py-16 text-paper">
        <div className="relative h-[70svh] w-full max-w-5xl overflow-hidden">
          <AnimatePresence initial={false} custom={dir} mode="popLayout">
            {item && (
              <motion.div
                key={index}
                custom={dir}
                className="absolute inset-0"
                initial={{ opacity: 0, x: dir * 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -60 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.4}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -60) step(1)
                  else if (info.offset.x > 60) step(-1)
                }}
              >
                <Img id={item.id} alt={item.caption} sizes="90vw" className="h-full w-full" imgClassName="object-contain! bg-black" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex w-full max-w-5xl items-center justify-between">
          <span className="label">
            {String((index ?? 0) + 1).padStart(2, '0')} / {String(gallery.length).padStart(2, '0')} — {item?.caption}
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className="grid size-11 place-items-center border border-paper/30 hover:border-paper">
              <ArrowLeft className="size-4" strokeWidth={1.5} />
            </button>
            <button type="button" onClick={() => step(1)} aria-label="Next photo" className="grid size-11 place-items-center border border-paper/30 hover:border-paper">
              <ArrowRight className="size-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
