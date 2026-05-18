import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
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

export function SecretaryAidPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [reviewId, setReviewId] = useState('')
  const [decision, setDecision] = useState('approved')
  const [note, setNote] = useState('')
  const [publishId, setPublishId] = useState('')
  const [pubTitle, setPubTitle] = useState('')
  const [pubSummary, setPubSummary] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const res = await api.fetchAidRequests({ page })
      setRows((res.data as Record<string, unknown>[]) ?? [])
      setLastPage(Math.max(1, res.last_page))
      setTotal(res.total ?? 0)
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر التحميل'))
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    void load()
  }, [load])

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

  async function onReview(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    try {
      await api.reviewAidRequest(Number(reviewId), { decision, review_note: note || null })
      setMsg('تمت المراجعة.')
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'فشلت المراجعة'))
    }
  }

  return (
    <div className="space-y-6 text-sm">
      {(msg || err) && (
        <div
          className={`rounded-xl px-4 py-3 ${err ? 'bg-red-500/15 text-red-100' : 'bg-emerald-500/15 text-emerald-50'}`}
        >
          {err ?? msg}
        </div>
      )}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">طلبات المساعدة</h2>
            <p className="mt-1 text-xs text-white/50">
              {total > 0 ? (
                <>
                  إجمالي {total} طلباً — عرض الصفحة {page} من {lastPage}
                </>
              ) : loading ? null : (
                <>لا طلبات في هذه الصفحة.</>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs disabled:opacity-40"
            >
              السابق
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              disabled={page >= lastPage || loading}
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
                <th className="whitespace-nowrap px-3 py-2.5 font-semibold">الرقم</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-semibold">المستفيد</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-semibold">نوع الطلب</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-semibold">الحالة</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-semibold">للمتبرعين</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-white/55">
                    جاري التحميل…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-white/50">
                    لا بيانات لعرضها.
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => {
                  const st = String(r.status ?? '')
                  const tp = String((r as { type?: string }).type ?? '')

                  return (
                    <tr
                      key={String(r.id)}
                      className={`border-b border-white/[0.06] ${idx % 2 === 0 ? 'bg-black/15' : 'bg-transparent'}`}
                    >
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[13px] tabular-nums text-white">
                        #{String(r.id)}
                      </td>
                      <td className="max-w-[220px] truncate px-3 py-2.5 text-white/88">{beneficiaryLabel(r)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-white/82">{labelAidTypeAr(tp)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${badgeClassForAidStatus(st)}`}
                        >
                          {labelAidStatusAr(st)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[11px] text-white/65">
                        {r.published_for_donors_at ? 'منشور' : st === 'approved' ? 'جاهز للنشر' : '—'}
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
        <p className="mt-1 text-xs text-white/48">أدخل رقم الطلب ثم اختر القرار والملاحظات إن وجدت.</p>
        <form className="mt-4 flex flex-wrap items-end gap-2" onSubmit={onReview}>
          <input
            className="w-24 rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 font-mono text-white"
            placeholder="رقم الطلب"
            value={reviewId}
            onChange={(e) => setReviewId(e.target.value)}
          />
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
          <button type="submit" className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white">
            إرسال القرار
          </button>
        </form>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white">نشر حالة طارئة للمتبرعين</h2>
        <p className="mt-1 text-xs text-white/48">
          بعد اعتماد الطلب فقط — يظهر للمتبرعين بدون بيانات شخصية. الطلبات المرفوضة لا تُنشر.
        </p>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={onPublish}>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-white/55">رقم الطلب المعتمد</span>
            <input
              className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 font-mono text-white"
              value={publishId}
              onChange={(e) => setPublishId(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-[11px] text-white/55">عنوان عام للمتبرعين</span>
            <input
              className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              value={pubTitle}
              onChange={(e) => setPubTitle(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-[11px] text-white/55">ملخص الحالة (بدون أسماء أو تفاصيل حساسة)</span>
            <textarea
              className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              rows={3}
              value={pubSummary}
              onChange={(e) => setPubSummary(e.target.value)}
            />
          </label>
          <button type="submit" className="rounded-lg bg-rose-600 px-4 py-2.5 font-medium text-white sm:col-span-2">
            نشر للمتبرعين
          </button>
        </form>
      </section>
    </div>
  )
}
