import { useEffect, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'

function formatDate(value: unknown): string {
  if (!value) return ''
  const d = new Date(String(value))
  if (isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('ar-SY', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function VolunteerOpportunitiesPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

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

  async function onRegister(opportunityId: number) {
    setMsg(null)
    setErr(null)
    setBusyId(opportunityId)
    try {
      await api.registerForOpportunity(opportunityId)
      setMsg('تم التسجيل بنجاح في الفرصة.')
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'فشل التسجيل'))
    } finally {
      setBusyId(null)
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
        <h2 className="text-base font-semibold text-white">فرص التطوع المتاحة</h2>
        {rows.length === 0 && (
          <p className="mt-4 text-center text-xs text-white/45">لا توجد فرص مفتوحة حالياً.</p>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {rows.map((r) => {
            const id = Number(r.id)
            const remaining = Number(r.required_slots ?? 0) - Number(r.filled_slots ?? 0)
            return (
              <div
                key={id}
                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/30 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-white">{String(r.title)}</h3>
                  <span className="shrink-0 rounded-full bg-emerald-600/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                    مفتوحة
                  </span>
                </div>

                {r.description && (
                  <p className="text-xs leading-relaxed text-white/65">{String(r.description)}</p>
                )}

                <div className="grid grid-cols-2 gap-2 text-[11px] text-white/55">
                  <div>
                    <span className="font-medium text-white/75">تاريخ البدء:</span>{' '}
                    {formatDate(r.starts_at)}
                  </div>
                  {r.ends_at && (
                    <div>
                      <span className="font-medium text-white/75">تاريخ الانتهاء:</span>{' '}
                      {formatDate(r.ends_at)}
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-white/75">الأماكن المطلوبة:</span>{' '}
                    {String(r.required_slots ?? 0)}
                  </div>
                  <div>
                    <span className="font-medium text-white/75">الأماكن المتبقية:</span>{' '}
                    {remaining > 0 ? remaining : 'مكتملة'}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={busyId === id || remaining <= 0}
                  onClick={() => void onRegister(id)}
                  className="mt-auto self-start rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {busyId === id ? 'جارٍ التسجيل...' : 'تسجيل في هذه الفرصة'}
                </button>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
