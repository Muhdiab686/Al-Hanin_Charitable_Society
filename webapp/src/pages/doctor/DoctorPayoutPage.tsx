import { type FormEvent, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'

export function DoctorPayoutPage() {
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [start, setStart] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().slice(0, 10)
  })
  const [end, setEnd] = useState(() => new Date().toISOString().slice(0, 10))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    try {
      await api.createDoctorPayoutRequest({
        period_start: start,
        period_end: end,
      })
      setMsg('تم إنشاء طلب الصرف.')
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
        <h2 className="font-semibold text-white">طلب صرف (فترة)</h2>
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={onSubmit}>
          <label className="text-white/70">
            من
            <input
              type="date"
              className="mt-1 block rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label className="text-white/70">
            إلى
            <input
              type="date"
              className="mt-1 block rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
          <button type="submit" className="rounded-lg bg-cyan-600 px-4 py-2 text-white">
            إرسال الطلب
          </button>
        </form>
      </section>
    </div>
  )
}
