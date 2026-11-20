import { useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { Gift, Info, Mail, Printer } from 'lucide-react'
import { useReveal } from '../hooks/useReveal'
import { useContact } from '../context/contact'
import { SectionLabel } from '../components/SectionLabel'
import { Wordmark } from '../components/Logo'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { formatPrice, site } from '../data/site'
import { useI18n } from '../i18n'

const amounts = [50, 75, 100, 150, 250]

export function GiftCards() {
  const root = useRef<HTMLElement>(null)
  const { contactAbout } = useContact()
  const { t, locale } = useI18n()
  useReveal(root)

  const [amount, setAmount] = useState(100)
  const [custom, setCustom] = useState('')
  const [to, setTo] = useState('')
  const [from, setFrom] = useState('')
  const [message, setMessage] = useState('')
  const [delivery, setDelivery] = useState<'email' | 'print'>('email')
  const [review, setReview] = useState(false)

  const customValue = Number(custom)
  const value = custom ? customValue : amount
  const customInvalid = !!custom && (!Number.isFinite(customValue) || customValue < 25 || customValue > 1000)
  const valid = value >= 25 && value <= 1000 && !customInvalid

  // pointer tilt
  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const srx = useSpring(rx, { stiffness: 150, damping: 18 })
  const sry = useSpring(ry, { stiffness: 150, damping: 18 })
  const shine = useTransform(sry, [-12, 12], ['0%', '100%'])
  const shineBg = useTransform(shine, (p) => `linear-gradient(115deg, transparent 20%, rgba(255,255,255,.55) ${p}, transparent 80%)`)

  const code = `NBC-${String(value).padStart(3, '0')}-${(to || 'GUEST').slice(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X')}`

  return (
    <section ref={root} id="gift-cards" className="section-y relative overflow-hidden bg-ink text-paper">
      <div className="shell grid gap-14 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-6">
          <SectionLabel index="06">{t.gift.label}</SectionLabel>
          <h2 key={locale} data-reveal="lines" className="display mt-8 text-[clamp(2.4rem,4.8vw,4.75rem)]">
            {t.gift.a}
            <b>{t.gift.b}</b>
          </h2>

          {/* Card preview */}
          <div data-reveal="fade" className="mt-12 [perspective:1200px] md:mt-16">
            <motion.div
              onPointerMove={(e) => {
                if (e.pointerType !== 'mouse') return
                const r = e.currentTarget.getBoundingClientRect()
                ry.set(((e.clientX - r.left) / r.width - 0.5) * 24)
                rx.set(-((e.clientY - r.top) / r.height - 0.5) * 18)
              }}
              onPointerLeave={() => {
                rx.set(0)
                ry.set(0)
              }}
              style={{ rotateX: srx, rotateY: sry, transformStyle: 'preserve-3d' }}
              className="relative aspect-[1.586] w-full max-w-[560px] overflow-hidden rounded-2xl bg-[linear-gradient(125deg,#f4f4f2_0%,#bcbcb9_22%,#eeeeec_42%,#9d9d9a_63%,#d9d9d6_82%,#8f8f8c_100%)] p-5 text-ink shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.8)] sm:p-7"
            >
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-70 mix-blend-soft-light"
                style={{ background: shineBg }}
              />
              <div className="relative flex h-full flex-col justify-between">
                <div className="flex items-start justify-between">
                  <Wordmark className="w-[34%]" />
                  <span className="label text-ink/55">{t.gift.card}</span>
                </div>
                <div>
                  <div className="label text-ink/55">{to ? t.gift.forName(to) : t.gift.forDefault}</div>
                  <div className="display mt-1 text-[clamp(2.75rem,8vw,4.75rem)] tabular-nums">
                    {valid ? formatPrice(value) : formatPrice(0)}
                  </div>
                </div>
                <div className="flex items-end justify-between gap-4">
                  <p className="line-clamp-2 max-w-[68%] text-sm font-medium leading-snug text-ink/70 sm:text-base">
                    {message || t.gift.defaultMessage}
                  </p>
                  <span className="label shrink-0 text-ink/50">{from ? `— ${from}` : code}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Configurator */}
        <form
          data-reveal="fade"
          className="lg:col-span-5 lg:col-start-8 lg:self-end"
          onSubmit={(e) => {
            e.preventDefault()
            if (valid) setReview(true)
          }}
        >
          <p className="max-w-md leading-relaxed text-paper/60">
            {t.gift.intro}
          </p>

          <fieldset className="mt-10">
            <legend className="label mb-4 text-paper/50">{t.gift.amount}</legend>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
              {amounts.map((a) => {
                const on = !custom && amount === a
                return (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setAmount(a)
                      setCustom('')
                    }}
                    className={`h-11 rounded-full border text-sm font-semibold tabular-nums transition-colors ${
                      on ? 'border-paper bg-paper text-ink' : 'border-line hover:border-paper/50'
                    }`}
                  >
                    {formatPrice(a)}
                  </button>
                )
              })}
              <input
                aria-label={t.gift.customAria}
                inputMode="numeric"
                placeholder={t.gift.other}
                value={custom}
                onChange={(e) => setCustom(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
                aria-invalid={customInvalid || undefined}
                className={`h-11 rounded-full border bg-transparent text-center text-sm font-semibold outline-none transition-colors placeholder:text-paper/35 focus:border-paper ${
                  custom ? (customInvalid ? 'border-[#d96c5f]' : 'border-paper') : 'border-line'
                }`}
              />
            </div>
            {customInvalid && <p className="mt-2 text-xs text-[#e58a7e]">{t.gift.amountError(formatPrice(25), formatPrice(1000))}</p>}
          </fieldset>

          <div className="mt-8 grid gap-7 sm:grid-cols-2">
            <label className="block">
              <span className="label text-paper/50">{t.gift.to}</span>
              <input className="field" value={to} maxLength={24} onChange={(e) => setTo(e.target.value)} placeholder={t.gift.toPh} />
            </label>
            <label className="block">
              <span className="label text-paper/50">{t.gift.from}</span>
              <input className="field" value={from} maxLength={24} onChange={(e) => setFrom(e.target.value)} placeholder={t.gift.fromPh} />
            </label>
            <label className="block sm:col-span-2">
              <span className="label text-paper/50">{t.gift.message}</span>
              <input className="field" value={message} maxLength={70} onChange={(e) => setMessage(e.target.value)} placeholder={t.gift.messagePh} />
            </label>
          </div>

          <fieldset className="mt-8">
            <legend className="label mb-4 text-paper/50">{t.gift.delivery}</legend>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  ['email', t.gift.byEmail, Mail],
                  ['print', t.gift.pickUp, Printer],
                ] as const
              ).map(([k, label, Icon]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={delivery === k}
                  onClick={() => setDelivery(k)}
                  className={`flex h-11 items-center justify-center gap-2 rounded-full border text-sm transition-colors ${
                    delivery === k ? 'border-paper bg-paper text-ink' : 'border-line hover:border-paper/50'
                  }`}
                >
                  <Icon className="size-4" strokeWidth={1.5} /> {label}
                </button>
              ))}
            </div>
          </fieldset>

          <Button type="submit" variant="light" size="lg" className="mt-10 w-full" disabled={!valid}>
            {t.gift.continue(valid ? formatPrice(value) : '—')}
          </Button>
        </form>
      </div>

      <Modal open={review} onClose={() => setReview(false)} label={t.gift.summary}>
        <div className="p-6 pt-14 sm:p-10 sm:pt-14">
          <Gift className="size-6" strokeWidth={1.25} />
          <h3 className="display mt-5 text-4xl">{t.gift.yourCard}</h3>
          <dl className="mt-6 text-[0.95rem]">
            {[
              [t.gift.amount, formatPrice(value)],
              [t.gift.to, to || '—'],
              [t.gift.from, from || '—'],
              [t.gift.message, message || '—'],
              [t.gift.delivery, delivery === 'email' ? t.gift.byEmail : t.gift.pickUpLong],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-6 border-b border-ink/12 py-3">
                <dt className="label text-ink/45">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 flex gap-3 border border-dashed border-ink/25 p-4 text-xs leading-relaxed text-ink/65">
            <Info className="mt-px size-4 shrink-0" strokeWidth={1.5} />
            {t.gift.note(site.address.street)}
          </p>
          <div className="mt-8 grid gap-2 sm:grid-cols-2">
            <Button
              variant="dark"
              data-autofocus
              onClick={() => {
                setReview(false)
                contactAbout(
                  'gift',
                  t.gift.request({ price: formatPrice(value), to, from, email: delivery === 'email', message }),
                )
              }}
            >
              {t.common.sendRequest}
            </Button>
            <Button variant="outline-dark" icon={false} onClick={() => setReview(false)}>
              {t.gift.keepEditing}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  )
}
