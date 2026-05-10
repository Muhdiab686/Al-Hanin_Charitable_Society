import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import { useAuth } from '../../auth/useAuth'

function statusAr(s: string): string {
  if (s === 'scheduled') {
    return 'مجدول'
  }
  if (s === 'completed') {
    return 'مكتمل'
  }
  if (s === 'cancelled') {
    return 'ملغي'
  }

  return s
}

export function DoctorAppointmentsPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')

  const [showExamDialog, setShowExamDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Record<string, unknown> | null>(null)
  const [historyRows, setHistoryRows] = useState<Record<string, unknown>[]>([])

  const [diagnosis, setDiagnosis] = useState('')
  const [labRequest, setLabRequest] = useState('')
  const [prescription, setPrescription] = useState('')
  const [prescriptionCost, setPrescriptionCost] = useState('')
  const [notes, setNotes] = useState('')

  const mine = useMemo(() => {
    return rows.filter((row) => {
      const doctor = row.doctor as { id?: number } | undefined
      return doctor?.id === user?.id
    })
  }, [rows, user?.id])

  async function loadAppointments() {
    setLoading(true)
    setErr(null)
    try {
      const res = await api.fetchAppointments({
        page: 1,
        status: statusFilter || undefined,
      })
      setRows((res.data as Record<string, unknown>[]) ?? [])
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر تحميل المواعيد'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAppointments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  async function loadFullHistoryForBeneficiary(beneficiaryId: number) {
    setErr(null)
    try {
      const res = await api.fetchMedicalRecords({
        page: 1,
        beneficiary_id: beneficiaryId,
      })
      setHistoryRows((res.data as Record<string, unknown>[]) ?? [])
      setShowHistoryDialog(true)
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر تحميل السجل الطبي'))
    }
  }

  function openExamDialog(appt: Record<string, unknown>) {
    setSelectedAppointment(appt)
    setDiagnosis('')
    setLabRequest('')
    setPrescription('')
    setPrescriptionCost('')
    setNotes('')
    setShowExamDialog(true)
  }

  async function onSubmitExam(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    setMsg(null)

    if (!selectedAppointment) {
      setErr('اختر موعداً أولاً.')
      return
    }

    try {
      await api.createMedicalRecord({
        clinic_appointment_id: Number(selectedAppointment.id),
        diagnosis: diagnosis.trim(),
        tests_result: labRequest.trim() ? `طلب تحليل: ${labRequest.trim()}` : null,
        prescription: prescription.trim() ? prescription.trim() : null,
        prescription_cost: prescriptionCost.trim() ? Number(prescriptionCost) : null,
        notes: notes.trim() ? notes.trim() : null,
      })
      setMsg('تم حفظ نتيجة الفحص والتشخيص والوصفة.')
      setShowExamDialog(false)
      await loadAppointments()
    } catch (e) {
      setErr(extractErrorMessage(e, 'فشل حفظ نتيجة الفحص'))
    }
  }

  return (
    <div className="space-y-6 text-sm text-white/82">
      {(msg || err) && (
        <div
          className={`rounded-xl px-4 py-3 ${err ? 'border border-red-400/35 bg-red-500/12 text-red-50' : 'border border-emerald-400/35 bg-emerald-500/12 text-emerald-50'}`}
        >
          {err ?? msg}
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-white">الفحص والمواعيد</h2>
            <p className="mt-1 text-[12px] text-white/55">من هذه الصفحة: إجراء الفحص، تسجيل التشخيص، طلب تحليل، وإصدار وصفة.</p>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-white/15 bg-slate-950/45 px-2 py-1.5 text-xs text-white"
            >
              <option value="">كل الحالات</option>
              <option value="scheduled">مجدولة</option>
              <option value="completed">مكتملة</option>
              <option value="cancelled">ملغية</option>
            </select>
            <button
              type="button"
              onClick={() => void loadAppointments()}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-xs"
            >
              تحديث
            </button>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[780px] border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-white/10 bg-black/35 text-[10px] uppercase text-white/45">
                <th className="px-3 py-2 text-start font-semibold">#</th>
                <th className="px-3 py-2 text-start font-semibold">المريض</th>
                <th className="px-3 py-2 text-start font-semibold">الموعد</th>
                <th className="px-3 py-2 text-start font-semibold">الحالة</th>
                <th className="px-3 py-2 text-start font-semibold">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-white/45">
                    جاري التحميل...
                  </td>
                </tr>
              ) : mine.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-white/45">
                    لا توجد مواعيد مرتبطة بحساب الطبيب.
                  </td>
                </tr>
              ) : (
                mine.map((a, idx) => {
                  const ben = a.beneficiary as { id?: number; name?: string } | undefined
                  const st = String(a.status ?? '')
                  return (
                    <tr key={String(a.id)} className={`border-b border-white/[0.06] ${idx % 2 === 0 ? 'bg-black/12' : ''}`}>
                      <td className="px-3 py-2 font-mono">#{String(a.id)}</td>
                      <td className="px-3 py-2">{String(ben?.name ?? '—')}</td>
                      <td className="whitespace-nowrap px-3 py-2">{String(a.scheduled_at ?? '—')}</td>
                      <td className="px-3 py-2">{statusAr(st)}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          {st === 'scheduled' ? (
                            <button
                              type="button"
                              onClick={() => openExamDialog(a)}
                              className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] text-white"
                            >
                              تسجيل فحص
                            </button>
                          ) : null}
                          {ben?.id ? (
                            <button
                              type="button"
                              onClick={() => void loadFullHistoryForBeneficiary(ben.id as number)}
                              className="rounded-md border border-white/20 px-2 py-1 text-[11px] text-white"
                            >
                              السجل الكامل
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showExamDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-emerald-300/25 bg-slate-950 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">إجراء الفحص وتسجيل التشخيص</h3>
              <button
                type="button"
                onClick={() => setShowExamDialog(false)}
                className="rounded-lg border border-white/20 px-3 py-1 text-xs text-white"
              >
                إغلاق
              </button>
            </div>
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmitExam}>
              <p className="sm:col-span-2 text-[12px] text-white/60">
                الموعد #{String(selectedAppointment?.id ?? '')}
              </p>
              <textarea
                required
                rows={2}
                className="sm:col-span-2 rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                placeholder="التشخيص"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
              <textarea
                rows={2}
                className="sm:col-span-2 rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                placeholder="طلب تحليل مخبري"
                value={labRequest}
                onChange={(e) => setLabRequest(e.target.value)}
              />
              <textarea
                rows={2}
                className="sm:col-span-2 rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                placeholder="الوصفة الطبية الإلكترونية"
                value={prescription}
                onChange={(e) => setPrescription(e.target.value)}
              />
              <input
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                placeholder="تكلفة الوصفة (اختياري)"
                value={prescriptionCost}
                onChange={(e) => setPrescriptionCost(e.target.value)}
              />
              <input
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                placeholder="ملاحظات"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <button type="submit" className="sm:col-span-2 rounded-lg bg-emerald-600 py-2.5 font-medium text-white">
                حفظ السجل وإنهاء الموعد
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {showHistoryDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-cyan-300/25 bg-slate-950 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">السجل الطبي الكامل للمريض</h3>
              <button
                type="button"
                onClick={() => setShowHistoryDialog(false)}
                className="rounded-lg border border-white/20 px-3 py-1 text-xs text-white"
              >
                إغلاق
              </button>
            </div>
            <div className="max-h-[60vh] overflow-auto rounded-xl border border-white/[0.06]">
              <table className="w-full min-w-[720px] border-collapse text-[12px]">
                <thead>
                  <tr className="border-b border-white/10 bg-black/35 text-[10px] uppercase text-white/45">
                    <th className="px-3 py-2 text-start font-semibold">التاريخ</th>
                    <th className="px-3 py-2 text-start font-semibold">التشخيص</th>
                    <th className="px-3 py-2 text-start font-semibold">الوصفة</th>
                    <th className="px-3 py-2 text-start font-semibold">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-white/45">
                        لا يوجد سجل طبي للمريض.
                      </td>
                    </tr>
                  ) : (
                    historyRows.map((r, idx) => (
                      <tr key={String(r.id)} className={`border-b border-white/[0.06] ${idx % 2 === 0 ? 'bg-black/12' : ''}`}>
                        <td className="whitespace-nowrap px-3 py-2">{String(r.recorded_at ?? '—')}</td>
                        <td className="max-w-[18rem] truncate px-3 py-2">{String(r.diagnosis ?? '—')}</td>
                        <td className="max-w-[14rem] truncate px-3 py-2">{String(r.prescription ?? '—')}</td>
                        <td className="max-w-[14rem] truncate px-3 py-2">{String(r.notes ?? '—')}</td>
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
