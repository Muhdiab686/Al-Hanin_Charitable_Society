import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'

type PayoutRow = {
  id: number
  status: string
  amount: string | number
  consultations_count?: number
  base_salary_amount?: string | number
  consultation_fee_amount?: string | number
  consultations_amount?: string | number
}

export function AccountantPayoutsPage() {
  const [rows, setRows] = useState<PayoutRow[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [reviewId, setReviewId] = useState('')
  const [decision, setDecision] = useState('approved')
  const [note, setNote] = useState('')

  async function load() {
    setErr(null)
    try {
      const res = await api.fetchDoctorPayoutRequests({ page: 1, status: 'pending' })
      setRows((res.data as PayoutRow[]) ?? [])
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر التحميل'))
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const reviewOptions = useMemo(
    () =>
      rows.map((row) => ({
        id: String(row.id),
        label: `#${String(row.id)} — مبلغ ${String(row.amount ?? '—')}`,
      })),
    [rows],
  )

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
              <div>
                #{String(r.id)} — مبلغ {String(r.amount ?? '—')}
              </div>
              <div className="mt-1 text-[11px] text-white/70">
                الراتب {String(r.base_salary_amount ?? '0')} + ({String(r.consultations_count ?? 0)} ×{' '}
                {String(r.consultation_fee_amount ?? '0')}) = {String(r.consultations_amount ?? '0')} — الإجمالي{' '}
                {String(r.amount ?? '0')}
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white">مراجعة طلب صرف</h2>
        <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={onReview}>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-white/55">الطلب</span>
            <select
              className="min-w-[280px] rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 font-mono text-white"
              value={reviewId}
              onChange={(e) => setReviewId(e.target.value)}
            >
              <option value="">اختر طلب صرف</option>
              {reviewOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
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
