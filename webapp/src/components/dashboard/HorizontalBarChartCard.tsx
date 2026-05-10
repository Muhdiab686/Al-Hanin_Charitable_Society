import type { ChartDatum } from './chartTypes'

/** Horizontal proportional bars — distinct from stacked vertical bars in BarChartCard. */
export function HorizontalBarChartCard({
  title,
  items,
  barTint = 'from-rose-400/92 to-orange-400/68',
}: {
  title: string
  items: ChartDatum[]
  /** Tailwind gradient direction classes for fills. */
  barTint?: string
}) {
  const max = Math.max(1, ...items.map((i) => Number(i.value) || 0))

  return (
    <section className="rounded-2xl border border-rose-400/33 bg-gradient-to-br from-rose-500/[0.13] via-white/[0.04] to-orange-950/15 p-5 shadow-[inset_0_1px_0_rgba(251,113,133,0.18)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <div className="flex flex-col items-end gap-0.5 text-end">
          <span className="rounded-full bg-black/35 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/85 ring-1 ring-white/12">
            أشرطة أفقية
          </span>
          <span className="max-w-[13rem] text-[10px] leading-tight text-white/45">مراجعة المساهمة النسبية لكل مسار</span>
        </div>
      </div>

      <ul className="mt-5 space-y-3.5" role="list">
        {items.map((item) => {
          const v = Number(item.value) || 0
          const pct = Math.min(100, Math.round((v / max) * 100))

          return (
            <li key={item.label} role="listitem" className="space-y-1.5">
              <div className="flex justify-between gap-3 text-xs text-white/82">
                <span className="min-w-0 shrink truncate">{item.label}</span>
                <span className="shrink-0 font-mono text-emerald-200/90 tabular-nums">{v}</span>
              </div>
              <div className="relative h-4 overflow-hidden rounded-lg bg-black/38 ring-1 ring-white/[0.08]">
                <div
                  className={`absolute inset-y-0 start-0 rounded-md bg-gradient-to-r shadow-inner ${barTint}`}
                  style={{ width: `${pct}%`, minWidth: pct > 0 ? '12px' : undefined }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
