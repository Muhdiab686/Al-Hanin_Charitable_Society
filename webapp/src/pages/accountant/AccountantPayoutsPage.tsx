import { type FormEvent, useEffect, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'

export function AccountantPayoutsPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [reviewId, setReviewId] = useState('')
  const [decision, setDecision] = useState('approved')
  const [note, setNote] = useState('')

  async function load() {
    setErr(null)
    try {
      const res = await api.fetchDoctorPayoutRequests({ page: 1 })
      setRows((res.data as Record<string, unknown>[]) ?? [])
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر التحميل'))
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function onReview(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    try {
      await api.reviewDoctorPayoutRequest(Number(reviewId), {
        decision,
        review_note: note || null,
      })
      setMsg('تمت المراجعة — عند الموافقة يُسجّل مصروف في الدفتر المالي.')
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'فشل'))
    }
  }

  return (
    <div className="space-y-6 text-sm">
      {(msg || err) && (
        <div className={`rounded-xl px-4 py-3 ${err ? 'bg-red-500/15 text-red-100' : 'bg-emerald-500/15 text-emerald-50'}`}>
          {err ?? msg}
        </div>
      )}
      <section className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-xs text-amber-50/90">
        <strong>صرف الأطباء:</strong> الطبيب يقدّم طلباً يجمع الراتب الشهري من ملف العيادة + أجور الاستشارات
        للمواعيد المنجزة. الموافقة تُسجّل مصروفاً مالياً.{' '}
        <strong>رواتب باقي الموظفين</strong> (أمين السر، المستودع…) تُدار عبر «المصروفات التشغيلية» وليست ضمن هذه الشاشة.
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white">طلبات صرف الأطباء</h2>
        <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-xs">
          {rows.map((r) => (
            <li key={String(r.id)} className="rounded-lg bg-black/30 px-3 py-2">
              #{String(r.id)} — {String(r.status ?? '')} — مبلغ {String(r.amount ?? '—')}
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white">مراجعة طلب صرف</h2>
        <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={onReview}>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-white/55">رقم الطلب</span>
            <input
              className="w-28 rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 font-mono text-white"
              value={reviewId}
              onChange={(e) => setReviewId(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-white/55">القرار</span>
            <select
              className="rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
            >
              <option value="approved">موافقة</option>
              <option value="rejected">رفض</option>
            </select>
          </label>
          <label className="flex min-w-[200px] flex-1 flex-col gap-1">
            <span className="text-[11px] text-white/55">ملاحظة المراجعة</span>
            <input
              className="rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <button type="submit" className="rounded-lg bg-amber-600 px-4 py-2 text-white">
            إرسال القرار
          </button>
        </form>
      </section>
    </div>
  )
}
