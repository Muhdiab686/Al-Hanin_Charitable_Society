import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import { labelAidTypeAr, labelPlanStatusAr } from '../../lib/operationalLabels'

export function SecretaryAidPlansPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [title, setTitle] = useState('خطة تجريبية')
  const [aidType, setAidType] = useState('special_item')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [units, setUnits] = useState('100')
  const [amount, setAmount] = useState('')

  const load = useCallback(async () => {
    setErr(null)
    try {
      const res = await api.fetchAidDistributionPlans({ page })
      setRows((res.data as Record<string, unknown>[]) ?? [])
      setLastPage(Math.max(1, res.last_page))
      setTotal(res.total ?? 0)
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر التحميل'))
    }
  }, [page])

  useEffect(() => {
    void load()
  }, [load])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    const body = {
      title,
      aid_type: aidType,
      distribution_date: date,
      notes: 'من الويب',
      ...(aidType === 'urgent_financial'
        ? { total_amount: Number(amount || '500') }
        : { total_units: Number(units) }),
    }
    try {
      await api.createAidDistributionPlan(body)
      setMsg('تم إنشاء الخطة.')
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'فشل الإنشاء'))
    }
  }

  function summaryCell(r: Record<string, unknown>): string {
    const amt = r.total_amount
    const unitsVal = r.total_units
    const fam = r.eligible_families_count

    if (amt != null && String(amt) !== '') {
      return `إجمالي مبلغ: ${String(amt)} · عائلات: ${String(fam ?? '—')}`
    }
    if (unitsVal != null && String(unitsVal) !== '') {
      return `عدد الوحدات: ${String(unitsVal)} · عائلات: ${String(fam ?? '—')}`
    }

    return `عائلات: ${String(fam ?? '—')}`
  }

  return (
    <div className="space-y-6 text-sm">
      {(msg || err) && (
        <div className={`rounded-xl px-4 py-3 ${err ? 'bg-red-500/15 text-red-100' : 'bg-emerald-500/15 text-emerald-50'}`}>
          {err ?? msg}
        </div>
      )}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">خطط التوزيع</h2>
            <p className="mt-1 text-xs text-white/50">
              {total > 0 ? (
                <>
                  {total} خطة — صفحة {page} من {lastPage}
                </>
              ) : (
                <>لا خطط مسجّلة في هذه الصفحة.</>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs disabled:opacity-40"
            >
              السابق
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              disabled={page >= lastPage}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs disabled:opacity-40"
            >
              التالي
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[720px] border-collapse text-start text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-black/30 text-[11px] uppercase tracking-wide text-white/45">
                <th className="px-3 py-2.5 font-semibold">الخطة</th>
                <th className="px-3 py-2.5 font-semibold">نوع المساعدة</th>
                <th className="px-3 py-2.5 font-semibold">التاريخ</th>
                <th className="px-3 py-2.5 font-semibold">الحالة</th>
                <th className="px-3 py-2.5 font-semibold">الملخص</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-white/50">
                    لا خطط بعد.
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => (
                  <tr
                    key={String(r.id)}
                    className={`border-b border-white/[0.06] ${idx % 2 === 0 ? 'bg-black/15' : 'bg-transparent'}`}
                  >
                    <td className="max-w-[200px] px-3 py-2.5">
                      <span className="font-mono text-[11px] text-white/45">#{String(r.id)}</span>
                      <span className="mt-0.5 block font-medium text-white">{String(r.title)}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-white/85">{labelAidTypeAr(r.aid_type)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[12px] text-white/70">
                      {String(r.distribution_date ?? '—').slice(0, 10)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-white/80">{labelPlanStatusAr(r.status)}</td>
                    <td className="max-w-[280px] px-3 py-2.5 text-[11px] leading-relaxed text-white/55">
                      {summaryCell(r)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white">إنشاء خطة جديدة</h2>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={onCreate}>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[11px] font-medium text-white/45">عنوان الخطة</label>
            <input
              className="w-full rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-white/45">نوع المساعدة</label>
            <select
              className="w-full rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              value={aidType}
              onChange={(e) => setAidType(e.target.value)}
            >
              <option value="urgent_financial">دعم معيشي عاجل</option>
              <option value="special_item">مواد أو عينية خاصة</option>
              <option value="medical_prescription">وصفة طبيّة / صرف دوائي</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-white/45">تاريخ التوزيع</label>
            <input
              type="date"
              className="w-full rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          {aidType === 'urgent_financial' ? (
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11px] font-medium text-white/45">المبلغ الإجمالي</label>
              <input
                className="w-full rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
                placeholder="مثال: 500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          ) : (
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11px] font-medium text-white/45">عدد الوحدات</label>
              <input
                className="w-full rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
                placeholder="مثال: 100"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
              />
            </div>
          )}
          <button type="submit" className="rounded-lg bg-violet-600 py-2.5 font-medium text-white sm:col-span-2">
            إنشاء الخطة
          </button>
        </form>
      </section>
    </div>
  )
}
