import { useEffect, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import type { CampaignReportingResponse } from '../../api/services'
import * as api from '../../api/services'
import { BarChartCard } from '../../components/dashboard/BarChartCard'
import type { ChartDatum } from '../../components/dashboard/chartTypes'

function formatCash(n: number): string {
  return new Intl.NumberFormat('ar-IQ', {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function formatInt(n: number): string {
  return new Intl.NumberFormat('ar-IQ').format(n)
}

export function CampaignReportingPage() {
  const [data, setData] = useState<CampaignReportingResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setError(null)
      try {
        const d = await api.fetchCampaignReporting()
        if (!cancelled) {
          setData(d)
        }
      } catch (e) {
        if (!cancelled) {
          setError(extractErrorMessage(e, 'تعذّر تحميل تقرير الحملات'))
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

  const cashSeries: ChartDatum[] =
    data?.cash_by_campaign_tag?.map((r) => ({
      label: String(r.label),
      value: r.total_cash,
    })) ?? []

  const inkSeries: ChartDatum[] =
    data?.in_kind_by_campaign_tag?.map((r) => ({
      label: String(r.label),
      value: r.total_quantity_units,
    })) ?? []

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-11 w-11 animate-spin rounded-full border-2 border-violet-300 border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-400/35 bg-rose-950/35 px-4 py-4 text-sm text-rose-50">{error}</div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="space-y-10 text-sm text-white/80">
      <header className="space-y-2">
        <h2 className="text-xl font-bold text-white">لوحة تقارير الحملات وأثر التوعية</h2>
        <p className="max-w-prose leading-relaxed text-white/62">
          مبالغ نقدية وعينية مجمَّعة بتصنيف الغرض كما هو مسجَّل على التبرع، ومستفيدون مرتبطون بالأنشطة التوعوية ضمن المنصّة.
        </p>
        <p className="text-[11px] text-white/42">
          تم إنشاؤه: {new Date(data.generated_at).toLocaleString('ar-IQ')}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-400/28 bg-emerald-950/20 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-200/75">المبالغ النقدية (بحسب الغرض)</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-100">{formatCash(data.summary.cash_grand_total)}</p>
        </div>
        <div className="rounded-2xl border border-sky-400/28 bg-sky-950/20 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-sky-200/75">وحدات عينية (إجمالي الكميات)</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-sky-50">{formatInt(data.summary.in_kind_total_quantity_units)}</p>
        </div>
        <div className="rounded-2xl border border-violet-400/28 bg-violet-950/20 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-violet-200/75">أنشطة توعية مفعّلة</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-violet-50">{formatInt(data.summary.awareness_activities_count)}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-white/12 bg-black/28 p-5">
        <h3 className="text-base font-semibold text-white">منطق المحاسبة وسجلات الأثر</h3>
        <ul className="mt-4 list-disc space-y-3 pe-6 ps-4 text-[13px] leading-relaxed marker:text-teal-300/90">
          {data.summary.methodology_notes_ar.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {cashSeries.length > 0 ? (
          <BarChartCard
            title="التبرعات النقدية بحسب عنوان الغرض"
            variant="distribution"
            barClass="bg-gradient-to-l from-emerald-400/92 to-teal-500/75"
            items={cashSeries}
          />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-white/56">لا توجد تبرعات نقدية لتصنيفها حالياً.</div>
        )}
        {inkSeries.length > 0 ? (
          <BarChartCard
            title="الهبات العينية — وحدات مكسوبة بحسب عنوان الغرض"
            variant="distribution"
            barClass="bg-gradient-to-l from-sky-400/90 to-blue-600/72"
            items={inkSeries}
          />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-white/56">لا توجد عينات عينية مرتبطة بتبرعات مصنَّفة.</div>
        )}
      </div>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-white">أنشطة التوعية والمستفيدون المرتبطون</h3>
        <p className="text-xs text-white/52">
          العدد يعكس الربط اليدوي في النظام لكل نشاط مُصرَّح كــ«توعية» — لا يعتمد على تسجيل المتطوّعين وحدهم.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
          <table className="min-w-[640px] w-full border-collapse text-start text-[13px]">
            <thead>
              <tr className="border-b border-white/10 bg-black/35 text-[11px] uppercase tracking-wide text-white/42">
                <th className="px-4 py-2.5 font-semibold text-white/75">المعرّف</th>
                <th className="px-4 py-2.5 font-semibold text-white/75">العنوان</th>
                <th className="px-4 py-2.5 font-semibold text-white/75">المستفيدون المرتبطون</th>
                <th className="px-4 py-2.5 font-semibold text-white/75">المتطوعون</th>
                <th className="px-4 py-2.5 font-semibold text-white/75">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {data.awareness_activities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-white/52">
                    لا توجد فرص تُصنَّف «توعية» بعد؛ أنشِئ واحدة من صفحة التطوّع واحتفِظ بحقل النوع «توعية» ثم استخدم ربط المستفيدين.
                  </td>
                </tr>
              ) : (
                data.awareness_activities.map((row, idx) => (
                  <tr key={row.id} className={`border-b border-white/[0.06] ${idx % 2 === 0 ? 'bg-black/[0.12]' : ''}`}>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono tabular-nums text-white">{row.id}</td>
                    <td className="px-4 py-2.5 text-white/92">{String(row.title)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium tabular-nums text-teal-200/95">
                      {formatInt(Number(row.linked_beneficiaries_count))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-white/70">
                      {formatInt(Number(row.volunteer_slots_filled))} / {formatInt(Number(row.volunteer_slots_required))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">{String(row.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
