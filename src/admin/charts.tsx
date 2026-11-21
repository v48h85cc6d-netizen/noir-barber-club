import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Charts for the Command Center, following the data-viz rules:
 * one axis, thin marks, recessive grid, hover tooltips, legends + labels so
 * identity is never colour-alone, and an accessible table for every chart.
 * Categorical order is fixed (validated on white and dark surfaces, CVD-safe):
 */
export const CATEGORICAL = ['#c98500', '#199e70', '#3987e5', '#d55181'] as const
/** champagne mark colour, deepened so thin lines and bars hold 3:1 on white glass */
export const ACCENT = '#a5803f'

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  // start at 0 and measure before paint, so a chart never renders wider than its card
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setW(Math.max(160, el.clientWidth))
    const ro = new ResizeObserver(([e]) => setW(Math.max(160, Math.floor(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // 160 is only a placeholder for the first render; the real width is set before paint
  return [ref, w || 160] as const
}

function SrTable({ caption, rows }: { caption: string; rows: [string, string][] }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <tbody>
        {rows.map(([a, b], i) => (
          <tr key={i}>
            <th scope="row">{a}</th>
            <td>{b}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Tip({ x, y, children, w }: { x: number; y: number; children: ReactNode; w: number }) {
  const left = Math.min(Math.max(x, 70), w - 70)
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap glass glass-strong rounded-xl px-3 py-2 text-xs text-paper"
      style={{ left, top: y - 10 }}
    >
      {children}
    </div>
  )
}

const niceMax = (v: number) => {
  if (v <= 0) return 10
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p
}

/** Single-series area over time. */
export function AreaChart({ data, format, caption, height = 220 }: { data: { label: string; short: string; value: number }[]; format: (n: number) => string; caption: string; height?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const pad = { l: 44, r: 8, t: 12, b: 26 }
  const iw = w - pad.l - pad.r
  const ih = height - pad.t - pad.b
  const max = niceMax(Math.max(...data.map((d) => d.value)) * 1.1)
  const x = (i: number) => pad.l + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw)
  const y = (v: number) => pad.t + ih - (v / max) * ih
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join('')
  const area = `${line}L${x(data.length - 1)},${pad.t + ih}L${x(0)},${pad.t + ih}Z`
  const ticks = [0, 0.5, 1].map((f) => max * f)
  const every = Math.ceil(data.length / Math.max(2, Math.floor(iw / 64)))
  return (
    <div ref={ref} className="relative min-w-0 max-w-full" onMouseLeave={() => setHover(null)}>
      <svg width={w} height={height} role="img" aria-label={caption} className="block max-w-full overflow-visible">
        <defs>
          <linearGradient id="area-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={ACCENT} stopOpacity="0.28" />
            <stop offset="1" stopColor={ACCENT} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} stroke="rgba(31,30,28,0.07)" />
            <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" className="fill-paper/40 font-mono text-[10px]">
              {format(v)}
            </text>
          </g>
        ))}
        <path d={area} fill="url(#area-fill)" />
        <path d={line} fill="none" stroke={ACCENT} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) =>
          i % every === 0 || i === data.length - 1 ? (
            <text key={i} x={x(i)} y={height - 6} textAnchor="middle" className="fill-paper/40 font-mono text-[10px]">
              {d.short}
            </text>
          ) : null,
        )}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="rgba(31,30,28,0.25)" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(data[hover].value)} r="5" fill={ACCENT} stroke="#ffffff" strokeWidth="2" />
          </g>
        )}
        {data.map((_, i) => (
          <rect
            key={i}
            x={x(i) - iw / data.length / 2}
            y={pad.t}
            width={iw / data.length}
            height={ih}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onTouchStart={() => setHover(i)}
          />
        ))}
      </svg>
      {hover !== null && (
        <Tip x={x(hover)} y={y(data[hover].value)} w={w}>
          <div className="text-paper/55">{data[hover].label}</div>
          <div className="mt-0.5 font-semibold tabular-nums">{format(data[hover].value)}</div>
        </Tip>
      )}
      <SrTable caption={caption} rows={data.map((d) => [d.label, format(d.value)])} />
    </div>
  )
}

/** Ranked horizontal bars (magnitude, one hue). */
export function BarList({ items, format, caption }: { items: { label: ReactNode; key: string; value: number; sub?: string }[]; format: (n: number) => string; caption: string }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <div>
      <ul className="space-y-3.5" aria-hidden>
        {items.map((i) => (
          <li key={i.key} className="group" title={`${typeof i.label === 'string' ? i.label : i.key}: ${format(i.value)}`}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-paper/80">{i.label}</span>
              <span className="shrink-0 tabular-nums text-paper">
                {format(i.value)}
                {i.sub && <span className="ml-2 text-xs text-paper/40">{i.sub}</span>}
              </span>
            </div>
            <div className="h-2 rounded-full bg-paper/[0.05]">
              <div
                className="h-2 rounded-full transition-[width,opacity] duration-700 ease-[var(--ease-expo)] group-hover:opacity-80"
                style={{ width: `${(i.value / max) * 100}%`, background: ACCENT }}
              />
            </div>
          </li>
        ))}
      </ul>
      <SrTable caption={caption} rows={items.map((i) => [typeof i.label === 'string' ? i.label : i.key, format(i.value)])} />
    </div>
  )
}

