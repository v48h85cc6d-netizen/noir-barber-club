import { useMemo, useState } from 'react'
import { Mail, Phone, Search } from 'lucide-react'
import { useStore } from '../data/store'
import type { Client } from '../data/types'
import { endOf, hhmm } from '../data/select'
import { useAdminT } from '../i18n'
import { Avatar, Card, Empty, PageHeader, Sheet, StatusPill, Tag } from '../ui'

/** Client list. Owners see everyone; barbers only receive their own clients (limited fields). */
export function Clients({ compact = false }: { compact?: boolean }) {
  const { t, fmt, pub, money } = useAdminT()
  const { data, session } = useStore()
  const isOwner = session.role === 'owner'
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<Client | null>(null)
  const now = Date.now()

  const rows = useMemo(() => {
    const by = new Map<string, { visits: number; spent: number; last?: string; next?: string }>()
    for (const a of data.appointments) {
      const r = by.get(a.clientId) ?? { visits: 0, spent: 0 }
      if (a.status === 'completed') {
        r.visits++
        r.spent += a.price
        if (!r.last || a.start > r.last) r.last = a.start
      }
      if (endOf(a).getTime() > now && a.status !== 'cancelled' && (!r.next || a.start < r.next)) r.next = a.start
      by.set(a.clientId, r)
    }
    const needle = q.trim().toLowerCase()
    return data.clients
      .filter((c) => !needle || c.name.toLowerCase().includes(needle) || c.phone.replace(/\s/g, '').includes(needle.replace(/\s/g, '')))
      .map((c) => ({ c, ...(by.get(c.id) ?? { visits: 0, spent: 0 }) }))
      .sort((a, b) => (b.last ?? '').localeCompare(a.last ?? ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, q])

  const barberName = (id: string) => data.barbers.find((b) => b.id === id)?.name.split(' ')[0] ?? '—'
  const history = open ? data.appointments.filter((a) => a.clientId === open.id).sort((a, b) => b.start.localeCompare(a.start)) : []
  const tone = { member: 'gold', regular: 'info', new: 'good' } as const

  return (
    <>
      {!compact && <PageHeader title={<b>{t.clients.title}</b>} intro={isOwner ? undefined : t.clients.limited} />}
      {compact && <p className="mb-4 text-sm text-paper/55">{t.bApp.clientsNote}</p>}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-paper/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.clients.searchPh} aria-label={t.common.search} className="h-11 w-full rounded-full border border-white/10 bg-white/[0.03] pl-10 pr-4 text-sm outline-none placeholder:text-paper/35 focus:border-[#d2b07a]/60" />
        </label>
        <span className="text-sm text-paper/45">{t.clients.count(rows.length)}</span>
      </div>

      {rows.length === 0 ? (
        <Empty>{t.appts.empty}</Empty>
      ) : (
        <Card pad={false}>
          <table className="hidden w-full text-sm lg:table">
            <thead>
              <tr className="label border-b border-white/[0.06] text-left text-paper/40">
                <th className="px-5 py-3.5 font-normal">{t.clients.name}</th>
                <th className="px-3 py-3.5 font-normal">{t.clients.phone}</th>
                <th className="px-3 py-3.5 text-right font-normal">{t.clients.visits}</th>
                <th className="px-3 py-3.5 font-normal">{t.clients.lastVisit}</th>
                <th className="hidden px-3 py-3.5 font-normal xl:table-cell">{t.clients.nextVisit}</th>
                <th className="hidden px-3 py-3.5 font-normal xl:table-cell">{t.clients.preferred}</th>
                {isOwner && <th className="px-5 py-3.5 text-right font-normal">{t.clients.spent}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {rows.map(({ c, visits, spent, last, next }) => (
                <tr key={c.id} onClick={() => setOpen(c)} className="cursor-pointer hover:bg-white/[0.025]">
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-3">
                      <Avatar name={c.name} size={30} />
                      <span className="font-medium">{c.name}</span>
                      {c.tags.slice(0, 1).map((x) => (
                        <Tag key={x} tone={tone[x]}>
                          {t.clients.tags[x]}
                        </Tag>
                      ))}
                    </span>
                  </td>
                  <td className="px-3 py-3 tabular-nums text-paper/65">{c.phone}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{visits}</td>
                  <td className="px-3 py-3 text-paper/65">{last ? fmt.date(new Date(last), { day: 'numeric', month: 'short' }) : '—'}</td>
                  <td className="hidden px-3 py-3 text-paper/65 xl:table-cell">{next ? fmt.date(new Date(next), { day: 'numeric', month: 'short' }) : '—'}</td>
                  <td className="hidden px-3 py-3 text-paper/65 xl:table-cell">{barberName(c.preferredBarber)}</td>
                  {isOwner && <td className="px-5 py-3 text-right tabular-nums">{money(spent)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="divide-y divide-white/[0.05] lg:hidden">
            {rows.map(({ c, visits, last }) => (
              <li key={c.id}>
                <button type="button" onClick={() => setOpen(c)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                  <Avatar name={c.name} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{c.name}</div>
                    <div className="truncate text-xs text-paper/50">
                      {visits} {t.clients.visits.toLowerCase()} · {last ? fmt.date(new Date(last), { day: 'numeric', month: 'short' }) : '—'}
                    </div>
                  </div>
                  {c.tags[0] && <Tag tone={tone[c.tags[0]]}>{t.clients.tags[c.tags[0]]}</Tag>}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ''}>
        {open && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {open.tags.map((x) => (
                <Tag key={x} tone={tone[x]}>
                  {t.clients.tags[x]}
                </Tag>
              ))}
            </div>
            <div className="space-y-2 text-sm">
              <a href={`tel:${open.phone.replace(/\s/g, '')}`} className="flex items-center gap-2 hover:underline">
                <Phone className="size-4 text-paper/50" strokeWidth={1.5} /> {open.phone}
              </a>
              {isOwner && open.email && (
                <a href={`mailto:${open.email}`} className="flex items-center gap-2 hover:underline">
                  <Mail className="size-4 text-paper/50" strokeWidth={1.5} /> {open.email}
                </a>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="label text-paper/45">{t.clients.since}</dt>
                <dd className="mt-1">{fmt.date(new Date(open.since), { month: 'long', year: 'numeric' })}</dd>
              </div>
              <div>
                <dt className="label text-paper/45">{t.clients.preferred}</dt>
                <dd className="mt-1">{barberName(open.preferredBarber)}</dd>
              </div>
              {isOwner && (
                <div>
                  <dt className="label text-paper/45">{t.clients.marketing}</dt>
                  <dd className="mt-1">{open.marketing ? t.common.yes : t.common.no}</dd>
                </div>
              )}
            </dl>
            {open.notes && (
              <div className="rounded-xl border border-[#d2b07a]/25 bg-[#d2b07a]/[0.06] p-3 text-sm">
                <span className="label mr-2 text-[#d2b07a]">{t.clients.notes}</span>
                {open.notes}
              </div>
            )}
            <div>
              <div className="label mb-2 text-paper/45">{t.clients.history}</div>
              <ul className="divide-y divide-white/[0.06]">
                {history.slice(0, 12).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span>
                      <span className="block">{pub.services.items[a.serviceId].name}</span>
                      <span className="text-xs text-paper/45">
                        {fmt.date(new Date(a.start), { day: 'numeric', month: 'short', year: 'numeric' })} · {hhmm(a.start)} · {barberName(a.barberId)}
                      </span>
                    </span>
                    <StatusPill status={a.status} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Sheet>
    </>
  )
}
