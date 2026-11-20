import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUp, Check } from 'lucide-react'
import { gsap, useGSAP } from '../lib/gsap'
import { useReveal } from '../hooks/useReveal'
import { useReady } from '../context/ready'
import { SUBJECTS, useContact, type Subject } from '../context/contact'
import { SectionLabel } from '../components/SectionLabel'
import { Lockup } from '../components/Logo'
import { Button } from '../components/Button'
import { navLinks, site } from '../data/site'
import { scrollToId } from '../lib/scroll'
import { nextFreeChair } from '../lib/schedule'
import { useBooking } from '../context/booking'
import { relativeDay, useI18n, type Dict } from '../i18n'

interface Form {
  name: string
  email: string
  subject: Subject
  message: string
}
const YEAR = new Date().getFullYear()
const empty: Form = { name: '', email: '', subject: 'general', message: '' }

function validate(f: Form, t: Dict) {
  const e: Partial<Record<keyof Form, string>> = {}
  if (f.name.trim().length < 2) e.name = t.contact.errors.name
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = t.contact.errors.email
  if (f.message.trim().length < 10) e.message = t.contact.errors.message
  return e
}

export function Footer() {
  const root = useRef<HTMLElement>(null)
  const ready = useReady()
  const { prefill } = useContact()
  const { open } = useBooking()
  const { t, locale, fmt } = useI18n()
  const [next] = useState(() => nextFreeChair())
  const [form, setForm] = useState<Form>(empty)
  const [tried, setTried] = useState(false)
  const [sent, setSent] = useState(false)
  useReveal(root)

  // apply a prefill request (from membership / gift cards) once per request
  const [applied, setApplied] = useState(0)
  if (prefill && prefill.nonce !== applied) {
    setApplied(prefill.nonce)
    setForm((f) => ({ ...f, subject: prefill.subject, message: prefill.message }))
    setSent(false)
  }

  useGSAP(
    () => {
      if (!ready) return
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-footer-mark]', {
          yPercent: 60,
          ease: 'none',
          scrollTrigger: { trigger: '[data-footer-mark]', start: 'top bottom', end: 'bottom bottom', scrub: true },
        })
      })
    },
    { scope: root, dependencies: [ready] },
  )

  const errors = validate(form, t)
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))
  const err = (k: keyof Form) => tried && errors[k]

  return (
    <footer ref={root} id="contact" className="relative overflow-hidden bg-ink text-paper">
      {/* Closing call to action */}
      <div className="shell">
        <div className="flex flex-col items-start justify-between gap-6 border-y border-line py-10 md:flex-row md:items-center md:py-14">
          <p key={locale} data-reveal="lines" className="display text-[clamp(1.9rem,4.4vw,4rem)]">
            {next ? (
              <>
                {t.contact.ctaA}
                <b>{t.contact.ctaB(relativeDay(next.offset, next.date, t, fmt), next.time)}</b>
              </>
            ) : (
              <>
                {t.contact.waitingA}
                <b>{t.contact.waitingB}</b>
              </>
            )}
          </p>
          <div data-reveal="fade" className="shrink-0">
            <Button variant="light" size="lg" onClick={open}>
              {t.common.bookChair}
            </Button>
          </div>
        </div>
      </div>

      <div className="shell grid gap-14 pt-20 md:pt-28 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <SectionLabel index="10">{t.contact.label}</SectionLabel>
          <h2 key={locale} data-reveal="lines" className="display mt-8 text-[clamp(2.6rem,6.4vw,6rem)]">
            {t.contact.a}
            <b>{t.contact.b}</b>
          </h2>
          <div data-reveal="stagger" className="mt-10 space-y-6 text-lg">
            <div>
              <div className="label mb-2 text-paper/45">{t.contact.call}</div>
              <a href={site.phoneHref} className="hover:underline">
                {site.phone}
              </a>
            </div>
            <div>
              <div className="label mb-2 text-paper/45">{t.contact.email}</div>
              <a href={`mailto:${site.email}`} className="break-all hover:underline">
                {site.email}
              </a>
            </div>
            <div>
              <div className="label mb-2 text-paper/45">{t.contact.visit}</div>
              <p>
                {site.address.street}, {site.address.city}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          <AnimatePresence mode="wait" initial={false}>
            {sent ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-3xl border border-line bg-coal p-8 md:p-10"
                role="status"
              >
                <span className="grid size-12 place-items-center rounded-full bg-paper text-ink">
                  <Check className="size-5" />
                </span>
                <h3 className="display mt-6 text-4xl">{t.contact.thanks(form.name.split(' ')[0])}</h3>
                <p className="mt-4 max-w-md leading-relaxed text-paper/60">
                  {t.contact.sentA}{' '}
                  <a className="underline" href={`mailto:${site.email}?subject=${encodeURIComponent(t.contact.subjects[form.subject])}&body=${encodeURIComponent(form.message)}`}>
                    {site.email}
                  </a>{' '}
                  {t.contact.sentB}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setForm(empty)
                    setTried(false)
                    setSent(false)
                  }}
                  className="label mt-8 underline underline-offset-4"
                >
                  {t.contact.another}
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                data-reveal="fade"
                noValidate
                initial={false}
                exit={{ opacity: 0, y: -20 }}
                onSubmit={(e) => {
                  e.preventDefault()
                  setTried(true)
                  if (Object.keys(errors).length === 0) setSent(true)
                }}
                className="grid gap-8 sm:grid-cols-2"
              >
                <label className="block">
                  <span className="label text-paper/50">{t.contact.name}</span>
                  <input className="field" autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)} aria-invalid={err('name') ? true : undefined} />
                  {err('name') && <span className="mt-2 block text-xs text-[#e58a7e]">{errors.name}</span>}
                </label>
                <label className="block">
                  <span className="label text-paper/50">{t.contact.email}</span>
                  <input className="field" type="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} aria-invalid={err('email') ? true : undefined} />
                  {err('email') && <span className="mt-2 block text-xs text-[#e58a7e]">{errors.email}</span>}
                </label>
                <label className="block sm:col-span-2">
                  <span className="label text-paper/50">{t.contact.subject}</span>
                  <select className="field" value={form.subject} onChange={(e) => set('subject', e.target.value as Subject)}>
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {t.contact.subjects[s]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <span className="label text-paper/50">{t.contact.message}</span>
                  <textarea
                    className="field resize-none"
                    rows={4}
                    value={form.message}
                    onChange={(e) => set('message', e.target.value)}
                    aria-invalid={err('message') ? true : undefined}
                    maxLength={1000}
                  />
                  {err('message') && <span className="mt-2 block text-xs text-[#e58a7e]">{errors.message}</span>}
                </label>
                <div className="flex flex-wrap items-center justify-between gap-4 sm:col-span-2">
                  <p className="max-w-xs text-xs text-paper/40">{t.contact.previewNote}</p>
                  <Button type="submit" variant="light" size="lg">
                    {t.contact.send}
                  </Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="shell mt-24 md:mt-36">
        <div className="grid grid-cols-2 gap-8 border-t border-line pt-10 md:grid-cols-4">
          <div>
            <div className="label mb-4 text-paper/40">{t.footer.explore}</div>
            <ul className="space-y-2.5 text-sm">
              {navLinks.slice(0, 4).map((l) => (
                <li key={l.href}>
                  <a href={l.href} onClick={(e) => { e.preventDefault(); scrollToId(l.href) }} className="text-paper/70 hover:text-paper">
                    {t.nav.links[l.key]}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="label mb-4 text-paper/40">{t.footer.club}</div>
            <ul className="space-y-2.5 text-sm">
              {[...navLinks.slice(4).map((l) => ({ label: t.nav.links[l.key], href: l.href })), { label: t.footer.bookNow, href: '#book' }].map((l) => (
                <li key={l.href}>
                  <a href={l.href} onClick={(e) => { e.preventDefault(); scrollToId(l.href) }} className="text-paper/70 hover:text-paper">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="label mb-4 text-paper/40">{t.footer.follow}</div>
            <ul className="space-y-2.5 text-sm">
              {site.socials.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noreferrer" className="text-paper/70 hover:text-paper">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col items-start justify-between gap-6 md:items-end">
            <button
              type="button"
              onClick={() => scrollToId('top')}
              className="group label flex items-center gap-3 text-paper/70 hover:text-paper"
            >
              {t.footer.top}
              <span className="grid size-10 place-items-center rounded-full border border-line transition-transform duration-500 group-hover:-translate-y-1">
                <ArrowUp className="size-4" strokeWidth={1.5} />
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="shell mt-16 overflow-hidden pb-6 md:mt-24">
        <div data-footer-mark className="text-paper/[0.09]">
          <Lockup className="w-full" />
        </div>
        <div className="label mt-8 flex flex-col justify-between gap-3 text-paper/35 sm:flex-row">
          <span>© {YEAR} {site.name}</span>
          <span>{site.demoContent ? t.footer.demo : t.footer.tagline}</span>
        </div>
      </div>
    </footer>
  )
}
