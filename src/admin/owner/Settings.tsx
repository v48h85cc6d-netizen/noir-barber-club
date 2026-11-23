import { useState } from 'react'
import { Database, RotateCcw, ShieldCheck } from 'lucide-react'
import { LanguageSegmented } from '../../components/LanguageSwitcher'
import { site } from '../../data/site'
import { useStore } from '../data/store'
import type { Settings as S } from '../data/types'
import { useAdminT } from '../i18n'
import { Btn, Card, Field, PageHeader, Switch, Tag, inputCls, useAct } from '../ui'

type Level = 'full' | 'own' | 'status' | 'read' | 'none'
const MATRIX: [keyof ReturnType<typeof useAdminT>['t']['settings']['perm'], Level, Level][] = [
  ['appointments', 'full', 'status'],
  ['clients', 'full', 'own'],
  ['schedules', 'full', 'read'],
  ['services', 'full', 'read'],
  ['finance', 'full', 'none'],
  ['gift', 'full', 'none'],
  ['members', 'full', 'none'],
  ['staff', 'full', 'none'],
  ['settings', 'full', 'none'],
  ['audit', 'read', 'none'],
]

export function Settings() {
  const { t, fmt } = useAdminT()
  const { data, updateSettings, resetDemo } = useStore()
  const act = useAct()
  const [s, setS] = useState<S>(data.settings)
  const num = (k: keyof S, label: string, min: number, max: number) => (
    <Field label={label}>
      <input type="number" min={min} max={max} value={s[k] as number} onChange={(e) => setS({ ...s, [k]: Number(e.target.value) })} className={inputCls} />
    </Field>
  )
  const levelTone = { full: 'gold', own: 'info', status: 'info', read: 'neutral', none: 'bad' } as const

  return (
    <>
      <PageHeader title={<b>{t.settings.title}</b>} />
      <div className="grid gap-4 md:gap-6 xl:grid-cols-2">
        <Card title={t.settings.policy}>
          <form
            className="grid gap-5 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              act(updateSettings(s))
            }}
          >
            {num('bookingWindowDays', t.settings.window, 1, 120)}
            {num('cancellationHours', t.settings.cancellation, 0, 72)}
            {num('noShowFeePercent', t.settings.noShowFee, 0, 100)}
            {num('bufferMinutes', t.settings.buffer, 0, 30)}
            {num('reminderHours', t.settings.reminder, 1, 72)}
            <Field label={t.settings.codArea}>
              <input value={s.codArea} maxLength={40} onChange={(e) => setS({ ...s, codArea: e.target.value })} className={inputCls} />
            </Field>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-paper/[0.06] px-4 py-3 sm:col-span-2">
              <span className="text-sm">{t.settings.walkIns}</span>
              <Switch checked={s.allowWalkIns} label={t.settings.walkIns} onChange={(v) => setS({ ...s, allowWalkIns: v })} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-paper/[0.06] px-4 py-3 sm:col-span-2">
              <span className="text-sm">{t.settings.cod}</span>
              <Switch checked={s.cashOnDelivery} label={t.settings.cod} onChange={(v) => setS({ ...s, cashOnDelivery: v })} />
            </div>
            <Btn type="submit" tone="gold" className="sm:col-span-2">
              {t.common.save}
            </Btn>
          </form>
        </Card>

        <div className="space-y-4 md:space-y-6">
          <Card title={t.settings.business}>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="label text-paper/45">NOIR</dt>
                <dd className="mt-1">{site.name}</dd>
              </div>
              <div>
                <dt className="label text-paper/45">{t.clients.phone}</dt>
                <dd className="mt-1">{site.phone}</dd>
              </div>
              <div>
                <dt className="label text-paper/45">Email</dt>
                <dd className="mt-1 break-all">{site.email}</dd>
              </div>
              <div>
                <dt className="label text-paper/45">{t.clients.contact}</dt>
                <dd className="mt-1">
                  {site.address.street}, {site.address.city}
                </dd>
              </div>
            </dl>
          </Card>
          <Card title={t.settings.language}>
            <LanguageSegmented />
            <p className="mt-3 text-xs text-paper/50">{t.settings.languageNote}</p>
          </Card>
          <Card title={t.settings.connection}>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Database className="size-5 text-[#8a6a33]" strokeWidth={1.5} />
              <span className="min-w-0 flex-1 text-paper/70">{t.settings.connectionDemo}</span>
              <Tag tone="warn">{t.demo.badge}</Tag>
            </div>
          </Card>
          <Card title={t.settings.demoData}>
            <p className="text-sm text-paper/60">{t.settings.demoDataNote}</p>
            <Btn
              tone="danger"
              className="mt-4"
              onClick={() => {
                if (window.confirm(t.login.resetConfirm)) act(resetDemo(), t.login.resetDone)
              }}
            >
              <RotateCcw className="size-4" /> {t.login.resetDemo}
            </Btn>
          </Card>
        </div>
      </div>

      <Card title={t.settings.permissions} className="mt-4 md:mt-6">
        <p className="mb-4 text-sm text-paper/55">{t.settings.permissionsNote}</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="label border-b border-paper/[0.06] text-left text-paper/40">
                <th className="py-3 pr-3 font-normal" />
                <th className="px-3 py-3 font-normal">{t.common.owner}</th>
                <th className="px-3 py-3 font-normal">{t.common.barber}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper/[0.05]">
              {MATRIX.map(([k, o, b]) => (
                <tr key={k}>
                  <td className="py-3 pr-3">{t.settings.perm[k]}</td>
                  <td className="px-3 py-3">
                    <Tag tone={levelTone[o]}>{t.settings.level[o]}</Tag>
                  </td>
                  <td className="px-3 py-3">
                    <Tag tone={levelTone[b]}>{t.settings.level[b]}</Tag>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 md:mt-6 md:gap-6 xl:grid-cols-[1fr_1.4fr]">
        <Card title={t.settings.security}>
          <ul className="space-y-3 text-sm">
            {t.settings.securityItems.map((x) => (
              <li key={x} className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#8a6a33]" strokeWidth={1.5} />
                <span className="text-paper/75">{x}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title={t.settings.audit}>
          <p className="mb-4 text-xs text-paper/50">{t.settings.auditNote}</p>
          <ul className="max-h-[360px] divide-y divide-paper/[0.05] overflow-y-auto">
            {data.audit.map((e) => (
              <li key={e.id} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 py-3 text-sm sm:grid-cols-[150px_1fr_auto]">
                <span className="text-paper/50 tabular-nums">{fmt.date(new Date(e.at), { day: 'numeric', month: 'short' })} · {new Date(e.at).toTimeString().slice(0, 5)}</span>
                <span className="col-span-2 font-mono text-xs text-paper/85 sm:col-span-1">
                  {e.action} <span className="text-paper/45">· {e.target}</span>
                </span>
                <span className="row-start-1 text-right text-xs text-paper/60 sm:row-start-auto">
                  {e.actor} <span className="text-paper/35">({e.role === 'owner' ? t.common.owner : e.role === 'customer' ? t.common.customer : t.common.barber})</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
