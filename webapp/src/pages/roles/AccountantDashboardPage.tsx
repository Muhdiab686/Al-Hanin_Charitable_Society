import { useEffect, useState } from 'react'
import { RoleOverviewPanel } from '../../components/dashboard/RoleOverviewPanel'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import type { FinanceSummaryResponse } from '../../api/services'

export function AccountantDashboardPage() {
  const [finance, setFinance] = useState<FinanceSummaryResponse | null>(null)
  const [errF, setErrF] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const f = await api.fetchFinanceSummary()
        if (!cancelled) {
          setFinance(f)
        }
      } catch (e) {
        if (!cancelled) {
          setErrF(extractErrorMessage(e, 'تعذّر تحميل الملخص المالي التفصيلي'))
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

  return (
    <div className="space-y-10">
      <RoleOverviewPanel />
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <h2 className="text-lg font-semibold text-white">آخر المعاملات المالية</h2>
        <p className="mt-1 text-xs text-white/55">قائمة مفصّلة للمراجعات اليومية</p>
        {loading ? (
          <div className="mt-6 flex justify-center py-10">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
          </div>
        ) : errF ? (
          <p className="mt-4 text-sm text-amber-100">{errF}</p>
        ) : finance ? (
          <div className="mt-4 space-y-3">
            {finance.transactions.slice(0, 12).map((tUnknown) => {
              const t = tUnknown as Record<string, unknown>

              return (
                <div
                  key={String(t.id)}
                  className="flex flex-wrap justify-between gap-2 rounded-xl border border-white/5 bg-black/25 px-3 py-2 text-xs text-white/80"
                >
                  <span className="font-mono text-white/95">{String(t.type)}</span>
                  <span className="tabular-nums text-emerald-200/90">{String(t.amount ?? '')}</span>
                  <span className="text-[11px] text-white/55">{String(t.recorded_at ?? '')}</span>
                </div>
              )
            })}
          </div>
        ) : null}
      </section>
    </div>
  )
}
