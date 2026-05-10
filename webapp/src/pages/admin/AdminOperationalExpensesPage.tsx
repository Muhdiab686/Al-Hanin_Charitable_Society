import { type FormEvent, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'

/** تسجيل مصروفات وفواتير يدوياً مع ربطها بالدفتر المالي. */
export function AdminOperationalExpensesPage() {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [invoiceRef, setInvoiceRef] = useState('')
  const [vendor, setVendor] = useState('')
  const [notes, setNotes] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    try {
      await api.createOperationalExpense({
        amount: Number(amount),
        description: description.trim() || undefined,
        invoice_reference: invoiceRef.trim() || undefined,
        vendor: vendor.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      setMsg('تم تسجيل المصروف وربطه بالدفتر المالي.')
      setAmount('')
      setDescription('')
      setInvoiceRef('')
      setVendor('')
      setNotes('')
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'فشل تسجيل المصروف'))
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 text-sm">
      <header>
        <h2 className="text-xl font-bold text-white">المصروفات والفواتير</h2>
        <p className="mt-1 text-white/65">كل عملية تصبح حركة «صادر» في سجل المعاملات ويمكن تدقيقها لاحقاً.</p>
      </header>
      {(msg || err) && (
        <div className={`rounded-xl px-4 py-3 ${err ? 'bg-red-500/15 text-red-100' : 'bg-emerald-500/15 text-emerald-50'}`}>{err ?? msg}</div>
      )}
      <form className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6" onSubmit={onSubmit}>
        <label className="block space-y-1">
          <span className="text-xs text-white/65">المبلغ</span>
          <input
            required
            className="w-full rounded-lg border border-white/15 bg-black/35 px-3 py-2 text-white"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-white/65">البيّنة / الوصف</span>
          <input
            className="w-full rounded-lg border border-white/15 bg-black/35 px-3 py-2 text-white"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="سبب الشراء أو طبيعة المصروف"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-white/65">رقم الفاتورة</span>
          <input className="w-full rounded-lg border border-white/15 bg-black/35 px-3 py-2 text-white" value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-white/65">المورد</span>
          <input className="w-full rounded-lg border border-white/15 bg-black/35 px-3 py-2 text-white" value={vendor} onChange={(e) => setVendor(e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-white/65">ملاحظات داخلية</span>
          <textarea className="min-h-[88px] w-full rounded-lg border border-white/15 bg-black/35 px-3 py-2 text-white" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <button type="submit" className="w-full rounded-xl bg-indigo-500 py-3 font-semibold text-white hover:bg-indigo-400">
          حفظ في الدفتر
        </button>
      </form>
    </div>
  )
}
