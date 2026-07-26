import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import { SubmitButton } from '../../components/SubmitButton'
import { useSubmitLock } from '../../hooks/useSubmitLock'
import { badgeClassForAidStatus, labelAidStatusAr, labelAidTypeAr } from '../../lib/operationalLabels'

export function VolunteerAidPage() {
  const [aids, setAids] = useState<Record<string, unknown>[]>([])
  const [beneficiaries, setBeneficiaries] = useState<Record<string, unknown>[]>([])
  const [inventoryItems, setInventoryItems] = useState<Record<string, unknown>[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [benId, setBenId] = useState('')
  const [type, setType] = useState('special_item')
  const [desc, setDesc] = useState('طلب من متطوع')
  const [aidId, setAidId] = useState('')
  const [invId, setInvId] = useState('')
  const [qty, setQty] = useState('2')
  const [delivAid, setDelivAid] = useState('')
  const [selectedAllocationIds, setSelectedAllocationIds] = useState<string[]>([])
  const [files, setFiles] = useState<FileList | null>(null)
  const createLock = useSubmitLock()
  const distLock = useSubmitLock()
  const delivLock = useSubmitLock()

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

  async function load() {
    setErr(null)
    try {
      const [res, ben, inv] = await Promise.all([
        api.fetchAidRequests({ page: 1 }),
        api.fetchBeneficiaries({ page: 1 }),
        api.fetchInventoryItems({ page: 1 }),
      ])
      setAids((res.data as Record<string, unknown>[]) ?? [])
      setBeneficiaries((ben.data as Record<string, unknown>[]) ?? [])
      setInventoryItems((inv.data as Record<string, unknown>[]) ?? [])
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر التحميل'))
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    await createLock.run(async () => {
      try {
        await api.createAidRequest({
          beneficiary_id: Number(benId),
          type,
          description: desc,
          attachments: files ? Array.from(files) : undefined,
        })
        setMsg('تم إنشاء الطلب.')
        await load()
      } catch (ex) {
        setErr(extractErrorMessage(ex, 'فشل الإنشاء'))
      }
    })
  }

  async function onDist(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    await distLock.run(async () => {
      try {
        await api.postAidInventoryDistribution(Number(aidId), {
          items: [{ inventory_item_id: Number(invId), quantity: Number(qty) }],
        })
        setMsg('تم التوزيع.')
        await load()
      } catch (ex) {
        setErr(extractErrorMessage(ex, 'فشل'))
      }
    })
  }

  async function onDeliv(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    await delivLock.run(async () => {
      try {
        const ids = selectedAllocationIds.map((id) => Number(id)).filter(Boolean)
        await api.confirmAidDelivery(Number(delivAid), { allocation_ids: ids })
        setMsg('تم التسليم.')
        await load()
      } catch (ex) {
        setErr(extractErrorMessage(ex, 'فشل'))
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
        <h2 className="font-semibold text-white">طلبات المساعدة</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[420px] border-collapse text-start text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-black/30 text-[11px] uppercase tracking-wide text-white/45">
                <th className="px-3 py-2 font-semibold">الرقم</th>
                <th className="px-3 py-2 font-semibold">النوع</th>
                <th className="px-3 py-2 font-semibold">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {aids.map((a, idx) => {
                const st = String(a.status ?? '')
                const tp = String((a as { type?: string }).type ?? '')

                return (
                  <tr key={String(a.id)} className={`border-b border-white/[0.06] ${idx % 2 === 0 ? 'bg-black/15' : ''}`}>
                    <td className="whitespace-nowrap px-3 py-2 font-mono tabular-nums text-white">#{String(a.id)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-white/82">{labelAidTypeAr(tp)}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${badgeClassForAidStatus(st)}`}
                      >
                        {labelAidStatusAr(st)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-semibold text-white">طلب مساعدة جديد (نيابة عن مستفيد)</h2>
        <p className="mt-1 text-xs text-white/50">يمكن إرفاق تقارير أو صور (مثلاً وثائق عملية) — حتى 5 ملفات.</p>
        <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={onCreate}>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-white/55">المستفيد</span>
            <select
              className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              value={benId}
              onChange={(e) => setBenId(e.target.value)}
            >
              <option value="">اختر مستفيداً</option>
              {beneficiaries.map((beneficiary) => (
                <option key={String(beneficiary.id)} value={String(beneficiary.id)}>
                  {String(beneficiary.name ?? 'مستفيد')} (#{String(beneficiary.id)})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-white/55">نوع الطلب</span>
            <select
              className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="special_item">مواد أو عينية خاصة</option>
              <option value="surgery">عملية</option>
              <option value="urgent_financial">دعم معيشي عاجل</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-[11px] text-white/55">وصف الحاجة</span>
            <textarea
              className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              rows={2}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-[11px] text-white/55">مرفقات (PDF أو صور)</span>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              className="text-xs text-white/70"
              onChange={(e) => setFiles(e.target.files)}
            />
          </label>
          <SubmitButton busy={createLock.busy} className="rounded-lg bg-emerald-600 py-2.5 font-medium text-white sm:col-span-2">
            إرسال الطلب للمراجعة
          </SubmitButton>
        </form>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-semibold text-white">توزيع مخزون على طلب معتمد</h2>
        <p className="mt-1 text-xs text-white/50">بعد موافقة الإدارة: ربط أصناف من المخزون بالطلب قبل التسليم.</p>
        <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={onDist}>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-white/55">طلب المساعدة</span>
            <select
              className="min-w-[260px] rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
              value={aidId}
              onChange={(e) => setAidId(e.target.value)}
            >
              <option value="">اختر طلب المساعدة</option>
              {aids.map((aid) => (
                <option key={String(aid.id)} value={String(aid.id)}>
                  #{String(aid.id)} — {String(aid.type ?? '—')} — {String(aid.status ?? '—')}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-white/55">صنف المخزون</span>
            <select
              className="min-w-[260px] rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
              value={invId}
              onChange={(e) => setInvId(e.target.value)}
            >
              <option value="">اختر الصنف</option>
              {inventoryItems.map((item) => (
                <option key={String(item.id)} value={String(item.id)}>
                  #{String(item.id)} — {String(item.name ?? 'صنف')} (متبقي: {String(item.quantity_remaining ?? '0')})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-white/55">الكمية</span>
            <input className="w-20 rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white" value={qty} onChange={(e) => setQty(e.target.value)} />
          </label>
          <SubmitButton busy={distLock.busy} className="rounded-lg bg-teal-600 px-4 py-2 text-white">تنفيذ التوزيع</SubmitButton>
        </form>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-semibold text-white">تأكيد تسليم للمستفيد</h2>
        <p className="mt-1 text-xs text-white/50">اختر تخصيصات التوزيع للطلب بعد استلام المستفيد للمواد.</p>
        <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={onDeliv}>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-white/55">الطلب</span>
            <select
              className="min-w-[260px] rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
              value={delivAid}
              onChange={(e) => {
                setDelivAid(e.target.value)
                setSelectedAllocationIds([])
              }}
            >
              <option value="">اختر الطلب</option>
              {aids.map((aid) => (
                <option key={String(aid.id)} value={String(aid.id)}>
                  #{String(aid.id)} — {String(aid.type ?? '—')} — {String(aid.status ?? '—')}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[200px] flex-1 flex-col gap-1">
            <span className="text-[11px] text-white/55">تخصيصات التوزيع</span>
            <select
              multiple
              className="min-h-[110px] rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
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
          </label>
          <SubmitButton busy={delivLock.busy} className="rounded-lg bg-cyan-600 px-4 py-2 text-white">تأكيد التسليم</SubmitButton>
        </form>
      </section>
    </div>
  )
}
