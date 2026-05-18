import { type FormEvent, useEffect, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import { labelAidTypeAr } from '../../lib/operationalLabels'

export function DonorUrgentAidPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [donateId, setDonateId] = useState<number | null>(null)
  const [amount, setAmount] = useState('50')

  async function load() {
    setErr(null)
    try {
      const res = await api.fetchPublishedAidRequests({ page: 1 })
      setRows((res.data as Record<string, unknown>[]) ?? [])
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر تحميل طلبات المساعدة الطارئة'))
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function onDonate(e: FormEvent, row: Record<string, unknown>) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    const id = Number(row.id)
    try {
      await api.createDonation({
        type: 'cash',
        channel: 'donor_portal',
        cash_amount: Number(amount),
        purpose: `طوارئ-مساعدة:#${id}`,
        donor_name: 'متبرع بالمنصّة',
        notes: `تبرع لحالة طارئة منشورة: ${String(row.public_title ?? '')}`,
      })
      setMsg('شكراً — تم تسجيل تبرعك لهذه الحالة الطارئة.')
      setDonateId(null)
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'فشل تسجيل التبرع'))
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
        <h2 className="text-base font-semibold text-white">طلبات مساعدة طارئة (من الجمعية)</h2>
        <p className="mt-1 text-xs text-white/55">
          حالات اعتمدتها الإدارة ونُشرت للمتبرعين — بدون بيانات شخصية حساسة. الطلبات المرفوضة لا تظهر هنا.
        </p>
        <ul className="mt-4 space-y-3">
          {rows.length === 0 ? (
            <li className="text-white/50">لا توجد حالات منشورة حالياً.</li>
          ) : (
            rows.map((r) => (
              <li key={String(r.id)} className="rounded-xl border border-white/10 bg-black/25 p-4">
                <p className="font-semibold text-white">{String(r.public_title ?? '—')}</p>
                <p className="mt-1 text-xs text-white/65">{String(r.public_summary ?? '')}</p>
                <p className="mt-2 text-[11px] text-white/45">
                  النوع: {labelAidTypeAr(r.type)}
                  {(r.requested_amount as string | number | null) != null && (
                    <> — المبلغ المطلوب تقريباً: {String(r.requested_amount)}</>
                  )}
                </p>
                {donateId === Number(r.id) ? (
                  <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={(e) => void onDonate(e, r)}>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-white/55">مبلغ التبرع (ل.س)</span>
                      <input
                        className="w-28 rounded-lg border border-white/15 bg-slate-950/50 px-2 py-2 text-white"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </label>
                    <button type="submit" className="rounded-lg bg-rose-600 px-4 py-2 text-white">
                      تأكيد التبرع
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-white/20 px-3 py-2 text-white/80"
                      onClick={() => setDonateId(null)}
                    >
                      إلغاء
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="mt-3 rounded-lg bg-rose-600/90 px-4 py-2 text-xs font-medium text-white"
                    onClick={() => setDonateId(Number(r.id))}
                  >
                    التبرع لهذه الحالة
                  </button>
                )}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  )
}
