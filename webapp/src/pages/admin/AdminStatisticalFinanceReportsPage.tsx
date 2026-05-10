import { useEffect, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import type { FinanceSummaryResponse } from '../../api/services'
import { AdminDashboardPage } from './AdminDashboardPage'

/** تقارير إحصائية ومالية: مؤشرات التشغيل مع ملخص دفتر المعاملات. */
export function AdminStatisticalFinanceReportsPage() {
  const [finance, setFinance] = useState<FinanceSummaryResponse | null>(null)
  const [err, setErr] = useState<string | null>(null)

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
          setErr(extractErrorMessage(e, 'تعذّر تحميل الملخص المالي'))
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-10">
      <header>
        <h2 className="text-xl font-bold text-white">التقارير الإحصائية والمالية</h2>
        <p className="mt-1 text-sm text-white/60">تجميع مؤشرات التشغيل مع أرقام الخزينة والمعاملات الأخيرة.</p>
      </header>

      {err ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-50">{err}</div>
      ) : null}

      {finance ? (
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-white/55">الواردات المسجّلة</p>
            <p className="mt-1 text-2xl font-bold text-emerald-200">{finance.totals.income}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-white/55">المصروفات</p>
            <p className="mt-1 text-2xl font-bold text-rose-200">{finance.totals.expenses}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-white/55">الصافي</p>
            <p className="mt-1 text-2xl font-bold text-indigo-200">{finance.totals.net}</p>
          </div>
        </section>
      ) : null}

      <AdminDashboardPage />
    </div>
  )
}
