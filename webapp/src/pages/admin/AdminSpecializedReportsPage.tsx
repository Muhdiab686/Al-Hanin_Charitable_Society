import { useEffect, useState } from 'react'
import { DonutChartCard } from '../../components/dashboard/DonutChartCard'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import type { FinanceSummaryResponse } from '../../api/services'
import { DoctorMedicalPage } from '../doctor/DoctorMedicalPage'

type Tab = 'finance' | 'medical' | 'warehouse'

/** تقارير مالية وطبية ومخزنية في واجهة واحدة بتبويبات. */
export function AdminSpecializedReportsPage() {
  const [tab, setTab] = useState<Tab>('finance')
  const [finance, setFinance] = useState<FinanceSummaryResponse | null>(null)
  const [invItems, setInvItems] = useState<Record<string, unknown>[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [f, inv] = await Promise.all([api.fetchFinanceSummary(), api.fetchInventoryItems({ page: 1 })])
        if (!cancelled) {
          setFinance(f)
          setInvItems((inv.data as Record<string, unknown>[]) ?? [])
        }
      } catch (e) {
        if (!cancelled) {
          setErr(extractErrorMessage(e, 'تعذّر تحميل أحد مصادر التقرير'))
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const invByStatus = invItems.reduce<Record<string, number>>((acc, row) => {
    const s = String(row.status ?? 'غير محدد')
    acc[s] = (acc[s] ?? 0) + 1

    return acc
  }, {})

  const invChart = Object.entries(invByStatus).map(([label, value]) => ({ label, value }))

  const tabs: { id: Tab; label: string }[] = [
    { id: 'finance', label: 'تقرير مالي' },
    { id: 'medical', label: 'تقرير طبي' },
    { id: 'warehouse', label: 'تقرير مخزني' },
  ]

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold text-white">التقارير المالية والطبية والمخزنية</h2>
        <p className="mt-1 text-sm text-white/60">اختر المجال لعرض البيانات الحية من النظام.</p>
      </header>

      {err ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-50">{err}</div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              tab === t.id ? 'bg-white/20 text-white shadow-inner' : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'finance' && finance ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/55">وارد</p>
              <p className="mt-1 text-xl font-bold text-emerald-200">{finance.totals.income}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/55">صادر</p>
              <p className="mt-1 text-xl font-bold text-rose-200">{finance.totals.expenses}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/55">صافي</p>
              <p className="mt-1 text-xl font-bold text-sky-200">{finance.totals.net}</p>
            </div>
          </div>
          <p className="text-xs text-white/50">آخر {Math.min(20, finance.transactions.length)} حركة في السجل.</p>
        </div>
      ) : null}

      {tab === 'medical' ? (
        <div className="space-y-3">
          <p className="text-sm text-white/65">
            يوفّر النظام سجلات الفحص المرتبطة بالمواعيد المعتمدة. يمكن المتابعة المركزية قبل اعتماد صرف الوصفات.
          </p>
          <DoctorMedicalPage />
        </div>
      ) : null}

      {tab === 'warehouse' ? (
        <div className="space-y-4">
          <p className="text-sm text-white/65">توزيع بنود المخزون وفق الحالة المعتمدة في النظام (عيّنة من الصفحة الأولى).</p>
          {invChart.length > 0 ? (
            <DonutChartCard title="عدد بنود كل حالة مخزنية" items={invChart} />
          ) : (
            <p className="text-white/55">لا تتوفر بنود مخزنية في الصفحة الحالية من البيانات.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
