import { useEffect, useMemo, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import { useAuth } from '../../auth/useAuth'

export function DoctorMedicalPage() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState<Record<string, unknown>[]>([])
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPatientDialog, setShowPatientDialog] = useState(false)
  const [activeBeneficiaryId, setActiveBeneficiaryId] = useState<number | null>(null)
  const [activeBeneficiaryName, setActiveBeneficiaryName] = useState<string>('')

  const myPatients = useMemo(() => {
    const seen = new Map<number, string>()
    for (const appt of appointments) {
      const doctor = appt.doctor as { id?: number } | undefined
      if (doctor?.id !== user?.id) {
        continue
      }
      const ben = appt.beneficiary as { id?: number; name?: string } | undefined
      if (ben?.id && !seen.has(ben.id)) {
        seen.set(ben.id, ben.name ?? `#${ben.id}`)
      }
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }))
  }, [appointments, user?.id])

  async function loadAppointments() {
    setErr(null)
    setLoading(true)
    try {
      const res = await api.fetchAppointments({ page: 1 })
      setAppointments((res.data as Record<string, unknown>[]) ?? [])
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر تحميل المواعيد'))
    } finally {
      setLoading(false)
    }
  }

  async function loadHistoryForBeneficiary(id: number, name: string) {
    setErr(null)
    setLoading(true)
    try {
      const res = await api.fetchMedicalRecords({
        page: 1,
        beneficiary_id: id,
      })
      setRows((res.data as Record<string, unknown>[]) ?? [])
      setActiveBeneficiaryId(id)
      setActiveBeneficiaryName(name)
      setShowPatientDialog(false)
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر تحميل السجل الطبي'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAppointments()
  }, [])

  return (
    <div className="space-y-6 text-sm">
      {err ? <div className="rounded-xl bg-red-500/15 px-4 py-3 text-red-100">{err}</div> : null}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-white">السجل الطبي الكامل للمريض</h2>
            <p className="mt-1 text-[12px] text-white/60">اختر مريضاً من قائمة مرضاك لعرض كامل السجل الطبي الخاص به.</p>
          </div>
          <button type="button" onClick={() => setShowPatientDialog(true)} className="rounded-lg bg-cyan-600 px-3 py-2 text-xs text-white">
            اختيار مريض
          </button>
        </div>
        {activeBeneficiaryId ? (
          <p className="mt-3 text-xs text-cyan-100">
            المريض النشط: {activeBeneficiaryName} <span className="font-mono">#{activeBeneficiaryId}</span>
          </p>
        ) : null}
        <div className="mt-3 max-h-[60vh] overflow-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[740px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-black/35 text-[10px] uppercase text-white/45">
                <th className="px-3 py-2 text-start font-semibold">التاريخ</th>
                <th className="px-3 py-2 text-start font-semibold">التشخيص</th>
                <th className="px-3 py-2 text-start font-semibold">التحاليل</th>
                <th className="px-3 py-2 text-start font-semibold">الوصفة</th>
                <th className="px-3 py-2 text-start font-semibold">الملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-white/45">
                    جاري التحميل...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-white/45">
                    لا يوجد سجل طبي للعرض.
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => (
                  <tr key={String(r.id)} className={`border-b border-white/[0.06] ${idx % 2 === 0 ? 'bg-black/12' : ''}`}>
                    <td className="whitespace-nowrap px-3 py-2">{String(r.recorded_at ?? '—')}</td>
                    <td className="max-w-[16rem] truncate px-3 py-2">{String(r.diagnosis ?? '—')}</td>
                    <td className="max-w-[16rem] truncate px-3 py-2">{String(r.tests_result ?? '—')}</td>
                    <td className="max-w-[16rem] truncate px-3 py-2">{String(r.prescription ?? '—')}</td>
                    <td className="max-w-[16rem] truncate px-3 py-2">{String(r.notes ?? '—')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showPatientDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-cyan-300/25 bg-slate-950 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">اختيار مريض من مواعيدي</h3>
              <button
                type="button"
                onClick={() => setShowPatientDialog(false)}
                className="rounded-lg border border-white/20 px-3 py-1 text-xs text-white"
              >
                إغلاق
              </button>
            </div>
            <div className="max-h-[50vh] overflow-auto rounded-xl border border-white/[0.06]">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-black/35 text-[10px] uppercase text-white/45">
                    <th className="px-3 py-2 text-start font-semibold">المريض</th>
                    <th className="px-3 py-2 text-start font-semibold">#</th>
                    <th className="px-3 py-2 text-start font-semibold">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {myPatients.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-8 text-center text-white/45">
                        لا توجد بيانات مرضى مرتبطة بمواعيدك.
                      </td>
                    </tr>
                  ) : (
                    myPatients.map((p, idx) => (
                      <tr key={p.id} className={`border-b border-white/[0.06] ${idx % 2 === 0 ? 'bg-black/12' : ''}`}>
                        <td className="px-3 py-2">{p.name}</td>
                        <td className="px-3 py-2 font-mono">#{p.id}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => void loadHistoryForBeneficiary(p.id, p.name)}
                            className="rounded-md bg-cyan-600 px-2 py-1 text-[11px] text-white"
                          >
                            عرض السجل
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
