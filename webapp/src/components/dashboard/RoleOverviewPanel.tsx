import { useEffect, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import type { RoleOverviewPayload } from '../../types/overview'
import { BarChartCard } from './BarChartCard'

function WidgetGrid({ widgets }: { widgets: RoleOverviewPayload['widgets'] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {widgets.map((w) => (
        <div
          key={w.key}
          className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.02] p-4 shadow-inner"
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/50">{w.label}</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-white">{w.value}</p>
        </div>
      ))}
    </div>
  )
}

export function RoleOverviewPanel() {
  const [data, setData] = useState<RoleOverviewPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const d = await api.fetchRoleOverview()
        if (!cancelled) {
          setData(d)
        }
      } catch (e) {
        if (!cancelled) {
          setError(extractErrorMessage(e, 'تعذّر تحميل الإحصائيات'))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-50">
        {error}
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur">
        <h2 className="text-lg font-bold text-white">{data.title}</h2>
        {data.notice ? (
          <p className="mt-2 text-sm leading-relaxed text-amber-100/90">{data.notice}</p>
        ) : (
          <p className="mt-1 text-xs text-white/55">مؤشرات محدّثة من بيانات الجمعية</p>
        )}
      </div>

      {data.widgets.length > 0 ? <WidgetGrid widgets={data.widgets} /> : null}

      {data.charts.length > 0 ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {data.charts.map((c) => (
            <BarChartCard key={c.id} title={c.title} items={c.items} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
