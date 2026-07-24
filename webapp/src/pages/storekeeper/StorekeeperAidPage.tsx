import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import { SubmitButton } from '../../components/SubmitButton'
import { useSubmitLock } from '../../hooks/useSubmitLock'
import {
  badgeClassForAidStatus,
  labelAidStatusAr,
  labelAidTypeAr,
} from '../../lib/operationalLabels'

function beneficiaryLabel(r: Record<string, unknown>): string {
  const raw = r.beneficiary
  if (raw && typeof raw === 'object' && 'name' in raw) {
    return String((raw as { name?: string }).name ?? '—')
  }
  return '—'
}

export function StorekeeperAidPage() {
  const [aids, setAids] = useState<Record<string, unknown>[]>([])
  const [inventoryItems, setInventoryItems] = useState<Record<string, unknown>[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [reviewId, setReviewId] = useState('')
  const [decision, setDecision] = useState('approved')
  const [note, setNote] = useState('')
  const [publishId, setPublishId] = useState('')
  const [pubTitle, setPubTitle] = useState('')
  const [pubSummary, setPubSummary] = useState('')
  const [aidId, setAidId] = useState('')
  const [invId, setInvId] = useState('')
  const [qty, setQty] = useState('5')
  const [allocJson, setAllocJson] = useState('[]')
  const [delivAid, setDelivAid] = useState('')
  const [selectedAllocationIds, setSelectedAllocationIds] = useState<string[]>([])
  const distLock = useSubmitLock()
  const delivLock = useSubmitLock()

  const reviewableOptions = aids.filter((row) => {
    const status = String(row.status ?? '')
    return status === 'pending' || status === 'submitted' || status === 'under_review'
  })

  const publishableOptions = aids.filter(
    (row) => String(row.status ?? '') === 'approved' && String(row.type ?? '') === 'urgent_financial',
  )

  const inKindOptions = aids.filter(
    (row) => String(row.type ?? '') === 'special_item' && ['approved', 'fulfilled'].includes(String(row.status ?? '')),
  )

  const deliveryAllocationOptions = useMemo(() => {
    if (!delivAid) {
      return []
    }

    const selectedAid = aids.find((aid) => String(aid.id) === delivAid)
    if (!selectedAid) {
      return []
    }

    const keys = ['allocations', 'distribution_allocations', 'inventory_allocations', 'aid_allocations']
    for (const key of keys) {
      const raw = selectedAid[key as keyof typeof selectedAid]
      if (!Array.isArray(raw)) {
        continue
      }

      return raw
        .map((entry) => {
          if (!entry || typeof entry !== 'object') {
            return null
          }
          const record = entry as Record<string, unknown>
          if (record.id == null) {
            return null
          }
          return {
            id: String(record.id),
            label: `#${String(record.id)} — ${String(record.status ?? (record.delivered_at ? 'delivered' : 'pending'))}`,
          }
        })
        .filter((entry): entry is { id: string; label: string } => entry !== null)
    }

    return []
  }, [aids, delivAid])

  const load = useCallback(async () => {
    setErr(null)
    try {
      const [res, inv] = await Promise.all([
        api.fetchAidRequests({ page }),
        api.fetchInventoryItems({ page: 1, status: 'stored' }),
      ])
      setAids((res.data as Record<string, unknown>[]) ?? [])
      setLastPage(Math.max(1, res.last_page))
      setTotal(res.total ?? 0)
      setInventoryItems((inv.data as Record<string, unknown>[]) ?? [])
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر التحميل'))
    }
  }, [page])

  useEffect(() => {
    void load()
  }, [load])

  async function onReview(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    try {
      await api.reviewAidRequest(Number(reviewId), { decision, review_note: note || null })
      setMsg('تمت مراجعة طلب الدعم المعيشي/العيني.')
      setNote('')
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'فشلت المراجعة'))
    }
  }

  async function onPublish(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    try {
      await api.publishAidRequestForDonors(Number(publishId), {
        public_title: pubTitle.trim(),
        public_summary: pubSummary.trim(),
      })
      setMsg('تم نشر الحالة للمتبرعين.')
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'فشل النشر'))
    }
  }

  async function onDistribute(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    await distLock.run(async () => {
      try {
        let items: { inventory_item_id: number; quantity: number }[]
        if (allocJson.trim().startsWith('[')) {
          items = JSON.parse(allocJson) as { inventory_item_id: number; quantity: number }[]
        } else {
          items = [{ inventory_item_id: Number(invId), quantity: Number(qty) }]
        }
        await api.postAidInventoryDistribution(Number(aidId), { items })
        setMsg('تم التوزيع من المخزون.')
        await load()
      } catch (ex) {
        setErr(extractErrorMessage(ex, 'فشل التوزيع'))
      }
    })
  }

  async function onDeliver(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    await delivLock.run(async () => {
      try {
        const ids = selectedAllocationIds.map((id) => Number(id)).filter(Boolean)
        await api.confirmAidDelivery(Number(delivAid), {
          allocation_ids: ids,
          delivery_note: 'تسليم من الويب',
        })
        setMsg('تم تأكيد التسليم.')
        await load()
      } catch (ex) {
        setErr(extractErrorMessage(ex, 'فشل التسليم'))
      }
    })
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
            <h2 className="text-base font-semibold text-white">الدعم المعيشي والعينية</h2>
            <p className="mt-1 text-xs text-white/50">
              طلبات الدعم المعيشي العاجل والمواد العينية فقط. الطلبات الطبية عند السكرتيرة.
            </p>
            <p className="mt-1 text-xs text-white/45">
              {total > 0 ? (
                <>
                  إجمالي {total} طلباً — صفحة {page} / {lastPage}
                </>
              ) : (
                <>لا طلبات دعم معيشي/عيني حالياً.</>
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
          <table className="w-full min-w-[640px] border-collapse text-start text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-black/30 text-[11px] uppercase tracking-wide text-white/45">
                <th className="px-3 py-2.5 font-semibold">الرقم</th>
                <th className="px-3 py-2.5 font-semibold">المستفيد</th>
                <th className="px-3 py-2.5 font-semibold">نوع الطلب</th>
                <th className="px-3 py-2.5 font-semibold">الحالة</th>
                <th className="px-3 py-2.5 font-semibold">للمتبرعين</th>
              </tr>
            </thead>
            <tbody>
              {aids.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-white/50">
                    لا بيانات لعرضها.
                  </td>
                </tr>
              ) : (
                aids.map((r, idx) => {
                  const st = String(r.status ?? '')
                  const tp = String((r as { type?: string }).type ?? '')
                  const canReview = st === 'pending' || st === 'submitted' || st === 'under_review'
                  return (
                    <tr
                      key={String(r.id)}
                      className={`border-b border-white/[0.06] ${idx % 2 === 0 ? 'bg-black/15' : ''} ${
                        canReview ? 'cursor-pointer hover:bg-white/10' : ''
                      }`}
                      onClick={() => {
                        if (canReview) {
                          setReviewId(String(r.id))
                        }
                        if (st === 'approved' && tp === 'urgent_financial') {
                          setPublishId(String(r.id))
                        }
                        if (tp === 'special_item' && (st === 'approved' || st === 'fulfilled')) {
                          setAidId(String(r.id))
                          setDelivAid(String(r.id))
                        }
                      }}
                    >
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-white">#{String(r.id)}</td>
                      <td className="px-3 py-2.5 text-white/88">{beneficiaryLabel(r)}</td>
                      <td className="px-3 py-2.5 text-white/82">{labelAidTypeAr(tp)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${badgeClassForAidStatus(st)}`}>
                          {labelAidStatusAr(st)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-white/65">
                        {r.published_for_donors_at ? 'منشور' : st === 'approved' && tp === 'urgent_financial' ? 'جاهز للنشر' : '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white">مراجعة طلب</h2>
        <form className="mt-4 flex flex-wrap items-end gap-2" onSubmit={onReview}>
          <select
            className="min-w-[260px] rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 font-mono text-white"
            value={reviewId}
            onChange={(e) => setReviewId(e.target.value)}
          >
            <option value="">اختر الطلب</option>
            {reviewableOptions.map((row) => (
              <option key={String(row.id)} value={String(row.id)}>
                #{String(row.id)} — {beneficiaryLabel(row)} — {labelAidTypeAr(String((row as { type?: string }).type ?? ''))}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
          >
            <option value="approved">معتمد</option>
            <option value="rejected">مرفوض</option>
          </select>
          <input
            className="min-w-[200px] flex-1 rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            placeholder="ملاحظة المراجع (اختياري)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button type="submit" className="rounded-lg bg-orange-600 px-4 py-2 font-medium text-white">
            إرسال القرار
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white">نشر دعم معيشي طارئ للمتبرعين</h2>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={onPublish}>
          <select
            className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 font-mono text-white sm:col-span-2"
            value={publishId}
            onChange={(e) => setPublishId(e.target.value)}
          >
            <option value="">اختر طلباً معتمداً (دعم معيشي)</option>
            {publishableOptions.map((row) => (
              <option key={String(row.id)} value={String(row.id)}>
                #{String(row.id)} — {beneficiaryLabel(row)}
              </option>
            ))}
          </select>
          <input
            className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white sm:col-span-2"
            placeholder="عنوان عام للمتبرعين"
            value={pubTitle}
            onChange={(e) => setPubTitle(e.target.value)}
          />
          <textarea
            className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white sm:col-span-2"
            rows={3}
            placeholder="ملخص الحالة (بدون بيانات شخصية)"
            value={pubSummary}
            onChange={(e) => setPubSummary(e.target.value)}
          />
          <button type="submit" className="rounded-lg bg-rose-600 px-4 py-2.5 font-medium text-white sm:col-span-2">
            نشر للمتبرعين
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-semibold text-white">توزيع مخزون على طلب عيني</h2>
        <form className="mt-3 space-y-2" onSubmit={onDistribute}>
          <select
            className="w-full rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            value={aidId}
            onChange={(e) => setAidId(e.target.value)}
          >
            <option value="">اختر طلباً عينياً معتمداً</option>
            {inKindOptions.map((aid) => (
              <option key={String(aid.id)} value={String(aid.id)}>
                #{String(aid.id)} — {beneficiaryLabel(aid)} — {labelAidStatusAr(String(aid.status ?? ''))}
              </option>
            ))}
          </select>
          <textarea
            className="w-full rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 font-mono text-xs text-white"
            rows={3}
            placeholder='مثال: [{"inventory_item_id":1,"quantity":2}]'
            value={allocJson}
            onChange={(e) => setAllocJson(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <select
              className="min-w-[260px] rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
              value={invId}
              onChange={(e) => setInvId(e.target.value)}
            >
              <option value="">اختر صنف المخزون</option>
              {inventoryItems.map((item) => (
                <option key={String(item.id)} value={String(item.id)}>
                  #{String(item.id)} — {String(item.name ?? 'صنف')} (متبقي: {String(item.quantity_remaining ?? '0')})
                </option>
              ))}
            </select>
            <input
              className="w-20 rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
              placeholder="qty"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>
          <SubmitButton busy={distLock.busy} className="rounded-lg bg-orange-600 px-4 py-2 text-white">
            توزيع
          </SubmitButton>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-semibold text-white">تأكيد تسليم</h2>
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={onDeliver}>
          <select
            className="min-w-[260px] rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            value={delivAid}
            onChange={(e) => {
              setDelivAid(e.target.value)
              setSelectedAllocationIds([])
            }}
          >
            <option value="">اختر طلب المساعدة</option>
            {inKindOptions.map((aid) => (
              <option key={String(aid.id)} value={String(aid.id)}>
                #{String(aid.id)} — {beneficiaryLabel(aid)}
              </option>
            ))}
          </select>
          <select
            multiple
            className="min-h-[110px] min-w-[280px] flex-1 rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            value={selectedAllocationIds}
            onChange={(e) =>
              setSelectedAllocationIds(Array.from(e.target.selectedOptions).map((option) => option.value))
            }
          >
            {deliveryAllocationOptions.length === 0 ? (
              <option value="" disabled>
                لا توجد تخصيصات ظاهرة لهذا الطلب حالياً
              </option>
            ) : (
              deliveryAllocationOptions.map((allocation) => (
                <option key={allocation.id} value={allocation.id}>
                  {allocation.label}
                </option>
              ))
            )}
          </select>
          <SubmitButton busy={delivLock.busy} className="rounded-lg bg-teal-600 px-4 py-2 text-white">
            تأكيد
          </SubmitButton>
        </form>
      </section>
    </div>
  )
}
