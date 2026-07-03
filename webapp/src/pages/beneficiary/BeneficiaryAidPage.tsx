import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import { useAuth } from '../../auth/useAuth'
import { badgeClassForAidStatus, labelAidStatusAr, labelAidTypeAr } from '../../lib/operationalLabels'

export function BeneficiaryAidPage() {
  const { user } = useAuth()
  const [aids, setAids] = useState<Record<string, unknown>[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [type, setType] = useState('special_item')
  const [desc, setDesc] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)
  const [receiptPayload, setReceiptPayload] = useState('')
  const [receiptAidRequestId, setReceiptAidRequestId] = useState('')

  const deliveredAllocations = useMemo(() => {
    const rows: Array<{
      aidRequestId: number
      aidType: string
      aidStatus: string
      itemName: string
      quantity: string
      deliveredAt: string
      deliveryNote: string
    }> = []

    aids.forEach((aid) => {
      const allocations = (aid.inventory_allocations as Record<string, unknown>[] | undefined) ?? []
      allocations.forEach((allocation) => {
        if (!allocation.delivered_at) {
          return
        }
        const item = allocation.inventory_item as { item_name?: string; item_code?: string } | undefined
        rows.push({
          aidRequestId: Number(aid.id),
          aidType: String((aid as { type?: string; aid_type?: string }).type ?? (aid as { aid_type?: string }).aid_type ?? ''),
          aidStatus: String(aid.status ?? ''),
          itemName: String(item?.item_name ?? item?.item_code ?? 'مادة'),
          quantity: String(allocation.quantity ?? '—'),
          deliveredAt: String(allocation.delivered_at ?? ''),
          deliveryNote: String(allocation.delivery_note ?? '—'),
        })
      })
    })

    return rows.sort((a, b) => b.deliveredAt.localeCompare(a.deliveredAt))
  }, [aids])

  async function load() {
    setErr(null)
    try {
      const res = await api.fetchAidRequests({ page: 1 })
      setAids((res.data as Record<string, unknown>[]) ?? [])
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر تحميل طلبات المساعدة'))
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)

    if (!user?.beneficiary_id) {
      setErr('لا يوجد رقم مستفيد مرتبط بهذا الحساب.')
      return
    }

    try {
      await api.createAidRequest({
        beneficiary_id: Number(user.beneficiary_id),
        type,
        description: desc,
        attachments: files ? Array.from(files) : undefined,
      })
      setMsg('تم إرسال طلب المساعدة للمراجعة.')
      setDesc('')
      setFiles(null)
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'فشل إرسال الطلب'))
    }
  }

  async function onConfirmReceiptByQr(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    if (!receiptPayload.trim()) {
      setErr('أدخل رمز QR أولاً.')
      return
    }

    try {
      await api.confirmBeneficiaryAidDeliveryByQr({
        payload: receiptPayload.trim(),
        aid_request_id: receiptAidRequestId ? Number(receiptAidRequestId) : undefined,
      })
      setMsg('تم تأكيد استلام المساعدة بنجاح عبر QR.')
      setReceiptPayload('')
      setReceiptAidRequestId('')
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'تعذّر تأكيد الاستلام عبر QR'))
    }
  }

  return (
    <div className="space-y-6 text-sm">
      {(msg || err) && (
        <div className={`rounded-xl px-4 py-3 ${err ? 'bg-red-500/15 text-red-100' : 'bg-emerald-500/15 text-emerald-50'}`}>
          {err ?? msg}
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-semibold text-white">طلب مساعدة جديد</h2>
        <p className="mt-1 text-xs text-white/50">يمكنك إرفاق تقارير أو صور داعمة (حتى 5 ملفات).</p>
        <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={onCreate}>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-white/55">نوع الطلب</span>
            <select
              className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="special_item">مواد أو عينية خاصة</option>
              <option value="medical_prescription">وصفة طبيّة / صرف دوائي</option>
              <option value="urgent_financial">دعم معيشي عاجل</option>
            </select>
          </label>
          <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/60">
            رقم المستفيد المرتبط: <span className="font-mono text-white">{user?.beneficiary_id ?? '—'}</span>
          </div>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-[11px] text-white/55">وصف الحاجة</span>
            <textarea
              className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              rows={2}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="اكتب تفاصيل طلب المساعدة"
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
          <button type="submit" className="rounded-lg bg-emerald-600 py-2.5 font-medium text-white sm:col-span-2">
            إرسال الطلب للمراجعة
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-semibold text-white">تأكيد استلام السلة عبر QR</h2>
        <p className="mt-1 text-xs text-white/50">
          استخدم الرمز الصادر من الجمعية لتأكيد الاستلام من التطبيق. إذا لم يتوفر التطبيق، يستطيع أمين المستودع التأكيد من واجهته.
        </p>
        <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={onConfirmReceiptByQr}>
          <input
            className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white sm:col-span-2"
            placeholder="hanin:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={receiptPayload}
            onChange={(e) => setReceiptPayload(e.target.value)}
          />
          <select
            className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
            value={receiptAidRequestId}
            onChange={(e) => setReceiptAidRequestId(e.target.value)}
          >
            <option value="">اختياري: تحديد طلب مساعدة</option>
            {aids.map((aid) => (
              <option key={String(aid.id)} value={String(aid.id)}>
                #{String(aid.id)} — {labelAidTypeAr(String((aid as { type?: string }).type ?? ''))}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-lg bg-sky-700 py-2.5 font-medium text-white">
            تأكيد الاستلام
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-semibold text-white">طلبات المساعدة الخاصة بك</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[520px] border-collapse text-start text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-black/30 text-[11px] uppercase tracking-wide text-white/45">
                <th className="px-3 py-2 font-semibold">الرقم</th>
                <th className="px-3 py-2 font-semibold">النوع</th>
                <th className="px-3 py-2 font-semibold">الحالة</th>
                <th className="px-3 py-2 font-semibold">الوصف</th>
              </tr>
            </thead>
            <tbody>
              {aids.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-white/50">
                    لا توجد طلبات مساعدة بعد.
                  </td>
                </tr>
              ) : (
                aids.map((aid, idx) => {
                  const status = String(aid.status ?? '')
                  const aidType = String((aid as { type?: string; aid_type?: string }).type ?? (aid as { aid_type?: string }).aid_type ?? '')
                  return (
                    <tr key={String(aid.id)} className={`border-b border-white/[0.06] ${idx % 2 === 0 ? 'bg-black/15' : ''}`}>
                      <td className="whitespace-nowrap px-3 py-2 font-mono tabular-nums text-white">#{String(aid.id)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-white/82">{labelAidTypeAr(aidType)}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${badgeClassForAidStatus(status)}`}>
                          {labelAidStatusAr(status)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-white/75">{String(aid.description ?? '—')}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-semibold text-white">سجل المساعدات المستلمة</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[720px] border-collapse text-start text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-black/30 text-[11px] uppercase tracking-wide text-white/45">
                <th className="px-3 py-2 font-semibold">طلب</th>
                <th className="px-3 py-2 font-semibold">نوع المساعدة</th>
                <th className="px-3 py-2 font-semibold">المادة</th>
                <th className="px-3 py-2 font-semibold">الكمية</th>
                <th className="px-3 py-2 font-semibold">التسليم</th>
                <th className="px-3 py-2 font-semibold">ملاحظة</th>
              </tr>
            </thead>
            <tbody>
              {deliveredAllocations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-white/50">
                    لا يوجد تسليمات مؤكدة بعد.
                  </td>
                </tr>
              ) : (
                deliveredAllocations.map((row, idx) => (
                  <tr key={`${row.aidRequestId}-${idx}`} className={`border-b border-white/[0.06] ${idx % 2 === 0 ? 'bg-black/15' : ''}`}>
                    <td className="px-3 py-2 font-mono text-white">#{row.aidRequestId}</td>
                    <td className="px-3 py-2">{labelAidTypeAr(row.aidType)} — {labelAidStatusAr(row.aidStatus)}</td>
                    <td className="px-3 py-2">{row.itemName}</td>
                    <td className="px-3 py-2">{row.quantity}</td>
                    <td className="px-3 py-2">{row.deliveredAt.replace('T', ' ').slice(0, 19)}</td>
                    <td className="px-3 py-2 text-white/70">{row.deliveryNote}</td>
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
