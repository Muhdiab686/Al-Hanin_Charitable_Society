import { useEffect, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'

export function BeneficiaryMedicalPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.fetchMedicalRecords({ page: 1 })
        if (!cancelled) {
          setRows((res.data as Record<string, unknown>[]) ?? [])
        }
      } catch (e) {
        if (!cancelled) {
          setErr(extractErrorMessage(e, 'تعذّر التحميل'))
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="text-sm">
      {err ? <div className="mb-4 rounded-xl bg-red-500/15 px-4 py-3 text-red-100">{err}</div> : null}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-semibold text-white">عرض السجلات (قراءة)</h2>
        <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto text-xs text-white/85">
          {rows.map((r) => (
            <li key={String(r.id)} className="rounded-lg bg-black/30 px-3 py-2">
              #{String(r.id)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
