import type { ChartDatum } from './chartTypes'

/** Visual family for bar charts: clearer distinction between time series, breakdowns, and channel split. */
export type BarChartVariant = 'temporal' | 'distribution' | 'channels' | 'default'

const VARIANT_META: Record<
  BarChartVariant,
  { badge: string; cardClass: string; trackClass: string; caption: string }
> = {
  temporal: {
    badge: 'زمني',
    caption: 'مقارنة عبر فترات متتابعة',
    cardClass:
      'border-violet-400/35 bg-gradient-to-br from-violet-500/[0.14] via-white/[0.04] to-indigo-950/20 shadow-[inset_0_1px_0_rgba(167,139,250,0.2)]',
    trackClass: 'bg-violet-950/45 ring-violet-500/25',
  },
  distribution: {
    badge: 'توزيع',
    caption: 'تفكيك حسب الفئات أو المجالات',
    cardClass:
      'border-cyan-400/35 bg-gradient-to-br from-cyan-500/[0.12] via-white/[0.04] to-slate-900/25 shadow-[inset_0_1px_0_rgba(34,211,238,0.18)]',
    trackClass: 'bg-cyan-950/40 ring-cyan-500/20',
  },
  channels: {
    badge: 'قنوات',
    caption: 'مقارنة بين مسارات التسجيل أو المصادر',
    cardClass:
      'border-rose-400/33 bg-gradient-to-br from-rose-500/[0.13] via-white/[0.04] to-orange-950/15 shadow-[inset_0_1px_0_rgba(251,113,133,0.18)]',
    trackClass: 'bg-rose-950/35 ring-rose-400/22',
  },
  default: {
    badge: '',
    caption: '',
    cardClass: 'border-white/10 bg-white/5 shadow-inner',
    trackClass: 'bg-black/35 ring-white/10',
  },
}

export function BarChartCard({
  title,
  items,
  barClass = 'bg-gradient-to-l from-violet-400/90 to-indigo-400/70',
  variant = 'default',
}: {
  title: string
  items: ChartDatum[]
  barClass?: string
  variant?: BarChartVariant
}) {
  const max = Math.max(1, ...items.map((i) => Number(i.value) || 0))
  const meta = VARIANT_META[variant]

  return (
    <section
      className={`rounded-2xl border p-5 backdrop-blur transition-[box-shadow] duration-300 ${meta.cardClass}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {variant !== 'default' ? (
          <div className="flex flex-col items-end gap-0.5 text-end">
            <span
              className="rounded-full bg-black/35 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/85 ring-1 ring-white/12"
              title={meta.caption}
            >
              {meta.badge}
            </span>
            <span className="max-w-[14rem] text-[10px] leading-tight text-white/45">{meta.caption}</span>
          </div>
        ) : null}
      </div>
      <div className="mt-4 space-y-3" role="list">
        {items.map((item) => {
          const pct = Math.min(100, Math.round((Number(item.value) / max) * 100))

          return (
            <div key={item.label} role="listitem">
              <div className="mb-1 flex justify-between gap-2 text-xs text-white/80">
                <span>{item.label}</span>
                <span className="font-mono text-emerald-200/90 tabular-nums">{item.value}</span>
              </div>
              <div className={`h-2.5 overflow-hidden rounded-full ring-1 ${meta.trackClass}`}>
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${barClass}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
