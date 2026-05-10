import { type FormEvent, useEffect, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'

export function VolunteerOpportunitiesPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [regId, setRegId] = useState('')

  async function load() {
    setErr(null)
    try {
      const res = await api.fetchVolunteerOpportunities({ page: 1, status: 'open' })
      setRows((res.data as Record<string, unknown>[]) ?? [])
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر التحميل'))
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function onReg(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    try {
      await api.registerForOpportunity(Number(regId))
      setMsg('تم التسجيل.')
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'فشل التسجيل'))
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
        <h2 className="font-semibold text-white">فرص مفتوحة</h2>
        <ul className="mt-3 space-y-2 text-xs">
          {rows.map((r) => (
            <li key={String(r.id)} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-black/30 px-3 py-2">
              <span>#{String(r.id)} {String(r.title)}</span>
              <button
                type="button"
                onClick={() => {
                  setRegId(String(r.id))
                }}
                className="rounded bg-emerald-600 px-2 py-1 text-white"
              >
                تعيين معرف للتسجيل
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-semibold text-white">التسجيل في فرصة</h2>
        <form className="mt-3 flex gap-2" onSubmit={onReg}>
          <input
            className="w-28 rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            value={regId}
            onChange={(e) => setRegId(e.target.value)}
          />
          <button type="submit" className="rounded-lg bg-emerald-500 px-4 py-2 text-slate-900">
            تسجيل
          </button>
        </form>
      </section>
    </div>
  )
}
