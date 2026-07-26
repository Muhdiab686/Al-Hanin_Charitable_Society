import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
<<<<<<< HEAD
import type { AidDistributionCandidateFamily } from '../../api/services'
import { labelAidTypeAr, labelPlanStatusAr } from '../../lib/operationalLabels'
=======
import { labelAidTypeAr, labelHousingStatusAr, labelPlanStatusAr } from '../../lib/operationalLabels'

const HOUSING_OPTIONS = [
  { value: 'owned', label: 'ملك' },
  { value: 'rented', label: 'إيجار' },
  { value: 'hosted', label: 'ضيافة' },
  { value: 'unstable', label: 'غير مستقر' },
] as const
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194

export function SecretaryAidPlansPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [campaigns, setCampaigns] = useState<Record<string, unknown>[]>([])
  const [inventoryItems, setInventoryItems] = useState<Record<string, unknown>[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [title, setTitle] = useState('خطة تجريبية')
  const [itemLabel, setItemLabel] = useState('سلة غذائية')
  const [inventoryItemId, setInventoryItemId] = useState('')
  const [aidType, setAidType] = useState('special_item')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [units, setUnits] = useState('100')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<'once' | 'quarterly' | 'yearly'>('once')
  const [autoUnits, setAutoUnits] = useState(false)
  const [minChildrenUnder18, setMinChildrenUnder18] = useState('')
  const [minAdults, setMinAdults] = useState('')
  const [housingStatuses, setHousingStatuses] = useState<string[]>([])
  const [healthPriorityOnly, setHealthPriorityOnly] = useState(false)
  const [campaignId, setCampaignId] = useState('')
  const [beneficiariesOpen, setBeneficiariesOpen] = useState(false)
  const [beneficiariesLoading, setBeneficiariesLoading] = useState(false)
  const [selectedPlanTitle, setSelectedPlanTitle] = useState('')
  const [planBeneficiaries, setPlanBeneficiaries] = useState<Record<string, unknown>[]>([])

  function toggleHousingStatus(value: string) {
    setHousingStatuses((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    )
  }

  async function openPlanBeneficiaries(planId: number, planTitle: string) {
    setMsg(null)
    setErr(null)
    setSelectedPlanTitle(planTitle)
    setBeneficiariesOpen(true)
    setBeneficiariesLoading(true)
    setPlanBeneficiaries([])
    try {
      const data = await api.fetchAidDistributionPlan(planId)
      setPlanBeneficiaries(data.beneficiaries ?? [])
    } catch (ex) {
      setErr(extractErrorMessage(ex as Error, 'تعذّر تحميل مستفيدي الخطة'))
      setBeneficiariesOpen(false)
    } finally {
      setBeneficiariesLoading(false)
    }
  }

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
        const campaignsRes = await api.fetchCampaigns({ page: 1, per_page: 100 })
        setCampaigns((campaignsRes.data as Record<string, unknown>[]) ?? [])
      } catch {
        setCampaigns([])
      }

      try {
        const invRes = await api.fetchInventoryItems({ page: 1, status: 'stored' })
        setInventoryItems((invRes.data as Record<string, unknown>[]) ?? [])
      } catch {
        setInventoryItems([])
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

    const isFinancial = aidType === 'urgent_financial'

    const body = {
      title,
      aid_type: aidType,
      item_label: itemLabel.trim() || title,
      distribution_date: date,
      distribution_frequency: frequency,
      notes: 'من الويب',
      ...(campaignId ? { campaign_id: Number(campaignId) } : {}),
<<<<<<< HEAD
      filter_criteria: buildFilterCriteria(),
      ...(selectedFamilyIds.size > 0 ? { selected_family_ids: Array.from(selectedFamilyIds) } : {}),
      ...(isFinancial
=======
      ...(inventoryItemId && aidType !== 'urgent_financial'
        ? { inventory_item_id: Number(inventoryItemId) }
        : {}),
      filter_criteria: {
        ...(minChildrenUnder18 ? { min_children_under_18: Number(minChildrenUnder18) } : {}),
        ...(minAdults ? { min_adults: Number(minAdults) } : {}),
        ...(housingStatuses.length > 0 ? { housing_statuses: housingStatuses } : {}),
        ...(healthPriorityOnly ? { health_priority_only: true } : {}),
      },
      ...(aidType === 'urgent_financial'
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
        ? { total_amount: Number(amount || '500') }
        : autoUnits
          ? { auto_units: true }
          : { total_units: Number(units) }),
    }
    try {
      await api.createAidDistributionPlan(body)
<<<<<<< HEAD
      setMsg('تم إنشاء الخطة.')
      resetCandidates()
=======
      setMsg('تم إنشاء الخطة. نفّذ دورة التوزيع لخصم المستودع وإصدار رموز الاستلام.')
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'فشل الإنشاء'))
    }
  }

  async function onCompleteCycle(planId: number, planInventoryItemId?: number | null) {
    setMsg(null)
    setErr(null)
    try {
      const payload =
        planInventoryItemId != null
          ? { inventory_item_id: planInventoryItemId }
          : inventoryItemId
            ? { inventory_item_id: Number(inventoryItemId) }
            : undefined
      await api.completeAidDistributionPlanCycle(planId, payload)
      setMsg('تم تنفيذ الدورة: خصم المخزون وإشعار المستودع وإصدار طلبات التسليم.')
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
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => void openPlanBeneficiaries(Number(r.id), String(r.title ?? `خطة #${String(r.id)}`))}
                          className="rounded-md bg-sky-700 px-2 py-1 text-[11px] text-white hover:bg-sky-600"
                        >
                          المستفيدون
                        </button>
                        <button
                          type="button"
                          disabled={String(r.status ?? '') === 'completed'}
                          onClick={() =>
                            void onCompleteCycle(
                              Number(r.id),
                              r.inventory_item_id != null
                                ? Number(r.inventory_item_id)
                                : (r.inventory_item as { id?: number } | null)?.id ?? null,
                            )
                          }
                          className="rounded-md bg-emerald-700 px-2 py-1 text-[11px] text-white disabled:opacity-40"
                        >
                          تنفيذ وخصم المستودع
                        </button>
                      </div>
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
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[11px] font-medium text-white/45">اسم المادة / السلة (يظهر للمستفيد)</label>
            <input
              className="w-full rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              value={itemLabel}
              onChange={(e) => setItemLabel(e.target.value)}
              placeholder="مثال: سلة غذائية"
            />
          </div>
          {aidType !== 'urgent_financial' ? (
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11px] font-medium text-white/45">
                مادة المستودع (مطلوبة عند التنفيذ)
              </label>
              <select
                className="w-full rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
                value={inventoryItemId}
                onChange={(e) => {
                  const id = e.target.value
                  setInventoryItemId(id)
                  const selected = inventoryItems.find((item) => String(item.id) === id)
                  if (selected?.name) {
                    setItemLabel(String(selected.name))
                  }
                }}
              >
                <option value="">اختر من المخزون المخزّن…</option>
                {inventoryItems.map((item) => (
                  <option key={String(item.id)} value={String(item.id)}>
                    {String(item.name ?? item.item_code)} — متبقي {String(item.quantity_remaining ?? 0)}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-white/40">
                عند «تنفيذ وخصم المستودع» تُخصم الكميات ويصل المستفيد رمز تأكيد الاستلام.
              </p>
            </div>
          ) : null}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-white/45">نوع المساعدة</label>
            <select
              className="w-full rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              value={aidType}
              onChange={(e) => setAidType(e.target.value)}
            >
              <option value="urgent_financial">دعم معيشي عاجل</option>
              <option value="special_item">مواد أو عينية خاصة</option>
<<<<<<< HEAD
              <option value="medical_prescription">وصفة طبيّة / صرف دوائي</option>
              <option value="food_basket">سلة غذائية</option>
              <option value="stationery">قرطاسية</option>
=======
              <option value="surgery">عملية</option>
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
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
              {campaigns.map((campaign) => {
                const status = String(campaign.status ?? '')
                const statusAr =
                  status === 'active' ? 'نشطة' : status === 'paused' ? 'موقوفة' : status === 'completed' ? 'مكتملة' : status
                return (
                  <option key={String(campaign.id)} value={String(campaign.id)}>
                    {String(campaign.title ?? `حملة #${String(campaign.id)}`)}
                    {statusAr ? ` — ${statusAr}` : ''}
                  </option>
                )
              })}
            </select>
            <p className="mt-1 text-[11px] text-white/40">
              القائمة تُجلب من الحملات المسجّلة في النظام وتتحدّث تلقائياً عند إضافة حملة جديدة.
            </p>
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
            <>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/80">
                  <input
                    type="checkbox"
                    checked={autoUnits}
                    onChange={(e) => setAutoUnits(e.target.checked)}
                  />
                  حساب الكمية تلقائيًا (وحدة واحدة لكل عائلة مختارة)
                </label>
              </div>
              {!autoUnits ? (
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[11px] font-medium text-white/45">عدد الوحدات</label>
                  <input
                    className="w-full rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
                    placeholder="مثال: 100"
                    value={units}
                    onChange={(e) => setUnits(e.target.value)}
                  />
                </div>
              ) : (
                <div className="sm:col-span-2 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
                  {selectedFamilyIds.size > 0
                    ? `سيتم حساب ${selectedFamilyIds.size} وحدة تلقائيًا (وحدة لكل عائلة مختارة).`
                    : 'سيتم حساب الكمية تلقائيًا بعد معاينة واختيار العائلات (وحدة لكل عائلة).'}
                </div>
              )}
            </>
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
            <span className="mb-2 block text-[11px] font-medium text-white/45">حالة السكن (اختياري — يمكن اختيار أكثر من حالة)</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {HOUSING_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/85"
                >
                  <input
                    type="checkbox"
                    checked={housingStatuses.includes(option.value)}
                    onChange={() => toggleHousingStatus(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
            {housingStatuses.length > 0 ? (
              <p className="mt-2 text-[11px] text-white/45">
                المحدد: {housingStatuses.map((code) => labelHousingStatusAr(code)).join('، ')}
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-white/40">بدون تحديد = كل حالات السكن</p>
            )}
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

      {beneficiariesOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-2xl border border-sky-300/25 bg-slate-950 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white">مستفيدو الخطة</h3>
                <p className="mt-1 text-xs text-white/55">{selectedPlanTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setBeneficiariesOpen(false)}
                className="rounded-lg border border-white/20 px-3 py-1 text-xs text-white"
              >
                إغلاق
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-white/[0.06]">
              {beneficiariesLoading ? (
                <p className="px-4 py-10 text-center text-sm text-white/50">جاري التحميل…</p>
              ) : planBeneficiaries.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-white/50">لا مستفيدين مسجّلين على هذه الخطة.</p>
              ) : (
                <table className="w-full min-w-[720px] border-collapse text-start text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-black/35 text-[11px] text-white/45">
                      <th className="px-3 py-2.5 font-semibold">#</th>
                      <th className="px-3 py-2.5 font-semibold">المستفيد</th>
                      <th className="px-3 py-2.5 font-semibold">العائلة</th>
                      <th className="px-3 py-2.5 font-semibold">الهاتف</th>
                      <th className="px-3 py-2.5 font-semibold">التخصيص</th>
                      <th className="px-3 py-2.5 font-semibold">التنفيذ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planBeneficiaries.map((row, idx) => (
                      <tr key={String(row.line_id ?? idx)} className={`border-b border-white/[0.06] ${idx % 2 === 0 ? 'bg-black/15' : ''}`}>
                        <td className="px-3 py-2 font-mono text-white/70">{String(row.beneficiary_id ?? '—')}</td>
                        <td className="px-3 py-2 font-medium text-white">{String(row.beneficiary_name ?? '—')}</td>
                        <td className="px-3 py-2 text-white/75">
                          <span className="block">{String(row.family_head ?? '—')}</span>
                          <span className="font-mono text-[10px] text-white/45">{String(row.family_code ?? '')}</span>
                        </td>
                        <td className="px-3 py-2 font-mono text-white/70">
                          {String(row.beneficiary_phone ?? row.family_phone ?? '—')}
                        </td>
                        <td className="px-3 py-2 text-emerald-100">{String(row.value_label ?? '—')}</td>
                        <td className="px-3 py-2">
                          {row.executed ? (
                            <span className="inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-100 ring-1 ring-emerald-400/35">
                              منفّذ
                              {Number(row.last_fulfilled_cycle ?? 0) > 0
                                ? ` (دورة ${String(row.last_fulfilled_cycle)})`
                                : ''}
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-100 ring-1 ring-amber-400/35">
                              بانتظار التنفيذ
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {!beneficiariesLoading && planBeneficiaries.length > 0 ? (
              <p className="mt-3 text-[11px] text-white/45">
                الإجمالي: {planBeneficiaries.length} مستفيد
                {' · '}
                منفّذ: {planBeneficiaries.filter((b) => Boolean(b.executed)).length}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
