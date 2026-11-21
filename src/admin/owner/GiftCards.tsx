import { useState } from 'react'
import { Mail, MessageCircle, Send, Smartphone } from 'lucide-react'
import { useStore } from '../data/store'
import type { GiftCardRecord } from '../data/types'
import { addDays, startOfDay } from '../data/select'
import { useAdminT } from '../i18n'
import { Btn, Card, Empty, Kpi, PageHeader, Segmented, Sheet, Tag, inputCls, useAct, useNow } from '../ui'

const channelIcon = { email: Mail, whatsapp: MessageCircle, sms: Smartphone }

export function GiftCards() {
  const { t, fmt, money } = useAdminT()
  const { data, confirmGiftPayment, cancelGift, markGiftDelivered, redeemGift } = useStore()
  const act = useAct()
  const now = useNow()
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'cancelled'>('all')
  const [openRef, setOpenRef] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const g = data.giftCards.find((x) => x.reference === openRef)
  const list = data.giftCards.filter((x) => filter === 'all' || x.payment === filter)
  const manual = data.giftCards.filter((x) => x.payment === 'paid' && x.delivery === 'manual_required')
  const sixty = addDays(startOfDay(now), -60)

  const payTone = { pending: 'warn', paid: 'good', cancelled: 'neutral' } as const
  const delTone = { awaiting_payment: 'neutral', manual_required: 'gold', delivered: 'good' } as const
  const status = (x: GiftCardRecord) => (
    <span className="flex flex-wrap gap-1.5">
      <Tag tone={payTone[x.payment]}>{t.gift.paymentStatus[x.payment]}</Tag>
      {x.payment !== 'cancelled' && <Tag tone={delTone[x.delivery]}>{t.gift.deliveryStatus[x.delivery]}</Tag>}
    </span>
  )

  return (
    <>
      <PageHeader title={<b>{t.gift.title}</b>} intro={t.gift.intro} />
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-3">
        <Kpi accent label={t.gift.pendingTotal} value={money(data.giftCards.filter((x) => x.payment === 'pending').reduce((s, x) => s + x.amount, 0))} hint={`${data.giftCards.filter((x) => x.payment === 'pending').length} ×`} />
        <Kpi label={t.gift.activeTotal} value={money(data.giftCards.filter((x) => x.payment === 'paid').reduce((s, x) => s + x.balance, 0))} />
        <Kpi label={t.gift.soldTotal} value={money(data.giftCards.filter((x) => x.payment === 'paid' && new Date(x.createdAt) >= sixty).reduce((s, x) => s + x.amount, 0))} />
      </div>

      {manual.length > 0 && (
        <Card title={t.gift.deliveryStatus.manual_required} className="mt-4 border-[#d2b07a]/30 md:mt-6">
          <p className="mb-4 text-sm text-paper/60">{t.gift.manualNote}</p>
          <ul className="space-y-2">
            {manual.map((x) => {
              const Icon = channelIcon[x.deliveryMethod]
              return (
                <li key={x.reference} className="flex flex-wrap items-center gap-3 rounded-xl border border-paper/[0.07] bg-white/60 p-3">
                  <Icon className="size-4 text-[#8a6a33]" strokeWidth={1.5} />
                  <span className="font-medium">{x.recipient}</span>
                  <span className="text-sm text-paper/55">{x.sendTo}</span>
                  <span className="font-mono text-xs text-paper/70">{x.code}</span>
                  <Btn size="sm" tone="gold" className="ml-auto" onClick={() => act(markGiftDelivered(x.reference))}>
                    <Send className="size-3.5" /> {t.gift.markDelivered}
                  </Btn>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      <div className="mb-4 mt-6 flex flex-wrap items-center gap-3 md:mt-8">
        <Segmented
          label={t.gift.payment}
          value={filter}
          onChange={setFilter}
          options={[
            { id: 'all', label: t.common.all },
            { id: 'pending', label: t.gift.paymentStatus.pending },
            { id: 'paid', label: t.gift.paymentStatus.paid },
            { id: 'cancelled', label: t.gift.paymentStatus.cancelled },
          ]}
        />
      </div>

      {list.length === 0 ? (
        <Empty>{t.appts.empty}</Empty>
      ) : (
        <Card pad={false}>
          <ul className="divide-y divide-paper/[0.05]">
            {list.map((x) => {
              const Icon = channelIcon[x.deliveryMethod]
              return (
                <li key={x.reference}>
                  <button type="button" onClick={() => { setOpenRef(x.reference); setAmount('') }} className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-4 text-left transition-colors hover:bg-white/80 md:grid-cols-[110px_1.3fr_1fr_90px_90px_1.4fr] md:px-6">
                    <span className="font-mono text-xs text-paper/60">{x.reference}</span>
                    <span className="min-w-0 md:order-none">
                      <span className="block truncate font-medium">{x.recipient}</span>
                      <span className="flex items-center gap-1.5 truncate text-xs text-paper/50">
                        <Icon className="size-3" strokeWidth={1.5} /> {x.sendTo}
                      </span>
                    </span>
                    <span className="hidden text-sm text-paper/60 md:block">
                      {t.gift.method[x.paymentMethod]}
                      <span className="block text-xs text-paper/40">{fmt.date(new Date(x.createdAt), { day: 'numeric', month: 'short' })}</span>
                    </span>
                    <span className="text-right font-semibold tabular-nums md:text-left">{money(x.amount)}</span>
                    <span className="hidden tabular-nums text-paper/70 md:block">{x.payment === 'paid' ? money(x.balance) : '—'}</span>
                    <span className="col-span-2 md:col-span-1">
                      {status(x)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      <Sheet open={!!g} onClose={() => setOpenRef(null)} title={g ? `${t.gift.reference} ${g.reference}` : ''}>
        {g && (
          <div className="space-y-6">
            {/* the card itself */}
            <div className="relative aspect-[1.586] overflow-hidden rounded-2xl bg-[linear-gradient(125deg,#f4f4f2_0%,#bcbcb9_22%,#eeeeec_42%,#9d9d9a_63%,#d9d9d6_82%,#8f8f8c_100%)] p-5 text-[#1f1e1c]">
              <div className="flex justify-between">
                <span className="text-lg font-black tracking-tight [font-stretch:125%]">NØIR</span>
                <span className="label text-[#1f1e1c]/60">{g.payment === 'paid' ? t.gift.cardActive : t.gift.cardInactive}</span>
              </div>
              <div className="absolute bottom-5 left-5 right-5">
                <div className="label text-[#1f1e1c]/55">{g.recipient}</div>
                <div className="text-4xl font-light tabular-nums">{money(g.amount)}</div>
                <div className="mt-1 font-mono text-sm">{g.code}</div>
              </div>
              {g.payment !== 'paid' && <div className="absolute inset-0 bg-ink/35 backdrop-grayscale" aria-hidden />}
            </div>
            {status(g)}
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="label text-paper/45">{t.gift.sender}</dt>
                <dd className="mt-1">{g.sender}</dd>
              </div>
              <div>
                <dt className="label text-paper/45">{t.gift.sendTo}</dt>
                <dd className="mt-1 break-words">
                  {t.gift.channel[g.deliveryMethod]} · {g.sendTo}
                </dd>
              </div>
              <div>
                <dt className="label text-paper/45">{t.gift.payment}</dt>
                <dd className="mt-1">{t.gift.method[g.paymentMethod]}</dd>
              </div>
              <div>
                <dt className="label text-paper/45">{t.gift.balance}</dt>
                <dd className="mt-1 tabular-nums">{g.payment === 'paid' ? money(g.balance) : '—'}</dd>
              </div>
            </dl>
            {g.redemptions.length > 0 && (
              <div>
                <div className="label mb-2 text-paper/45">{t.gift.redemptions}</div>
                <ul className="divide-y divide-paper/[0.06] text-sm">
                  {g.redemptions.map((r, i) => (
                    <li key={i} className="flex justify-between py-2">
                      <span className="text-paper/60">{fmt.date(new Date(r.at), { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span className="tabular-nums">−{money(r.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-3 border-t border-paper/[0.06] pt-6">
              {g.payment === 'pending' && (
                <>
                  <Btn tone="gold" size="lg" className="w-full" onClick={() => act(confirmGiftPayment(g.reference))}>
                    {t.gift.confirmPayment}
                  </Btn>
                  <Btn tone="danger" className="w-full" onClick={() => act(cancelGift(g.reference))}>
                    {t.gift.cancel}
                  </Btn>
                </>
              )}
              {g.payment === 'paid' && g.delivery !== 'delivered' && (
                <Btn className="w-full" onClick={() => act(markGiftDelivered(g.reference))}>
                  <Send className="size-4" /> {t.gift.markDelivered}
                </Btn>
              )}
              {g.payment === 'paid' && g.balance > 0 ? (
                <form
                  className="flex items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (act(redeemGift(g.reference, Number(amount)))) setAmount('')
                  }}
                >
                  <label className="flex-1">
                    <span className="label text-paper/45">{t.gift.redeemAmount}</span>
                    <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} placeholder={String(Math.min(45, g.balance))} className={inputCls} />
                  </label>
                  <Btn type="submit" size="lg" className="h-[46px]">
                    {t.gift.redeem}
                  </Btn>
                </form>
              ) : (
                g.payment !== 'paid' && <p className="text-center text-xs text-paper/45">{t.gift.notRedeemable}</p>
              )}
            </div>
          </div>
        )}
      </Sheet>
    </>
  )
}
