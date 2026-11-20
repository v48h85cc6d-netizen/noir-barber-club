import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { navLinks, site } from '../data/site'
import { Wordmark } from './Logo'
import { RollText } from './Button'
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
      <motion.header
        className="fixed inset-x-0 top-0 z-50 text-white mix-blend-difference"
        animate={{ y: hidden && !menu ? '-110%' : '0%' }}
        transition={{ duration: 0.7, ease }}
      >
        <nav className="shell flex h-16 items-center justify-between md:h-20" aria-label="Main">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault()
              go('top')
            }}
            className="block w-[88px] md:w-[104px]"
            aria-label={`${site.name} — home`}
          >
            <Wordmark className="block h-auto w-full" />
          </a>

          <ul className="hidden items-center gap-7 lg:flex xl:gap-9">
            {navLinks.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={(e) => {
                    e.preventDefault()
                    go(l.href)
                  }}
                  className="group/link block"
                >
                  <RollText>{l.label}</RollText>
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 md:gap-3">
            <button
              type="button"
              onClick={() => {
                setMenu(false)
                openBooking()
              }}
              className="group/btn flex h-10 items-center border border-white/40 px-4 transition-colors duration-500 hover:border-white hover:bg-white hover:text-black md:h-11 md:px-5"
            >
              <RollText>Book now</RollText>
            </button>
            <button
              type="button"
              onClick={() => setMenu((m) => !m)}
              aria-expanded={menu}
              aria-controls="mobile-menu"
              aria-label={menu ? 'Close menu' : 'Open menu'}
              className="relative grid size-10 place-items-center lg:hidden"
            >
              <span
                className={`absolute h-px w-6 bg-white transition-transform duration-500 ease-[var(--ease-expo)] ${
                  menu ? 'rotate-45' : '-translate-y-[4px]'
                }`}
              />
              <span
                className={`absolute h-px w-6 bg-white transition-transform duration-500 ease-[var(--ease-expo)] ${
                  menu ? '-rotate-45' : 'translate-y-[4px]'
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
                    <span className="display text-[clamp(1.75rem,8.6vw,3.75rem)]">{l.label}</span>
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
