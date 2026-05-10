import { useId, useState } from 'react'
import type { ChartDatum } from './chartTypes'

/** Line + filled area chart for chronological or ordered series (no extra deps). */
export function LineAreaChartCard({
  title,
  description,
  interactionHint,
  items,
  accentClass = '#a78bfa',
}: {
  title: string
  description?: string
  /** يُعرَض داخل التلميح عند المرور أو التحريك فوق نقطة */
  interactionHint?: string
  items: ChartDatum[]
  /** Stroke/fill tint (SVG accepts CSS color). */
  accentClass?: string
}) {
  const svgFillId = `lineAreaFill_${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const [tip, setTip] = useState<{
    label: string
    value: number
    px: number
    py: number
  } | null>(null)
  const values = items.map((i) => Number(i.value) || 0)
  const maxV = Math.max(1, ...values)
  const sumV = values.reduce((a, b) => a + b, 0)
  const peakIdx = values.length ? values.indexOf(Math.max(...values)) : -1
  const peakLabel = peakIdx >= 0 ? items[peakIdx]?.label : undefined
  const peakVal = peakIdx >= 0 ? values[peakIdx] : 0
  const w = 320
  const h = 128
  const pad = { t: 10, r: 8, b: 28, l: 10 }
  const iw = w - pad.l - pad.r
  const ih = h - pad.t - pad.b
  const n = items.length

  const pts = items.map((item, i) => {
    const x = pad.l + (n <= 1 ? iw / 2 : (i / Math.max(1, n - 1)) * iw)
    const v = Number(item.value) || 0
    const y = pad.t + ih - (v / maxV) * ih
    return { x, y, label: item.label, value: v }
  })

  const linePath =
    pts.length === 0
      ? ''
      : pts.reduce((acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '')
  const areaPath =
    pts.length === 0
      ? ''
      : (() => {
          const baseline = pad.t + ih
          const first = pts[0]
          const last = pts[pts.length - 1]
          if (!first || !last) {
            return ''
          }
          return `${linePath} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`
        })()

  const summary =
    items.length === 0
      ? 'لا توجد نقاط.'
      : `سلسلة لعدد ${items.length} فترات، أقصى قيمة ${maxV}.`

  const hintDefault =
    interactionHint ??
    `الارتفاع على الشكل مقيَّس وفق أعلى قيمة في السنة (${maxV}). القيم بالوحدات كما هي في السجلات.`

  return (
    <section className="rounded-2xl border border-violet-400/35 bg-gradient-to-br from-violet-500/[0.14] via-white/[0.04] to-indigo-950/20 p-5 shadow-[inset_0_1px_0_rgba(167,139,250,0.2)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          {description ? (
            <p className="mt-2 text-[11px] leading-relaxed text-white/52">{description}</p>
          ) : null}
          {items.length > 0 ? (
            <p className="mt-1.5 text-[10px] text-white/42">مرّر فوق نقطة في المنحنى لمشاهدة التوضيح والقيمة؛ يتحرك الصندوق مع المؤشر.</p>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="mt-8 text-center text-sm text-white/50">لا بيانات لعرض المخطّط.</p>
      ) : (
        <>
          <div className="relative mt-4 overflow-x-auto">
            {tip ? (
              <div
                role="tooltip"
                style={{
                  position: 'fixed',
                  left: Math.min(
                    (typeof window !== 'undefined' ? window.innerWidth : 1200) - 272,
                    Math.max(8, tip.px + 14),
                  ),
                  top: Math.max(8, tip.py + 14),
                }}
                className="pointer-events-none z-[60] max-w-[16rem] rounded-xl border border-white/14 bg-[#0d1525]/96 px-3 py-2.5 text-[11px] leading-relaxed text-white/95 shadow-xl ring-1 ring-violet-500/15 backdrop-blur-md"
              >
                <p className="font-semibold text-white">{tip.label}</p>
                <p className="mt-1 tabular-nums text-emerald-200/95">
                  القيمة: <span>{new Intl.NumberFormat('ar-IQ').format(tip.value)}</span> وحدة
                </p>
                <p className="mt-2 border-t border-white/[0.08] pt-2 text-[10px] text-white/55">{hintDefault}</p>
              </div>
            ) : null}
            <svg
              width={w}
              height={h}
              className="max-w-full overflow-visible"
              role="img"
              aria-label={summary}
              viewBox={`0 0 ${w} ${h}`}
            >
              <title>{summary}</title>
              <defs>
                <linearGradient id={svgFillId} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={accentClass} stopOpacity="0.45" />
                  <stop offset="100%" stopColor={accentClass} stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <rect x={pad.l} y={pad.t} width={iw} height={ih} rx={6} fill="rgb(0 0 0 / 0.25)" stroke="rgb(255 255 255 / 0.08)" strokeWidth={1} />
              {areaPath ? <path d={areaPath} fill={`url(#${svgFillId})`} opacity={0.9} /> : null}
              {linePath ? (
                <path
                  d={linePath}
                  fill="none"
                  stroke={accentClass}
                  strokeWidth={2.25}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="drop-shadow-[0_0_6px_rgba(167,139,250,0.45)]"
                />
              ) : null}
              {pts.map((p) => (
                <g key={p.label + p.x}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={14}
                    fill="transparent"
                    className="cursor-crosshair"
                    onMouseEnter={(e) => {
                      setTip({ label: p.label, value: p.value, px: e.clientX, py: e.clientY })
                    }}
                    onMouseMove={(e) => {
                      setTip((prev) =>
                        prev && prev.label === p.label && prev.value === p.value
                          ? { ...prev, px: e.clientX, py: e.clientY }
                          : { label: p.label, value: p.value, px: e.clientX, py: e.clientY },
                      )
                    }}
                    onMouseLeave={() => {
                      setTip(null)
                    }}
                  />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={3.25}
                    fill="#0f172a"
                    stroke={accentClass}
                    strokeWidth={1.75}
                    pointerEvents="none"
                  />
                </g>
              ))}
            </svg>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-white/60 sm:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
            {items.slice(0, 12).map((item) => (
              <li key={item.label} className="truncate">
                <span className="text-white/85">{item.label}</span>{' '}
                <span className="tabular-nums text-emerald-200/80">{Number(item.value) || 0}</span>
              </li>
            ))}
          </ul>
          {items.length > 0 ? (
            <p className="mt-3 rounded-lg bg-black/25 px-3 py-2 text-[11px] leading-relaxed text-white/58 ring-1 ring-white/[0.06]">
              <span className="text-white/72">ملخّص القيم الفعلية المعروضة:</span> مجموع الوحدات خلال الأشهر المعروضة{' '}
              <span className="tabular-nums text-emerald-200/90">{sumV}</span>
              {peakLabel !== undefined ? (
                <>
                  {' '}
                  — أعلى شهر: <span className="text-white/80">{peakLabel}</span> بقيمة{' '}
                  <span className="tabular-nums text-violet-200/90">{peakVal}</span>
                </>
              ) : null}
              . المخطّط يُقيس الارتفاع نسبةً لأعلى قيمة في السلسلة ({maxV}) ليظهر الفرق بين الأشهر بوضوح.
            </p>
          ) : null}
        </>
      )}
    </section>
  )
}
