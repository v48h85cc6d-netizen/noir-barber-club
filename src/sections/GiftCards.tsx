import { useMemo, useRef, useState, type ReactNode } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { Banknote, Gift, Info, Mail, MessageCircle, Phone, RotateCcw, Smartphone, Store } from 'lucide-react'
import { useReveal } from '../hooks/useReveal'
import { SectionLabel } from '../components/SectionLabel'
import { Wordmark } from '../components/Logo'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { formatPrice, site } from '../data/site'
import { useI18n } from '../i18n'
import {
  GIFT_AMOUNTS,
  GIFT_MAX,
  GIFT_MIN,
  GIFT_SETTINGS,
  newOrderReference,
  normalizePhone,
  codPhoneOf,
  validateGift,
  type GiftField,
  type GiftForm,
} from '../lib/giftcard'

const initial: GiftForm = {
  amount: 100,
  recipientName: '',
  recipientEmail: '',
  recipientPhone: '',
  senderName: '',
  message: '',
  delivery: 'email',
  channel: 'whatsapp',
  purchaserPhone: '',
  purchaserEmail: '',
  payment: GIFT_SETTINGS.cashOnDelivery.enabled ? 'cod' : 'in_person',
  codAddress: '',
  codPhone: '',
}

/** Two-option pill switch used for delivery, channel and payment choices. */
function Choice<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { id: T; label: string; icon: typeof Mail }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-1.5">
      {options.map(({ id, label: l, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          onClick={() => onChange(id)}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-full border px-3 py-2 text-center text-sm transition-colors ${
            value === id ? 'border-paper bg-paper text-ink' : 'border-line hover:border-paper/50'
          }`}
        >
          <Icon className="size-4 shrink-0" strokeWidth={1.5} /> {l}
        </button>
      ))}
    </div>
  )
}

function Field({ label, error, hint, children, className = '' }: { label: string; error?: string | false; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label text-paper/50">{label}</span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs text-[#e58a7e]">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-paper/40">{hint}</span>
      ) : null}
    </label>
  )
}

function Group({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-line pt-6">
      <legend className="label float-left mb-5 w-full text-paper/50">
        {n} — {title}
      </legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  )
}

export function GiftCards() {
  const root = useRef<HTMLElement>(null)
  const { t, locale } = useI18n()
  const g = t.gift
  useReveal(root)

  const [f, setF] = useState<GiftForm>(initial)
  const [custom, setCustom] = useState('')
  const [tried, setTried] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<GiftField, boolean>>>({})
  const [phase, setPhase] = useState<'closed' | 'review' | 'done'>('closed')
  const [reference, setReference] = useState('')
  const set = <K extends keyof GiftForm>(k: K, v: GiftForm[K]) => setF((s) => ({ ...s, [k]: v }))
  const touch = (k: GiftField) => () => setTouched((s) => ({ ...s, [k]: true }))

  const value = custom ? Number(custom) : f.amount
  const form = { ...f, amount: value }
  const invalid = validateGift(form)
  const show = (k: GiftField) => (tried || touched[k]) && invalid.includes(k)
  const err = (k: GiftField): string | false => {
    if (!show(k)) return false
    return k === 'amount' ? g.errors.amount(formatPrice(GIFT_MIN), formatPrice(GIFT_MAX)) : g.errors[k]
  }

  // pointer tilt
  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const srx = useSpring(rx, { stiffness: 150, damping: 18 })
  const sry = useSpring(ry, { stiffness: 150, damping: 18 })
  const shine = useTransform(sry, [-12, 12], ['0%', '100%'])
  const shineBg = useTransform(shine, (p) => `linear-gradient(115deg, transparent 20%, rgba(255,255,255,.55) ${p}, transparent 80%)`)

  const channelName = f.channel === 'whatsapp' ? g.whatsapp : g.sms
  const sendTo = f.delivery === 'email' ? f.recipientEmail.trim() : `${normalizePhone(f.recipientPhone)} (${channelName})`
  const payLabel = f.payment === 'cod' ? g.cod : g.inPerson

  /** The order as plain text, emailed to the shop. */
  const mailto = useMemo(() => {
    if (!reference) return ''
    const lines = [
      g.mail.intro,
      '',
      `${g.done.reference}: ${reference}`,
      `${g.done.status}`,
      '',
      `${g.mail.amount}: ${formatPrice(value)}`,
      `${g.rows.recipient}: ${f.recipientName.trim()}`,
      `${g.rows.deliverTo}: ${sendTo}`,
      `${g.from}: ${f.senderName.trim()}`,
      f.message.trim() ? `${g.mail.message}: "${f.message.trim()}"` : '',
      '',
      `${g.rows.payment}: ${payLabel}`,
      f.payment === 'cod' ? `${g.rows.address}: ${f.codAddress.trim()}` : '',
      f.payment === 'cod' ? `${g.codPhone}: ${normalizePhone(codPhoneOf(f))}` : '',
      `${g.rows.you}: ${normalizePhone(f.purchaserPhone)}${f.purchaserEmail.trim() ? ` · ${f.purchaserEmail.trim()}` : ''}`,
      `${g.mail.language}: ${locale.toUpperCase()}`,
    ].filter((l, i, a) => l !== '' || a[i - 1] !== '')
    return `mailto:${site.email}?subject=${encodeURIComponent(g.mail.subject(reference, formatPrice(value)))}&body=${encodeURIComponent(lines.join('\n'))}`
  }, [reference, g, value, f, sendTo, payLabel, locale])

  const reset = () => {
    setF(initial)
    setCustom('')
    setTried(false)
    setTouched({})
    setReference('')
    setPhase('closed')
  }

  const summaryRows: [string, string][] = [
    [g.mail.amount, formatPrice(value)],
    [g.rows.recipient, f.recipientName.trim()],
    [g.rows.deliverTo, sendTo],
    [g.from, f.senderName.trim()],
    ...(f.message.trim() ? ([[g.message, f.message.trim()]] as [string, string][]) : []),
    [g.rows.payment, payLabel],
    ...(f.payment === 'cod' ? ([[g.rows.address, f.codAddress.trim()]] as [string, string][]) : []),
    [g.rows.you, normalizePhone(f.purchaserPhone)],
  ]

  return (
    <section ref={root} id="gift-cards" className="section-y relative overflow-hidden bg-ink text-paper">
      <div className="shell grid gap-14 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-6">
          <div className="lg:sticky lg:top-28">
            <SectionLabel index="06">{g.label}</SectionLabel>
            <h2 key={locale} data-reveal="lines" className="display mt-8 text-[clamp(2.4rem,4.8vw,4.75rem)]">
              {g.a}
              <b>{g.b}</b>
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
                <motion.div aria-hidden className="pointer-events-none absolute inset-0 opacity-70 mix-blend-soft-light" style={{ background: shineBg }} />
                <div className="relative flex h-full flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <Wordmark className="w-[34%]" />
                    <span className="label text-ink/55">{g.card}</span>
                  </div>
                  <div>
                    <div className="label text-ink/55">{f.recipientName.trim() ? g.forName(f.recipientName.trim()) : g.forDefault}</div>
                    <div className="display mt-1 text-[clamp(2.75rem,8vw,4.75rem)] tabular-nums">
                      {invalid.includes('amount') ? formatPrice(0) : formatPrice(value)}
                    </div>
                  </div>
                  <div className="flex items-end justify-between gap-4">
                    <p className="line-clamp-2 max-w-[62%] text-sm font-medium leading-snug text-ink/70 sm:text-base">{f.message || g.defaultMessage}</p>
                    <span className="label shrink-0 text-right text-ink/50">{f.senderName.trim() ? `— ${f.senderName.trim()}` : g.previewInactive}</span>
                  </div>
                </div>
              </motion.div>
            </div>
            <p data-reveal="fade" className="mt-6 flex max-w-[560px] gap-3 text-xs leading-relaxed text-paper/50">
              <Info className="mt-px size-4 shrink-0" strokeWidth={1.5} />
              {g.inactiveNote}
            </p>
          </div>
        </div>

        {/* Order form */}
        <form
          data-reveal="fade"
          noValidate
          className="space-y-8 lg:col-span-5 lg:col-start-8"
          onSubmit={(e) => {
            e.preventDefault()
            setTried(true)
            if (invalid.length === 0) {
              setReference(newOrderReference())
              setPhase('review')
            } else {
              // bring the first problem into view
              requestAnimationFrame(() => root.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
            }
          }}
        >
          <p className="max-w-md leading-relaxed text-paper/60">{g.intro}</p>

          <Group n="01" title={g.amount}>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
              {GIFT_AMOUNTS.map((a) => {
                const on = !custom && f.amount === a
                return (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      set('amount', a)
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
                aria-label={g.customAria}
                inputMode="numeric"
                placeholder={g.other}
                value={custom}
                onChange={(e) => setCustom(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
                onBlur={touch('amount')}
                aria-invalid={show('amount') || undefined}
                className={`h-11 rounded-full border bg-transparent text-center text-sm font-semibold outline-none transition-colors placeholder:text-paper/35 focus:border-paper ${
                  custom ? (invalid.includes('amount') ? 'border-[#d96c5f]' : 'border-paper') : 'border-line'
                }`}
              />
            </div>
            {err('amount') && <p className="mt-2 text-xs text-[#e58a7e]">{err('amount')}</p>}
          </Group>

          <Group n="02" title={g.delivery}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={g.to} error={err('recipientName')} className="sm:col-span-2">
                <input
                  className="field"
                  name="giftRecipient"
                  value={f.recipientName}
                  maxLength={40}
                  onChange={(e) => set('recipientName', e.target.value)}
                  onBlur={touch('recipientName')}
                  aria-invalid={show('recipientName') || undefined}
                  placeholder={g.toPh}
                />
              </Field>
              <div className="sm:col-span-2">
                <Choice
                  label={g.delivery}
                  value={f.delivery}
                  onChange={(v) => set('delivery', v)}
                  options={[
                    { id: 'email', label: g.byEmail, icon: Mail },
                    { id: 'phone', label: g.byPhone, icon: Smartphone },
                  ]}
                />
              </div>
              {f.delivery === 'email' ? (
                <Field label={g.recipientEmail} error={err('recipientEmail')} className="sm:col-span-2">
                  <input
                    className="field"
                    type="email"
                    inputMode="email"
                    autoComplete="off"
                    name="giftRecipientEmail"
                    value={f.recipientEmail}
                    maxLength={254}
                    onChange={(e) => set('recipientEmail', e.target.value)}
                    onBlur={touch('recipientEmail')}
                    aria-invalid={show('recipientEmail') || undefined}
                    placeholder={g.emailPh}
                  />
                </Field>
              ) : (
                <>
                  <Field label={g.recipientPhone} error={err('recipientPhone')} hint={g.phoneHint} className="sm:col-span-2">
                    <input
                      className="field"
                      type="tel"
                      inputMode="tel"
                      autoComplete="off"
                      name="giftRecipientPhone"
                      value={f.recipientPhone}
                      maxLength={24}
                      onChange={(e) => set('recipientPhone', e.target.value)}
                      onBlur={touch('recipientPhone')}
                      aria-invalid={show('recipientPhone') || undefined}
                      placeholder={g.phonePh}
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <span className="label mb-2 block text-paper/50">{g.channel}</span>
                    <Choice
                      label={g.channel}
                      value={f.channel}
                      onChange={(v) => set('channel', v)}
                      options={[
                        { id: 'whatsapp', label: g.whatsapp, icon: MessageCircle },
                        { id: 'sms', label: g.sms, icon: Smartphone },
                      ]}
                    />
                  </div>
                </>
              )}
              <Field label={g.message} className="sm:col-span-2">
                <input className="field" value={f.message} maxLength={70} onChange={(e) => set('message', e.target.value)} placeholder={g.messagePh} />
              </Field>
            </div>
          </Group>

          <Group n="03" title={g.yourDetails}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={g.from} error={err('senderName')} className="sm:col-span-2">
                <input
                  className="field"
                  name="giftSender"
                  autoComplete="name"
                  value={f.senderName}
                  maxLength={40}
                  onChange={(e) => set('senderName', e.target.value)}
                  onBlur={touch('senderName')}
                  aria-invalid={show('senderName') || undefined}
                  placeholder={g.fromPh}
                />
              </Field>
              <Field label={g.yourPhone} error={err('purchaserPhone')} hint={g.yourPhoneHint}>
                <input
                  className="field"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  name="giftPurchaserPhone"
                  value={f.purchaserPhone}
                  maxLength={24}
                  onChange={(e) => set('purchaserPhone', e.target.value)}
                  onBlur={touch('purchaserPhone')}
                  aria-invalid={show('purchaserPhone') || undefined}
                  placeholder={g.phonePh}
                />
              </Field>
              <Field label={g.yourEmail} error={err('purchaserEmail')}>
                <input
                  className="field"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  name="giftPurchaserEmail"
                  value={f.purchaserEmail}
                  maxLength={254}
                  onChange={(e) => set('purchaserEmail', e.target.value)}
                  onBlur={touch('purchaserEmail')}
                  aria-invalid={show('purchaserEmail') || undefined}
                  placeholder={g.emailPh}
                />
              </Field>
            </div>
          </Group>

          <Group n="04" title={g.payment}>
            <Choice
              label={g.payment}
              value={f.payment}
              onChange={(v) => set('payment', v)}
              options={[
                ...(GIFT_SETTINGS.cashOnDelivery.enabled ? [{ id: 'cod' as const, label: g.cod, icon: Banknote }] : []),
                { id: 'in_person' as const, label: g.inPerson, icon: Store },
              ]}
            />
            <p className="mt-3 text-xs leading-relaxed text-paper/50">
              {f.payment === 'cod' ? g.codNote(GIFT_SETTINGS.cashOnDelivery.area) : g.inPersonNote(site.address.street)}
            </p>
            {f.payment === 'cod' && (
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <Field label={g.codAddress} error={err('codAddress')} className="sm:col-span-2">
                  <input
                    className="field"
                    autoComplete="street-address"
                    name="giftCodAddress"
                    value={f.codAddress}
                    maxLength={200}
                    onChange={(e) => set('codAddress', e.target.value)}
                    onBlur={touch('codAddress')}
                    aria-invalid={show('codAddress') || undefined}
                    placeholder={g.codAddressPh}
                  />
                </Field>
                <Field label={g.codPhone} error={err('codPhone')} hint={g.codPhoneHint} className="sm:col-span-2">
                  <input
                    className="field"
                    type="tel"
                    inputMode="tel"
                    name="giftCodPhone"
                    value={f.codPhone}
                    maxLength={24}
                    onChange={(e) => set('codPhone', e.target.value)}
                    onBlur={touch('codPhone')}
                    aria-invalid={show('codPhone') || undefined}
                    placeholder={f.purchaserPhone.trim() || g.phonePh}
                  />
                </Field>
              </div>
            )}
          </Group>

          <Button type="submit" variant="light" size="lg" className="w-full">
            {g.continue(invalid.includes('amount') ? '—' : formatPrice(value))}
          </Button>
        </form>
      </div>

      <Modal open={phase !== 'closed'} onClose={() => (phase === 'done' ? reset() : setPhase('closed'))} label={g.summary}>
        <div className="p-6 pt-14 sm:p-10 sm:pt-14">
          {phase === 'review' ? (
            <>
              <Gift className="size-6" strokeWidth={1.25} />
              <h3 className="display mt-5 text-4xl font-bold">{g.yourCard}</h3>
              <dl className="mt-6 text-[0.95rem]">
                {summaryRows.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-6 border-b border-ink/12 py-3">
                    <dt className="label shrink-0 text-ink/45">{k}</dt>
                    <dd className="min-w-0 break-words text-right">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-6 flex gap-3 rounded-xl border border-dashed border-ink/25 p-4 text-xs leading-relaxed text-ink/65">
                <Info className="mt-px size-4 shrink-0" strokeWidth={1.5} />
                <span>
                  {g.inactiveNote} {g.sendHint(site.email)}
                </span>
              </p>
              <div className="mt-8 grid gap-2 sm:grid-cols-2">
                <a
                  href={mailto}
                  data-autofocus
                  onClick={() => setPhase('done')}
                  className="group/btn flex h-14 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[0.95rem] font-medium text-paper transition-colors hover:bg-black"
                >
                  <Mail className="size-4" strokeWidth={1.5} /> {g.sendOrder}
                </a>
                <Button variant="outline-dark" size="lg" icon={false} onClick={() => setPhase('closed')}>
                  {g.keepEditing}
                </Button>
              </div>
            </>
          ) : (
            <div role="status">
              <div className="label inline-flex items-center gap-2 rounded-full border border-ink/20 px-3 py-2 text-ink/70">
                <span className="size-1.5 rounded-full bg-[#c98a2b]" /> {g.done.status}
              </div>
              <h3 className="display mt-5 text-4xl font-bold">{g.done.title}</h3>
              <div className="label mt-3 text-ink/55">
                {g.done.reference} {reference} · {formatPrice(value)}
              </div>
              <p className="mt-5 leading-relaxed text-ink/80">{g.done.body}</p>
              <ul className="mt-5 space-y-2 text-sm leading-relaxed text-ink/65">
                <li>{f.payment === 'cod' ? g.done.cod(GIFT_SETTINGS.cashOnDelivery.area) : g.done.inPerson(site.address.street)}</li>
                <li>
                  {f.delivery === 'email'
                    ? g.done.deliverEmail(f.recipientEmail.trim())
                    : g.done.deliverPhone(channelName, normalizePhone(f.recipientPhone))}
                </li>
              </ul>
              <div className="mt-6 rounded-xl bg-ink/[0.04] p-4 text-sm text-ink/70">
                {g.done.noApp}{' '}
                <a href={mailto} className="font-medium text-ink underline underline-offset-4">
                  {g.done.openAgain}
                </a>{' '}
                {g.done.orCall(site.phone)}
              </div>
              <div className="mt-8 flex flex-wrap gap-2">
                <a href={site.phoneHref} className="flex h-12 items-center gap-2 rounded-full border border-ink/20 px-5 text-sm hover:border-ink">
                  <Phone className="size-4" strokeWidth={1.5} /> {site.phone}
                </a>
                <button type="button" onClick={reset} className="flex h-12 items-center gap-2 rounded-full bg-ink px-5 text-sm text-paper hover:bg-black">
                  <RotateCcw className="size-4" strokeWidth={1.5} /> {g.done.newOrder}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </section>
  )
}
