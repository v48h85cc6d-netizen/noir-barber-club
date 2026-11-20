import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { navLinks, site } from '../data/site'
import { Wordmark } from './Logo'
import { RollText } from './Button'
import { ArrowUpRight } from 'lucide-react'
import { useBooking } from '../context/booking'
import { scrollToId } from '../lib/scroll'

const ease = [0.16, 1, 0.3, 1] as const

export function Nav() {
  const { open: openBooking } = useBooking()
  const [menu, setMenu] = useState(false)
  const [hidden, setHidden] = useState(false)
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0
    setHidden(y > prev && y > 400)
  })

  useEffect(() => {
    if (!menu) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    document.addEventListener('keydown', onKey)
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.documentElement.style.overflow = ''
    }
  }, [menu])

  const go = (href: string) => {
    setMenu(false)
    // let the overlay start closing before scrolling
    setTimeout(() => scrollToId(href), menu ? 250 : 0)
  }

  return (
    <>
      {/* Logo sits on its own layer so it can invert over light sections */}
      <motion.a
        href="#top"
        onClick={(e) => {
          e.preventDefault()
          go('top')
        }}
        className="fixed left-4 top-5 z-50 block w-[88px] text-white mix-blend-difference md:left-8 md:top-7 md:w-[104px] xl:left-12"
        aria-label={`${site.name} — home`}
        animate={{ y: hidden && !menu ? -90 : 0 }}
        transition={{ duration: 0.7, ease }}
      >
        <Wordmark className="block h-auto w-full" />
      </motion.a>

      <motion.header
        className="pointer-events-none fixed inset-x-0 top-0 z-50"
        animate={{ y: hidden && !menu ? '-110%' : '0%' }}
        transition={{ duration: 0.7, ease }}
      >
        <nav className="shell flex h-16 items-center justify-end md:h-20 lg:justify-between" aria-label="Main">
          <span className="hidden w-[104px] lg:block" aria-hidden />
          <ul className="pointer-events-auto hidden items-center gap-1 rounded-full border border-white/10 bg-ink/70 p-1 text-paper backdrop-blur-md lg:flex">
            {navLinks.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={(e) => {
                    e.preventDefault()
                    go(l.href)
                  }}
                  className="group/link block rounded-full px-3.5 py-2 text-[0.8rem] text-paper/75 transition-colors hover:bg-white/10 hover:text-paper xl:px-4"
                >
                  <RollText>{l.label}</RollText>
                </a>
              </li>
            ))}
          </ul>

          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMenu(false)
                openBooking()
              }}
              className="group/btn flex h-10 items-center gap-2 rounded-full bg-paper pl-4 pr-1 text-sm font-medium text-ink shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)] transition-colors hover:bg-white md:h-11 md:pl-5 md:pr-1.5"
            >
              <RollText>Book</RollText>
              <span className="grid size-8 place-items-center rounded-full bg-ink text-paper">
                <ArrowUpRight className="size-4 transition-transform duration-500 group-hover/btn:rotate-45" strokeWidth={1.75} />
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMenu((m) => !m)}
              aria-expanded={menu}
              aria-controls="mobile-menu"
              aria-label={menu ? 'Close menu' : 'Open menu'}
              className="relative grid size-10 place-items-center rounded-full border border-white/10 bg-ink/70 text-paper backdrop-blur-md lg:hidden"
            >
              <span
                className={`absolute h-px w-4 bg-paper transition-transform duration-500 ease-[var(--ease-expo)] ${
                  menu ? 'rotate-45' : '-translate-y-[3px]'
                }`}
              />
              <span
                className={`absolute h-px w-4 bg-paper transition-transform duration-500 ease-[var(--ease-expo)] ${
                  menu ? '-rotate-45' : 'translate-y-[3px]'
                }`}
              />
            </button>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {menu && (
          <motion.div
            id="mobile-menu"
            className="fixed inset-0 z-40 flex flex-col bg-ink pt-20 text-paper lg:hidden"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
          >
            <ul className="shell flex flex-1 flex-col justify-center gap-1">
              {navLinks.map((l, i) => (
                <li key={l.href} className="overflow-hidden border-b border-white/10">
                  <motion.a
                    href={l.href}
                    onClick={(e) => {
                      e.preventDefault()
                      go(l.href)
                    }}
                    className="flex items-baseline justify-between py-2.5"
                    initial={{ y: '110%' }}
                    animate={{ y: '0%' }}
                    exit={{ y: '110%' }}
                    transition={{ duration: 0.8, ease, delay: 0.25 + i * 0.05 }}
                  >
                    <span className="display text-[clamp(2rem,9vw,3.75rem)] font-bold">{l.label}</span>
                    <span className="label opacity-40">0{i + 1}</span>
                  </motion.a>
                </li>
              ))}
            </ul>
            <motion.div
              className="shell flex flex-col gap-1 pb-8 text-sm text-paper/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.6 } }}
              exit={{ opacity: 0 }}
            >
              <a href={site.phoneHref}>{site.phone}</a>
              <a href={`mailto:${site.email}`}>{site.email}</a>
              <span>
                {site.address.street}, {site.address.city}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
