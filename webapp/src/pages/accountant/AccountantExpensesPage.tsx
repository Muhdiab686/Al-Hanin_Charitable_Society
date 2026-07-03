import { type FormEvent, useEffect, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'

export function AccountantExpensesPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [prescriptionRows, setPrescriptionRows] = useState<Record<string, unknown>[]>([])
  const [campaigns, setCampaigns] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [vendor, setVendor] = useState('')
  const [invoiceRef, setInvoiceRef] = useState('')
  const [campaignId, setCampaignId] = useState('')
  const [disburseNote, setDisburseNote] = useState('')

  async function load() {
    setLoading(true)
    setErr(null)
    try {
      const [res, prescriptions] = await Promise.all([
        api.fetchOperationalExpenses({ page: 1 }),
        api.fetchMedicalPrescriptionRequests({ page: 1, workflow_status: 'approved_by_secretary' }),
      ])
      setRows((res.data as Record<string, unknown>[]) ?? [])
      setPrescriptionRows((prescriptions.data as Record<string, unknown>[]) ?? [])
      try {
        const campaignRes = await api.fetchCampaigns()
        setCampaigns((campaignRes.data as Record<string, unknown>[]) ?? [])
      } catch {
        setCampaigns([])
      }
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر تحميل المصروفات'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    try {
      await api.createOperationalExpense({
        amount: Number(amount),
        description: description.trim() || undefined,
        vendor: vendor.trim() || undefined,
        invoice_reference: invoiceRef.trim() || undefined,
        campaign_id: campaignId ? Number(campaignId) : undefined,
      })
      setMsg('تم تسجيل المصروف التشغيلي بنجاح.')
      setAmount('')
      setDescription('')
      setVendor('')
      setInvoiceRef('')
      setCampaignId('')
      await load()
    } catch (e) {
      setErr(extractErrorMessage(e, 'فشل تسجيل المصروف'))
    }
  }

  async function onDisbursePrescription(recordId: number) {
    setErr(null)
    setMsg(null)
    try {
      await api.disburseMedicalPrescription(recordId, {
        notes: disburseNote.trim() || null,
      })
      setMsg('تم صرف تكلفة الوصفة وإيداعها بمحفظة المستفيد.')
      await load()
    } catch (e) {
      setErr(extractErrorMessage(e, 'فشل صرف الوصفة'))
    }
  }

  return (
    <div className="space-y-6 text-sm text-white/85">
      {(msg || err) && (
        <div
          className={`fixed inset-x-4 top-4 z-50 mx-auto max-w-lg rounded-xl px-4 py-3 shadow-lg ${err ? 'border border-red-400/35 bg-red-600/90 text-red-50' : 'border border-emerald-400/35 bg-emerald-600/90 text-emerald-50'}`}
        >
          {err ?? msg}
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white">المصروفات التشغيلية</h2>
        <p className="mt-1 text-xs text-white/55">تسجيل فواتير التشغيل والمصاريف الإدارية للجمعية.</p>

        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
          <input
            className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
            placeholder="المبلغ"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <input
            className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
            placeholder="المورّد / الجهة"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
          />
          <input
            className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
            placeholder="مرجع الفاتورة"
            value={invoiceRef}
            onChange={(e) => setInvoiceRef(e.target.value)}
          />
          <select
            className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
          >
            <option value="">مصروف تشغيلي عام (بدون حملة)</option>
            {campaigns.map((campaign) => (
              <option key={String(campaign.id)} value={String(campaign.id)}>
                {String(campaign.title ?? `حملة #${String(campaign.id)}`)}
              </option>
            ))}
          </select>
          <input
            className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white md:col-span-2"
            placeholder="الوصف"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button
            type="submit"
            className="rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white transition active:scale-[0.98] hover:bg-amber-600 md:col-span-2"
          >
            تسجيل مصروف
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="font-semibold text-white">صرف الوصفات المعتمدة</h3>
        <p className="mt-1 text-xs text-white/55">
          تظهر هنا فقط الوصفات التي وافق عليها أمين السر. عند الضغط على "صرف"، يتم تحويل التكلفة لمحفظة المستفيد وإغلاق الطلب.
        </p>
        <input
          className="mt-3 w-full rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
          placeholder="ملاحظة صرف (اختياري)"
          value={disburseNote}
          onChange={(e) => setDisburseNote(e.target.value)}
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[680px] text-xs">
            <thead>
              <tr className="border-b border-white/10 text-white/60">
                <th className="px-2 py-2 text-start"># السجل</th>
                <th className="px-2 py-2 text-start">المستفيد</th>
                <th className="px-2 py-2 text-start">الطبيب</th>
                <th className="px-2 py-2 text-start">قيمة الوصفة</th>
                <th className="px-2 py-2 text-start">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {prescriptionRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center text-white/50">
                    لا توجد وصفات معتمدة بانتظار الصرف.
                  </td>
                </tr>
              ) : (
                prescriptionRows.map((row) => (
                  <tr key={String(row.id)} className="border-b border-white/5">
                    <td className="px-2 py-2">#{String(row.id)}</td>
                    <td className="px-2 py-2">{String((row.beneficiary as { name?: string } | undefined)?.name ?? '—')}</td>
                    <td className="px-2 py-2">{String((row.doctor as { name?: string } | undefined)?.name ?? '—')}</td>
                    <td className="px-2 py-2 font-mono">{String(row.prescription_cost ?? '—')}</td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => void onDisbursePrescription(Number(row.id))}
                        className="rounded-lg bg-emerald-700 px-3 py-1.5 text-[11px] text-white"
                      >
                        صرف
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
        <h3 className="font-semibold text-white">سجل المصروفات</h3>
        {loading ? <p className="mt-3 text-white/60">جاري التحميل…</p> : null}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10 text-white/60">
                <th className="px-2 py-2 text-start">#</th>
                <th className="px-2 py-2 text-start">المبلغ</th>
                <th className="px-2 py-2 text-start">الوصف</th>
                <th className="px-2 py-2 text-start">الحملة</th>
                <th className="px-2 py-2 text-start">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={String(row.id)} className="border-b border-white/5">
                  <td className="px-2 py-2">{String(row.id)}</td>
                  <td className="px-2 py-2">{String(row.amount ?? '—')}</td>
                  <td className="px-2 py-2">{String(row.description ?? '—')}</td>
                  <td className="px-2 py-2">
                    {(() => {
                      const reference = row.reference as { campaign_id?: number | null } | undefined
                      if (!reference?.campaign_id) {
                        return '—'
                      }
                      const campaign = campaigns.find((item) => Number(item.id) === Number(reference.campaign_id))
                      return campaign ? String(campaign.title ?? `#${String(reference.campaign_id)}`) : `#${String(reference.campaign_id)}`
                    })()}
                  </td>
                  <td className="px-2 py-2">{String(row.recorded_at ?? '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
