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
      setMsg('تمت المراجعة.')
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
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white">طلبات صرف الأطباء</h2>
        <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-xs">
          {rows.map((r) => (
            <li key={String(r.id)} className="rounded-lg bg-black/30 px-3 py-2">
              #{String(r.id)} {String(r.status ?? '')}
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white">مراجعة طلب (موافقة / رفض)</h2>
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={onReview}>
          <input
            className="w-24 rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            value={reviewId}
            onChange={(e) => setReviewId(e.target.value)}
          />
          <select
            className="rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
          >
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
          </select>
          <input
            className="min-w-[200px] flex-1 rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            placeholder="ملاحظة"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button type="submit" className="rounded-lg bg-amber-600 px-4 py-2 text-white">
            إرسال
          </button>
        </form>
      </section>
    </div>
  )
}
