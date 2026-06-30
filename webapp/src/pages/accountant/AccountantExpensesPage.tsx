import { type FormEvent, useEffect, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'

export function AccountantExpensesPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [vendor, setVendor] = useState('')
  const [invoiceRef, setInvoiceRef] = useState('')

  async function load() {
    setLoading(true)
    setErr(null)
    try {
      const res = await api.fetchOperationalExpenses({ page: 1 })
      setRows((res.data as Record<string, unknown>[]) ?? [])
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
      })
      setMsg('تم تسجيل المصروف التشغيلي بنجاح.')
      setAmount('')
      setDescription('')
      setVendor('')
      setInvoiceRef('')
      await load()
    } catch (e) {
      setErr(extractErrorMessage(e, 'فشل تسجيل المصروف'))
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
        <h3 className="font-semibold text-white">سجل المصروفات</h3>
        {loading ? <p className="mt-3 text-white/60">جاري التحميل…</p> : null}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10 text-white/60">
                <th className="px-2 py-2 text-start">#</th>
                <th className="px-2 py-2 text-start">المبلغ</th>
                <th className="px-2 py-2 text-start">الوصف</th>
                <th className="px-2 py-2 text-start">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={String(row.id)} className="border-b border-white/5">
                  <td className="px-2 py-2">{String(row.id)}</td>
                  <td className="px-2 py-2">{String(row.amount ?? '—')}</td>
                  <td className="px-2 py-2">{String(row.description ?? '—')}</td>
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