/** Part-to-whole in one bar with 2px gaps and a labelled legend. */
export function SegmentBar({ items, format, caption }: { items: { label: string; value: number }[]; format: (n: number) => string; caption: string }) {
  const total = items.reduce((a, b) => a + b.value, 0) || 1
  const [hover, setHover] = useState<number | null>(null)
  return (
    <div>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" aria-hidden>
        {items.map((it, i) => (
          <div
            key={it.label}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className="h-full transition-opacity"
            style={{ width: `${(it.value / total) * 100}%`, background: CATEGORICAL[i], opacity: hover === null || hover === i ? 1 : 0.4 }}
            title={`${it.label}: ${format(it.value)}`}
          />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3" aria-hidden>
        {items.map((it, i) => (
          <li key={it.label} className="flex items-start gap-2.5 text-sm" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <span className="mt-1 size-2.5 shrink-0 rounded-[3px]" style={{ background: CATEGORICAL[i] }} />
            <span>
              <span className="block text-paper/70">{it.label}</span>
              <span className="tabular-nums text-paper">
                {format(it.value)} <span className="text-xs text-paper/40">· {Math.round((it.value / total) * 100)}%</span>
              </span>
            </span>
          </li>
        ))}
      </ul>
      <SrTable caption={caption} rows={items.map((i) => [i.label, format(i.value)])} />
    </div>
  )
}

/** Columns for counts per period (single series). */
export function Columns({ data, caption, format = (n) => String(n), height = 160 }: { data: { label: string; short: string; value: number }[]; caption: string; format?: (n: number) => string; height?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const pad = { l: 8, r: 8, t: 10, b: 24 }
  const ih = height - pad.t - pad.b
  const max = niceMax(Math.max(...data.map((d) => d.value)))
  const slot = (w - pad.l - pad.r) / data.length
  const bw = Math.min(28, slot * 0.6)
  return (
    <div ref={ref} className="relative min-w-0 max-w-full" onMouseLeave={() => setHover(null)}>
      <svg width={w} height={height} role="img" aria-label={caption} className="block max-w-full">
        <line x1={pad.l} x2={w - pad.r} y1={pad.t + ih} y2={pad.t + ih} stroke="rgba(31,30,28,0.12)" />
        {data.map((d, i) => {
          const h = Math.max(2, (d.value / max) * ih)
          const x = pad.l + slot * i + (slot - bw) / 2
          const y = pad.t + ih - h
          const r = Math.min(4, bw / 2)
          return (
            <g key={i} onMouseEnter={() => setHover(i)}>
              <rect x={pad.l + slot * i} y={pad.t} width={slot} height={ih} fill="transparent" />
              <path
                d={`M${x},${pad.t + ih}V${y + r}Q${x},${y} ${x + r},${y}H${x + bw - r}Q${x + bw},${y} ${x + bw},${y + r}V${pad.t + ih}Z`}
                fill={ACCENT}
                opacity={hover === null || hover === i ? 1 : 0.45}
              />
              <text x={x + bw / 2} y={height - 6} textAnchor="middle" className="fill-paper/40 font-mono text-[10px]">
                {d.short}
              </text>
            </g>
          )
        })}
      </svg>
      {hover !== null && (
        <Tip x={pad.l + slot * hover + slot / 2} y={pad.t + ih - (data[hover].value / max) * ih} w={w}>
          <div className="text-paper/55">{data[hover].label}</div>
          <div className="mt-0.5 font-semibold tabular-nums">{format(data[hover].value)}</div>
        </Tip>
      )}
      <SrTable caption={caption} rows={data.map((d) => [d.label, format(d.value)])} />
    </div>
  )
}

/** Weekday × hour heatmap, sequential single hue (white → deep champagne). */
export function Heatmap({ rows, cols, values, caption, lowLabel, highLabel, format }: { rows: string[]; cols: string[]; values: number[][]; caption: string; lowLabel: string; highLabel: string; format: (n: number) => string }) {
  const [hover, setHover] = useState<[number, number] | null>(null)
  const color = (v: number) => (v <= 0 ? 'rgba(31,30,28,0.04)' : `color-mix(in oklab, #8a6a33 ${Math.round(10 + v * 90)}%, #ffffff)`)
  return (
    <div>
      <div className="cc-scroll overflow-x-auto pb-1">
        <div className="inline-grid min-w-full gap-[3px]" style={{ gridTemplateColumns: `2.5rem repeat(${cols.length}, minmax(22px, 1fr))` }} onMouseLeave={() => setHover(null)}>
          <span />
          {cols.map((c, i) => (
            <span key={c} className="text-center font-mono text-[10px] text-paper/40">
              {i % 2 === 0 ? c : ''}
            </span>
          ))}
          {rows.map((r, ri) => (
            <div key={r} className="contents">
              <span className="self-center font-mono text-[10px] uppercase text-paper/45">{r}</span>
              {cols.map((c, ci) => (
                <span
                  key={c}
                  onMouseEnter={() => setHover([ri, ci])}
                  title={`${r} ${c}: ${format(values[ri][ci])}`}
                  className={`h-7 rounded-[4px] transition-[outline] ${hover && hover[0] === ri && hover[1] === ci ? 'outline outline-2 outline-paper/70' : ''}`}
                  style={{ background: color(values[ri][ci]) }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-paper/50">
        <span>{hover ? `${rows[hover[0]]} · ${cols[hover[1]]} — ${format(values[hover[0]][hover[1]])}` : ' '}</span>
        <span className="flex items-center gap-2">
          {lowLabel}
          <span className="h-2 w-24 rounded-full" style={{ background: `linear-gradient(90deg, ${color(0.05)}, ${color(1)})` }} />
          {highLabel}
        </span>
      </div>
      <SrTable caption={caption} rows={rows.flatMap((r, ri) => cols.map((c, ci) => [`${r} ${c}`, format(values[ri][ci])] as [string, string]))} />
    </div>
  )
}
