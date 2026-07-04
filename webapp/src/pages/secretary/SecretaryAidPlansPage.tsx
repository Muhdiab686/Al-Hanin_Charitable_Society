import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import type { AidDistributionCandidateFamily } from '../../api/services'
import { labelAidTypeAr, labelPlanStatusAr } from '../../lib/operationalLabels'

export function SecretaryAidPlansPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [campaigns, setCampaigns] = useState<Record<string, unknown>[]>([])
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
  const [frequency, setFrequency] = useState<'once' | 'quarterly' | 'yearly'>('once')
  const [minChildrenUnder18, setMinChildrenUnder18] = useState('')
  const [minAdults, setMinAdults] = useState('')
  const [housingStatuses, setHousingStatuses] = useState('')
  const [healthPriorityOnly, setHealthPriorityOnly] = useState(false)
  const [campaignId, setCampaignId] = useState('')

  const [candidates, setCandidates] = useState<AidDistributionCandidateFamily[] | null>(null)
  const [candidatesLoading, setCandidatesLoading] = useState(false)
  const [selectedFamilyIds, setSelectedFamilyIds] = useState<Set<number>>(new Set())

  const load = useCallback(async () => {
    setErr(null)
    try {
      const res = await api.fetchAidDistributionPlans({ page })
      setRows((res.data as Record<string, unknown>[]) ?? [])
      setLastPage(Math.max(1, res.last_page))
      setTotal(res.total ?? 0)

      try {
        const campaignsRes = await api.fetchCampaigns()
        setCampaigns((campaignsRes.data as Record<string, unknown>[]) ?? [])
      } catch {
        setCampaigns([])
      }
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر التحميل'))
    }
  }, [page])

  useEffect(() => {
    void load()
  }, [load])

  function buildFilterCriteria(): Record<string, unknown> {
    return {
      ...(minChildrenUnder18 ? { min_children_under_18: Number(minChildrenUnder18) } : {}),
      ...(minAdults ? { min_adults: Number(minAdults) } : {}),
      ...(housingStatuses.trim()
        ? { housing_statuses: housingStatuses.split(',').map((value) => value.trim()).filter(Boolean) }
        : {}),
      ...(healthPriorityOnly ? { health_priority_only: true } : {}),
    }
  }

  async function onPreviewCandidates() {
    setMsg(null)
    setErr(null)
    setCandidatesLoading(true)
    try {
      const response = await api.previewAidDistributionCandidates(buildFilterCriteria())
      setCandidates(response.families)
      setSelectedFamilyIds(new Set())
      if (response.families.length === 0) {
        setErr('لا توجد عائلات مطابقة لمعايير الفلترة الحالية.')
      }
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'تعذّرت معاينة المستفيدين'))
    } finally {
      setCandidatesLoading(false)
    }
  }

  function toggleFamilySelection(familyId: number) {
    setSelectedFamilyIds((prev) => {
      const next = new Set(prev)
      if (next.has(familyId)) {
        next.delete(familyId)
      } else {
        next.add(familyId)
      }
      return next
    })
  }

  function selectAllCandidates() {
    if (!candidates) {
      return
    }
    setSelectedFamilyIds(new Set(candidates.map((c) => c.family_id)))
  }

  function clearSelection() {
    setSelectedFamilyIds(new Set())
  }

  function resetCandidates() {
    setCandidates(null)
    setSelectedFamilyIds(new Set())
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)

    if (candidates !== null && selectedFamilyIds.size === 0) {
      setErr('يرجى تحديد مستفيد واحد على الأقل من قائمة المرشّحين بعد المعاينة.')
      return
    }

    const body = {
      title,
      aid_type: aidType,
      distribution_date: date,
      distribution_frequency: frequency,
      notes: 'من الويب',
      ...(campaignId ? { campaign_id: Number(campaignId) } : {}),
      filter_criteria: buildFilterCriteria(),
      ...(selectedFamilyIds.size > 0 ? { selected_family_ids: Array.from(selectedFamilyIds) } : {}),
      ...(aidType === 'urgent_financial'
        ? { total_amount: Number(amount || '500') }
        : { total_units: Number(units) }),
    }
    try {
      await api.createAidDistributionPlan(body)
      setMsg('تم إنشاء الخطة.')
      resetCandidates()
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'فشل الإنشاء'))
    }
  }

  async function onCompleteCycle(planId: number) {
    setMsg(null)
    setErr(null)
    try {
      await api.completeAidDistributionPlanCycle(planId)
      setMsg('تم تحديث دورة التنفيذ للخطة.')
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex as Error, 'فشل تحديث تقدم الخطة'))
    }
  }

  function summaryCell(r: Record<string, unknown>): string {
    const amt = r.total_amount
    const unitsVal = r.total_units
    const fam = r.eligible_families_count

    if (amt != null && String(amt) !== '') {
      return `الدورة: ${String(amt)} · سنوي: ${String(r.projected_annual_amount ?? '—')} · عائلات: ${String(fam ?? '—')}`
    }
    if (unitsVal != null && String(unitsVal) !== '') {
      return `الدورة: ${String(unitsVal)} وحدة · سنوي: ${String(r.projected_annual_units ?? '—')} · عائلات: ${String(fam ?? '—')}`
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
                <th className="px-3 py-2.5 font-semibold">الحملة</th>
                <th className="px-3 py-2.5 font-semibold">التاريخ</th>
                <th className="px-3 py-2.5 font-semibold">الدورية</th>
                <th className="px-3 py-2.5 font-semibold">الحالة</th>
                <th className="px-3 py-2.5 font-semibold">الملخص</th>
                <th className="px-3 py-2.5 font-semibold">التقدم السنوي</th>
                <th className="px-3 py-2.5 font-semibold">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-white/50">
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
                    <td className="whitespace-nowrap px-3 py-2.5 text-white/70">
                      {String((r.campaign as { title?: string } | null)?.title ?? '—')}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[12px] text-white/70">
                      {String(r.distribution_date ?? '—').slice(0, 10)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-white/80">
                      {String(r.distribution_frequency ?? 'once') === 'quarterly'
                        ? 'ربع سنوي'
                        : String(r.distribution_frequency ?? 'once') === 'yearly'
                          ? 'سنوي'
                          : 'مرة واحدة'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-white/80">{labelPlanStatusAr(r.status)}</td>
                    <td className="max-w-[280px] px-3 py-2.5 text-[11px] leading-relaxed text-white/55">
                      {summaryCell(r)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="w-40">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${Math.min(100, Math.max(0, Number(r.progress_percentage ?? 0)))}%` }}
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-white/70">
                          {String(r.completed_cycles ?? 0)}/{String(r.cycles_per_year ?? 1)} دورة
                        </p>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        disabled={String(r.status ?? '') === 'completed'}
                        onClick={() => void onCompleteCycle(Number(r.id))}
                        className="rounded-md bg-emerald-700 px-2 py-1 text-[11px] text-white disabled:opacity-40"
                      >
                        تسجيل دورة منفذة
                      </button>
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
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[11px] font-medium text-white/45">ربط الخطة بحملة (اختياري)</label>
            <select
              className="w-full rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            >
              <option value="">بدون حملة</option>
              {campaigns.map((campaign) => (
                <option key={String(campaign.id)} value={String(campaign.id)}>
                  {String(campaign.title ?? `حملة #${String(campaign.id)}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[11px] font-medium text-white/45">الدورية</label>
            <select
              className="w-full rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as 'once' | 'quarterly' | 'yearly')}
            >
              <option value="once">مرة واحدة</option>
              <option value="quarterly">كل 3 أشهر</option>
              <option value="yearly">سنوي</option>
            </select>
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
          <div>
            <label className="mb-1 block text-[11px] font-medium text-white/45">حد أدنى أطفال (&lt; 18)</label>
            <input
              className="w-full rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              value={minChildrenUnder18}
              onChange={(e) => setMinChildrenUnder18(e.target.value)}
              placeholder="مثال: 2"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-white/45">حد أدنى بالغين</label>
            <input
              className="w-full rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              value={minAdults}
              onChange={(e) => setMinAdults(e.target.value)}
              placeholder="مثال: 1"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[11px] font-medium text-white/45">حالة السكن (مفصولة بفاصلة)</label>
            <input
              className="w-full rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              value={housingStatuses}
              onChange={(e) => setHousingStatuses(e.target.value)}
              placeholder="rent, displaced, temporary"
            />
          </div>
          <label className="sm:col-span-2 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/80">
            <input type="checkbox" checked={healthPriorityOnly} onChange={(e) => setHealthPriorityOnly(e.target.checked)} />
            إعطاء أولوية للحالات الصحية الحرجة فقط
          </label>

          <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={candidatesLoading}
              onClick={() => void onPreviewCandidates()}
              className="rounded-lg border border-violet-400/40 bg-violet-600/20 px-3 py-2 text-xs font-semibold text-violet-100 disabled:opacity-50"
            >
              {candidatesLoading ? 'جاري المعاينة...' : 'معاينة المستفيدين المطابقين'}
            </button>
            {candidates !== null ? (
              <button
                type="button"
                onClick={resetCandidates}
                className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/70"
              >
                إلغاء المعاينة والعودة للاختيار التلقائي
              </button>
            ) : null}
          </div>

          {candidates !== null ? (
            <div className="sm:col-span-2 rounded-xl border border-violet-400/25 bg-violet-950/15 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-white/75">
                  {candidates.length} عائلة مطابقة — تم تحديد {selectedFamilyIds.size}
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={selectAllCandidates} className="rounded-md border border-white/20 px-2 py-1 text-[11px] text-white/80">
                    تحديد الكل
                  </button>
                  <button type="button" onClick={clearSelection} className="rounded-md border border-white/20 px-2 py-1 text-[11px] text-white/80">
                    إلغاء التحديد
                  </button>
                </div>
              </div>
              <div className="mt-3 max-h-64 space-y-1.5 overflow-y-auto">
                {candidates.length === 0 ? (
                  <p className="text-xs text-white/50">لا توجد عائلات مطابقة لمعايير الفلترة.</p>
                ) : (
                  candidates.map((c) => (
                    <label
                      key={c.family_id}
                      className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/85"
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedFamilyIds.has(c.family_id)}
                          onChange={() => toggleFamilySelection(c.family_id)}
                        />
                        <span>
                          {c.head_name ?? `عائلة #${c.family_id}`}
                          {c.family_code ? <span className="text-white/40"> ({c.family_code})</span> : null}
                        </span>
                      </span>
                      <span className="text-[11px] text-white/50">
                        أفراد: {c.members_count ?? '—'} · حالات صحية: {c.health_priority_cases ?? 0} · أولوية: {c.priority_score ?? 0}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          ) : null}

          <button type="submit" className="rounded-lg bg-violet-600 py-2.5 font-medium text-white sm:col-span-2">
            {candidates !== null ? `إنشاء الخطة للمستفيدين المحددين (${selectedFamilyIds.size})` : 'إنشاء الخطة (اختيار تلقائي لكل المؤهلين)'}
          </button>
        </form>
      </section>
    </div>
  )
}
