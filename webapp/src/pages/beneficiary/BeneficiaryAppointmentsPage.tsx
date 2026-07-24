import { type FormEvent, useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import { SubmitButton } from '../../components/SubmitButton'
import { useSubmitLock } from '../../hooks/useSubmitLock'
import { formatDateTimeAr } from '../../lib/dateTime'

function workflowStatusAr(code: string): string {
  const map: Record<string, string> = {
    pending_approval: 'بانتظار موافقة السكرتارية',
    scheduled: 'مجدول',
    reschedule_proposed: 'اقتراح وقت بديل — يرجى الرد',
    cancelled: 'ملغى',
    completed: 'مكتمل',
    pending: 'قيد الانتظار',
  }
  return map[code] ?? code
}

export function BeneficiaryAppointmentsPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const focusFromNav = (location.state as { focusAppointmentId?: number } | null)?.focusAppointmentId
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [doctorOptions, setDoctorOptions] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [focusedAppointmentId, setFocusedAppointmentId] = useState<number | null>(null)
  const requestLock = useSubmitLock()
  const respondLock = useSubmitLock()

  const [specialty, setSpecialty] = useState('طب عام')
  const [doctorId, setDoctorId] = useState('')
  const [reason, setReason] = useState('متابعة')
  const [preferredDate, setPreferredDate] = useState('')

  async function load() {
    setLoading(true)
    setErr(null)
    try {
      const res = await api.fetchAppointments({ page: 1 })
      setRows((res.data as Record<string, unknown>[]) ?? [])
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر تحميل المواعيد'))
    } finally {
      setLoading(false)
    }
  }

  async function loadDoctors(currentSpecialty: string) {
    try {
      const rows = await api.fetchAppointmentDoctors({ specialty: currentSpecialty })
      setDoctorOptions(rows)
      if (rows.length > 0 && !doctorId) {
        const first = rows[0]
        const user = first.user as { id?: number } | undefined
        setDoctorId(String(first.user_id ?? user?.id ?? ''))
      }
    } catch {
      setDoctorOptions([])
    }
  }

  useEffect(() => {
    void load()
    void loadDoctors(specialty)
  }, [])

  useEffect(() => {
    void loadDoctors(specialty)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialty])

  useEffect(() => {
    const rawId = searchParams.get('appointment_id') ?? (focusFromNav != null ? String(focusFromNav) : null)
    if (!rawId) {
      return
    }
    const appointmentId = Number(rawId)
    if (!Number.isFinite(appointmentId) || appointmentId < 1) {
      return
    }
    setFocusedAppointmentId(appointmentId)
    setMsg(`تم فتح الموعد #${appointmentId} من الإشعار.`)
    const next = new URLSearchParams(searchParams)
    next.delete('appointment_id')
    navigate(
      { pathname: location.pathname, search: next.toString() ? `?${next.toString()}` : '' },
      { replace: true, state: null },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('appointment_id'), focusFromNav])

  useEffect(() => {
    if (!focusedAppointmentId || rows.length === 0) {
      return
    }
    const el = document.getElementById(`ben-appt-row-${focusedAppointmentId}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focusedAppointmentId, rows])

  async function onRequest(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    if (!doctorId) {
      setErr('اختر الطبيب أولاً.')
      return
    }
    await requestLock.run(async () => {
      try {
        await api.requestBeneficiaryAppointment({
          doctor_id: Number(doctorId),
          requested_specialty: specialty,
          reason: reason.trim() || undefined,
          preferred_date: preferredDate || undefined,
        })
        setMsg('تم إرسال طلب الموعد بنجاح. بانتظار موافقة السكرتارية.')
        await load()
      } catch (e) {
        setErr(extractErrorMessage(e, 'فشل إرسال الطلب'))
      }
    })
  }

  async function onRespondReschedule(appointmentId: number, decision: 'accepted' | 'rejected') {
    setMsg(null)
    setErr(null)
    await respondLock.run(async () => {
      try {
        await api.respondAppointmentReschedule(appointmentId, { decision })
        setMsg(decision === 'accepted' ? 'تم قبول الموعد البديل.' : 'تم رفض الموعد البديل.')
        await load()
      } catch (e) {
        setErr(extractErrorMessage(e, 'تعذّر إرسال الرد على اقتراح التعديل'))
      }
    })
  }

  return (
    <div className="space-y-6 text-sm text-white/82">
      {(msg || err) && (
        <div
          className={`fixed inset-x-4 top-4 z-50 mx-auto max-w-lg rounded-xl px-4 py-3 shadow-lg ${err ? 'border border-red-400/35 bg-red-600/90 text-red-50' : 'border border-emerald-400/35 bg-emerald-600/90 text-emerald-50'}`}
        >
          {err ?? msg}
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white">طلب موعد طبي</h2>
        <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={onRequest}>
          <select
            className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
          >
            <option value="طب عام">طب عام</option>
            <option value="أطفال">أطفال</option>
            <option value="نسائية">نسائية</option>
            <option value="عظام">عظام</option>
            <option value="قلب">قلب</option>
          </select>
          <select
            className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
          >
            <option value="">اختر الطبيب</option>
            {doctorOptions.map((doctor) => {
              const user = doctor.user as { id?: number; name?: string } | undefined
              const optionValue = String(doctor.user_id ?? user?.id ?? '')
              return (
                <option key={String(doctor.id ?? optionValue)} value={optionValue}>
                  {String(user?.name ?? 'طبيب')} ({String(doctor.specialty ?? specialty)})
                </option>
              )
            })}
          </select>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-white/55">التاريخ المفضّل (اختياري)</span>
            <input
              type="date"
              className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
            />
          </label>
          <textarea
            className="sm:col-span-2 rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="سبب الموعد"
          />
          <SubmitButton
            busy={requestLock.busy}
            className="sm:col-span-2 rounded-lg bg-sky-700 py-2.5 font-semibold text-white transition active:scale-[0.98] hover:bg-sky-600"
          >
            إرسال الطلب
          </SubmitButton>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-base font-semibold text-white">مواعيدي</h3>
        <p className="mt-1 text-xs text-white/50">تظهر هنا مواعيدك فقط. أي تعديل من السكرتارية يظهر بعد التحديث.</p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[620px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-black/30 text-[11px] uppercase tracking-wide text-white/45">
                <th className="px-3 py-2.5 text-start font-semibold">#</th>
                <th className="px-3 py-2.5 text-start font-semibold">الاختصاص</th>
                <th className="px-3 py-2.5 text-start font-semibold">الموعد</th>
                <th className="px-3 py-2.5 text-start font-semibold">الحالة</th>
                <th className="px-3 py-2.5 text-start font-semibold">الطبيب</th>
                <th className="px-3 py-2.5 text-start font-semibold">الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-white/45">
                    جاري التحميل...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-white/45">
                    لا يوجد مواعيد حالياً.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const isFocused = focusedAppointmentId != null && Number(row.id) === focusedAppointmentId
                  return (
                  <tr
                    id={`ben-appt-row-${String(row.id)}`}
                    key={String(row.id)}
                    className={`border-b border-white/[0.06] ${
                      isFocused ? 'bg-sky-500/20 ring-1 ring-inset ring-sky-400/40' : ''
                    }`}
                  >
                    <td className="px-3 py-2.5">#{String(row.id)}</td>
                    <td className="px-3 py-2.5">{String(row.requested_specialty ?? '—')}</td>
                    <td className="px-3 py-2.5 leading-snug">
                      {String(row.workflow_status ?? '') === 'reschedule_proposed' ? (
                        <>
                          <div className="text-amber-100">
                            مقترح: {formatDateTimeAr(row.proposed_scheduled_at as string | undefined)}
                          </div>
                          <div className="mt-0.5 text-[11px] text-white/45">
                            الحالي: {formatDateTimeAr(row.scheduled_at as string | undefined)}
                          </div>
                        </>
                      ) : (
                        formatDateTimeAr(row.scheduled_at as string | undefined)
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {workflowStatusAr(String(row.workflow_status ?? row.status ?? ''))}
                    </td>
                    <td className="px-3 py-2.5">{String((row.doctor as { name?: string } | undefined)?.name ?? '—')}</td>
                    <td className="px-3 py-2.5">
                      {String(row.workflow_status ?? '') === 'reschedule_proposed' ? (
                        <div className="flex gap-2">
                          <SubmitButton
                            type="button"
                            busy={respondLock.busy}
                            busyLabel="..."
                            onClick={() => void onRespondReschedule(Number(row.id), 'accepted')}
                            className="rounded-md bg-emerald-700 px-2 py-1 text-[11px] text-white"
                          >
                            قبول التعديل
                          </SubmitButton>
                          <SubmitButton
                            type="button"
                            busy={respondLock.busy}
                            busyLabel="..."
                            onClick={() => void onRespondReschedule(Number(row.id), 'rejected')}
                            className="rounded-md bg-rose-700 px-2 py-1 text-[11px] text-white"
                          >
                            رفض
                          </SubmitButton>
                        </div>
                      ) : (
                        <span className="text-white/45">—</span>
                      )}
                    </td>
                  </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
