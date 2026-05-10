import { useState } from 'react'
import type { ChartDatum } from './chartTypes'

function polar(cx: number, cy: number, r: number, angleRad: number) {
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) }
}

/** Single SVG path for annulus slice from startRad to endRad (radians). */
function donutSlicePath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startRad: number,
  endRad: number,
): string {
  const largeArc = endRad - startRad > Math.PI ? 1 : 0
  const o1 = polar(cx, cy, rOuter, endRad)
  const o2 = polar(cx, cy, rOuter, startRad)
  const i2 = polar(cx, cy, rInner, startRad)
  const i1 = polar(cx, cy, rInner, endRad)

  return [
    'M',
    o2.x,
    o2.y,
    'A',
    rOuter,
    rOuter,
    0,
    largeArc,
    1,
    o1.x,
    o1.y,
    'L',
    i1.x,
    i1.y,
    'A',
    rInner,
    rInner,
    0,
    largeArc,
    0,
    i2.x,
    i2.y,
    'Z',
  ].join(' ')
}

const DEFAULT_SLICE_COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#2dd4bf', '#94a3b8']

/** Donut composition chart for parts-of-whole ratios. */
export function DonutChartCard({
  title,
  description,
  interactionHint,
  items,
}: {
  title: string
  /** يوضح وحدة القياس ومصدر البيانات أسفل العنوان */
  description?: string
  /** نص يُظهر في التلميح عند المرور على قطاع */
  interactionHint?: string
  items: ChartDatum[]
}) {
  const [tip, setTip] = useState<{
    label: string
    value: number
    pct: number
    px: number
    py: number
  } | null>(null)

  const activeItems = items.filter((i) => (Number(i.value) || 0) > 0)
  const rawTotal = activeItems.reduce((s, i) => s + (Number(i.value) || 0), 0)
  const denom = rawTotal <= 0 ? 1 : rawTotal

  let angle = -Math.PI / 2
  const cx = 50
  const cy = 50
  const rOuter = 38
  const rInner = 22

  const slices =
    activeItems.length === 0
      ? []
      : activeItems.map((item, idx) => {
          const raw = Number(item.value) || 0
          const sweep = raw <= 0 ? 0 : (raw / denom) * Math.PI * 2
          const start = angle
          const end = angle + sweep
          angle = end
          const color = DEFAULT_SLICE_COLORS[idx % DEFAULT_SLICE_COLORS.length] ?? '#94a3b8'

          return {
            key: `${item.label}-${idx}`,
            label: item.label,
            value: raw,
            pct: rawTotal > 0 ? Math.round((raw / rawTotal) * 1000) / 10 : 0,
            color,
            d: sweep <= 0.001 ? '' : donutSlicePath(cx, cy, rOuter, rInner, start, end),
          }
        })

  const summary =
    activeItems.length === 0 ? 'لا قطاعات ذات قيمة موجبة.' : `مخطط قطاعات؛ المجموع ${rawTotal} (وحدات العدّ).`

  const sliceHintDefault =
    interactionHint ??
    'النسبة المئوية من مجموع هذا المخطّط فقط؛ مرّر على قطاع آخر أو على الصف في القائمة لمقارنة المساهمة.'

  return (
    <section className="rounded-2xl border border-cyan-400/35 bg-gradient-to-br from-cyan-500/[0.12] via-white/[0.04] to-slate-900/25 p-5 shadow-[inset_0_1px_0_rgba(34,211,238,0.18)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          {description ? (
            <p className="mt-2 text-[11px] leading-relaxed text-white/52">{description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5 text-end">
          <span className="rounded-full bg-black/35 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/85 ring-1 ring-white/12">
            دائرة قطاعية
          </span>
          <span className="max-w-[13rem] text-[10px] leading-tight text-white/45">مرّر للتلميح التوضيحي</span>
        </div>
      </div>

      {activeItems.length === 0 ? (
        <p className="mt-8 text-center text-sm text-white/50">
          {items.length > 0
            ? 'القيم المسجّلة كلها صفر حالياً — ستظهر القطاعات عند وجود أعداد فعلية.'
            : 'لا بيانات لعرض النسب.'}
        </p>
      ) : (
        <div className="relative mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:justify-between">
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
              className="pointer-events-none z-[60] max-w-[16rem] rounded-xl border border-white/14 bg-[#0d1525]/96 px-3 py-2.5 text-[11px] leading-relaxed text-white/95 shadow-xl ring-1 ring-cyan-500/18 backdrop-blur-md"
            >
              <p className="font-semibold text-white">{tip.label}</p>
              <p className="mt-1 tabular-nums text-emerald-200/95">
                العدد: <span>{new Intl.NumberFormat('ar-IQ').format(tip.value)}</span> — نسبة من المجموع:{' '}
                <span>{new Intl.NumberFormat('ar-IQ', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(tip.pct)}%</span>
              </p>
              <p className="mt-2 border-t border-white/[0.08] pt-2 text-[10px] text-white/55">{sliceHintDefault}</p>
            </div>
          ) : null}
          <div className="relative shrink-0">
            <svg width={160} height={160} viewBox="0 0 100 100" className="-rotate-90" role="img" aria-label={summary}>
              <title>{summary}</title>
              {rawTotal <= 0 ? (
                <>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={rOuter}
                    fill="rgb(255 255 255 / 0.06)"
                    stroke="rgb(255 255 255 / 0.12)"
                    strokeWidth={0.75}
                  />
                  <circle cx={cx} cy={cy} r={rInner} fill="#070b14" />
                </>
              ) : (
                slices.map((s) =>
                  s.d ? (
                    <path
                      key={s.key}
                      d={s.d}
                      fill={s.color}
                      stroke="#0f172a"
                      strokeWidth={0.5}
                      opacity={0.95}
                      className="cursor-crosshair"
                      onMouseEnter={(e) => {
                        setTip({
                          label: s.label,
                          value: s.value,
                          pct: s.pct,
                          px: e.clientX,
                          py: e.clientY,
                        })
                      }}
                      onMouseMove={(e) => {
                        setTip((prev) =>
                          prev?.label === s.label
                            ? { ...prev, px: e.clientX, py: e.clientY }
                            : {
                                label: s.label,
                                value: s.value,
                                pct: s.pct,
                                px: e.clientX,
                                py: e.clientY,
                              },
                        )
                      }}
                      onMouseLeave={() => {
                        setTip(null)
                      }}
                    />
                  ) : null,
                )
              )}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex rotate-0 flex-col items-center justify-center">
              <p className="text-[11px] font-medium text-white/50">المجموع</p>
              <p className="text-lg font-bold tabular-nums text-white">{rawTotal}</p>
            </div>
          </div>

          <ul className="w-full min-w-0 flex-1 space-y-2.5">
            {slices.map((s) => (
              <li key={s.key} className="flex items-center justify-between gap-3 text-xs">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 cursor-default items-center gap-2 rounded-lg text-start transition hover:bg-white/[0.06] focus-visible:outline focus-visible:ring-2 focus-visible:ring-cyan-400/40"
                  onMouseEnter={(e) => {
                    setTip({
                      label: s.label,
                      value: s.value,
                      pct: s.pct,
                      px: e.clientX,
                      py: e.clientY,
                    })
                  }}
                  onMouseMove={(e) => {
                    setTip((prev) =>
                      prev?.label === s.label
                        ? { ...prev, px: e.clientX, py: e.clientY }
                        : { label: s.label, value: s.value, pct: s.pct, px: e.clientX, py: e.clientY },
                    )
                  }}
                  onMouseLeave={() => {
                    setTip(null)
                  }}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm ring-1 ring-white/25" style={{ backgroundColor: s.color }} />
                  <span className="truncate text-white/85">{s.label}</span>
                </button>
                <span className="shrink-0 tabular-nums text-emerald-200/90">
                  {s.value} <span className="text-white/45">({s.pct}%)</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
