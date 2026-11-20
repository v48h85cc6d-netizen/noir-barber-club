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
            <h2 data-reveal="lines" className="display mt-8 text-[clamp(3rem,9vw,9rem)]">
              Join <br className="sm:hidden" />
              the <span className="serif normal-case">club</span>
            </h2>
          </div>
          <div data-reveal="fade" className="flex flex-col gap-5 md:items-end">
            <p className="max-w-sm leading-relaxed text-ink/65 md:text-right">
              One monthly fee, always sharp. Cancel or pause any time after your first three months.
            </p>
            <div className="relative inline-flex border border-ink/20 p-1" role="radiogroup" aria-label="Billing period">
              {(['Monthly', 'Annual'] as const).map((p) => {
                const on = (p === 'Annual') === annual
                return (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setAnnual(p === 'Annual')}
                    className={`label relative z-10 h-10 px-5 transition-colors duration-500 ${on ? 'text-paper' : 'text-ink/60'}`}
                  >
                    {on && (
                      <motion.span
                        layoutId="billing"
                        className="absolute inset-0 -z-10 bg-ink"
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

        <div data-reveal="stagger" className="mt-14 grid gap-3 md:mt-20 lg:grid-cols-3 lg:gap-4">
          {plans.map((p) => {
            const price = annual ? Math.round(p.monthly * (1 - ANNUAL_DISCOUNT)) : p.monthly
            const dark = p.featured
            return (
              <article
                key={p.id}
                className={`group relative flex flex-col p-6 transition-transform duration-700 ease-[var(--ease-expo)] hover:-translate-y-1.5 md:p-9 ${
                  dark ? 'bg-ink text-paper' : 'border border-ink/15 bg-bone/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-extrabold uppercase tracking-tight [font-stretch:125%]">{p.name}</h3>
                  {dark && <span className="label border border-paper/30 px-3 py-2">Most chosen</span>}
                </div>
                <p className={`serif mt-3 text-xl ${dark ? 'text-paper/65' : 'text-ink/60'}`}>{p.tagline}</p>

                <div className="mt-10 flex items-end gap-2">
                  <motion.span
                    key={price}
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="display text-[clamp(3.5rem,6vw,5.5rem)] tabular-nums"
                  >
                    {formatPrice(price)}
                  </motion.span>
                  <span className={`label mb-2 ${dark ? 'text-paper/50' : 'text-ink/50'}`}>/ month</span>
                </div>
                <p className={`mt-2 h-4 text-xs ${dark ? 'text-paper/45' : 'text-ink/45'}`}>
                  {annual ? `Billed ${formatPrice(price * 12)} yearly` : 'Billed monthly'}
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
