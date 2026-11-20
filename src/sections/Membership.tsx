import { useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import { useReveal } from '../hooks/useReveal'
import { useContact } from '../context/contact'
import { SectionLabel } from '../components/SectionLabel'
import { Button } from '../components/Button'
import { plans } from '../data/content'
import { formatPrice } from '../data/site'

const ANNUAL_DISCOUNT = 0.15

export function Membership() {
  const root = useRef<HTMLElement>(null)
  const { contactAbout } = useContact()
  const [annual, setAnnual] = useState(false)
  useReveal(root)

  return (
    <section ref={root} id="membership" className="section-y relative bg-paper text-ink">
      <div className="shell">
        <div className="flex flex-col justify-between gap-10 md:flex-row md:items-end">
          <div>
            <SectionLabel index="07">Membership</SectionLabel>
            <h2 data-reveal="lines" className="display mt-8 text-[clamp(2.6rem,6.4vw,6rem)]">
              Always sharp. <b>Never think about it.</b>
            </h2>
          </div>
          <div data-reveal="fade" className="flex flex-col gap-5 md:items-end">
            <p className="max-w-sm leading-relaxed text-ink/65 md:text-right">
              One monthly fee, always sharp. Cancel or pause any time after your first three months.
            </p>
            <div className="relative inline-flex rounded-full border border-ink/20 p-1" role="radiogroup" aria-label="Billing period">
              {(['Monthly', 'Annual'] as const).map((p) => {
                const on = (p === 'Annual') === annual
                return (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setAnnual(p === 'Annual')}
                    className={`relative z-10 h-9 rounded-full px-5 text-sm transition-colors duration-500 ${on ? 'text-paper' : 'text-ink/60'}`}
                  >
                    {on && (
                      <motion.span
                        layoutId="billing"
                        className="absolute inset-0 -z-10 rounded-full bg-ink"
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      />
                    )}
                    {p}
                    {p === 'Annual' && <span className="ml-2 opacity-60">−15%</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div data-reveal="stagger" className="mt-14 grid gap-4 md:mt-20 lg:grid-cols-3 lg:items-center lg:gap-0 lg:px-6">
          {plans.map((p, idx) => {
            const price = annual ? Math.round(p.monthly * (1 - ANNUAL_DISCOUNT)) : p.monthly
            const dark = p.featured
            return (
              <article
                key={p.id}
                className={`group relative flex flex-col rounded-3xl p-6 transition-[translate,rotate,scale] duration-700 ease-[var(--ease-expo)] md:p-9 ${
                  dark
                    ? 'z-10 bg-ink text-paper shadow-[0_40px_80px_-30px_rgba(0,0,0,0.55)] lg:scale-[1.04] lg:hover:-translate-y-2'
                    : `border border-ink/10 bg-white/70 shadow-[0_30px_60px_-35px_rgba(0,0,0,0.35)] lg:hover:rotate-0 lg:hover:-translate-y-2 ${
                        idx === 0 ? 'lg:translate-x-6 lg:translate-y-6 lg:-rotate-[4deg]' : 'lg:-translate-x-6 lg:translate-y-6 lg:rotate-[4deg]'
                      }`
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="label opacity-60">{p.name}</h3>
                  {dark && (
                    <span className="label absolute -top-3 right-6 rotate-[4deg] rounded-full bg-paper px-3 py-1.5 text-ink shadow">
                      Most chosen
                    </span>
                  )}
                </div>
                <p className={`mt-3 text-lg font-medium [font-stretch:112%] ${dark ? 'text-paper/80' : 'text-ink/75'}`}>{p.tagline}</p>

                <div className="mt-10 flex items-end gap-2">
                  <motion.span
                    key={price}
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="display text-[clamp(3.5rem,6vw,5.5rem)] font-bold tabular-nums"
                  >
                    {formatPrice(price)}
                  </motion.span>
                  <span className={`label mb-2 ${dark ? 'text-paper/50' : 'text-ink/50'}`}>/ month</span>
                </div>
                <p className={`label mt-2 ${dark ? 'text-paper/50' : 'text-ink/50'}`}>
                  {annual ? `Billed ${formatPrice(price * 12)} yearly` : 'Billed monthly'} · saves ~{formatPrice(p.saving)}/mo
                </p>

                <ul className={`mt-8 flex-1 space-y-3.5 border-t pt-8 ${dark ? 'border-paper/15' : 'border-ink/12'}`}>
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-[0.95rem]">
                      <Check className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  variant={dark ? 'light' : 'dark'}
                  size="lg"
                  className="mt-10 w-full"
                  onClick={() =>
                    contactAbout(
                      'Membership',
                      `I'd like to join the ${p.name} membership (${annual ? 'annual' : 'monthly'} billing, ${formatPrice(price)}/month). Please get in touch to set it up.`,
                    )
                  }
                >
                  Join {p.name}
                </Button>
              </article>
            )
          })}
        </div>
        <p data-reveal="fade" className="mt-6 text-center text-xs text-ink/45">
          Memberships are set up in person or by email for now — joining sends us a request, no payment is taken online.
        </p>
      </div>
    </section>
  )
}
