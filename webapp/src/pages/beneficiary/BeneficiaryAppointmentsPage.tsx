import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import { MEDICAL_SPECIALTIES, upcomingAvailableDates } from '../../constants/medicalSpecialties'

function beneficiaryApptStatus(row: Record<string, unknown>): string {
  const workflow = String(row.workflow_status ?? '')
  const status = String(row.status ?? '')

  if (workflow === 'reschedule_proposed') {
    return 'اقتراح وقت بديل — يرجى الرد'
  }
  if (workflow === 'pending_approval' || status === 'pending') {
    return 'بانتظار موافقة السكرتارية'
  }
  if (workflow === 'scheduled' || status === 'scheduled') {
    return 'مجدول'
  }
  if (status === 'cancelled' || workflow === 'cancelled') {
    return 'ملغى'
  }
  if (status === 'completed' || workflow === 'completed') {
    return 'مُنجَز'
  }

  return workflow || status || '—'
}

function beneficiaryApptDate(row: Record<string, unknown>): string {
  if (String(row.workflow_status ?? '') === 'reschedule_proposed') {
    const proposed = String(row.proposed_scheduled_at ?? '')
    const current = String(row.scheduled_at ?? '—')
    if (proposed) {
      return `${proposed} (مقترح — الموعد الحالي: ${current})`
    }
  }

  return String(row.scheduled_at ?? '—')
}

export function BeneficiaryAppointmentsPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [doctorOptions, setDoctorOptions] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const [specialty, setSpecialty] = useState<string>(MEDICAL_SPECIALTIES[0].value)
  const [doctorId, setDoctorId] = useState('')
  const [reason, setReason] = useState('متابعة')
  const [preferredDate, setPreferredDate] = useState('')
  const [preferredTime, setPreferredTime] = useState('09:00')

  const selectedDoctor = useMemo(
    () =>
      doctorOptions.find((doctor) => {
        const user = doctor.user as { id?: number } | undefined
        return String(doctor.user_id ?? user?.id ?? '') === doctorId
      }),
    [doctorOptions, doctorId],
  )

  const availableDateOptions = useMemo(() => {
    const days = Array.isArray(selectedDoctor?.available_days)
      ? (selectedDoctor.available_days as string[])
      : []
    return upcomingAvailableDates(days)
  }, [selectedDoctor])

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
      if (rows.length > 0) {
        const first = rows[0]
        const user = first.user as { id?: number } | undefined
        setDoctorId(String(first.user_id ?? user?.id ?? ''))
      } else {
        setDoctorId('')
      }
    } catch {
      setDoctorOptions([])
      setDoctorId('')
    }
  }

  useEffect(() => {
    void load()
    void loadDoctors(specialty)
  }, [])

  useEffect(() => {
    void loadDoctors(specialty)
  }, [specialty])

  useEffect(() => {
    if (availableDateOptions.length === 0) {
      setPreferredDate('')
      return
    }
    if (!availableDateOptions.some((opt) => opt.value === preferredDate)) {
      setPreferredDate(availableDateOptions[0].value)
    }
  }, [availableDateOptions, preferredDate])

  async function onRequest(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    if (!doctorId) {
      setErr('اختر الطبيب أولاً.')
      return
    }
    if (!preferredDate) {
      setErr('لا توجد أيام متاحة لهذا الطبيب — اختر طبيباً آخر أو حدّث أيام دوامه.')
      return
    }
    try {
      await api.requestBeneficiaryAppointment({
        doctor_id: Number(doctorId),
        requested_specialty: specialty,
        reason: reason.trim() || undefined,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
      })
      setMsg('تم إرسال طلب الموعد بنجاح. بانتظار موافقة السكرتارية.')
      await load()
    } catch (e) {
      setErr(extractErrorMessage(e, 'فشل إرسال الطلب'))
    }
  }

  async function onRespondReschedule(appointmentId: number, decision: 'accepted' | 'rejected') {
    setMsg(null)
    setErr(null)
    try {
      await api.respondAppointmentReschedule(appointmentId, { decision })
      setMsg(decision === 'accepted' ? 'تم قبول الموعد البديل.' : 'تم رفض الموعد البديل.')
      await load()
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر إرسال الرد على اقتراح التعديل'))
    }
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
          <div>
            <label className="mb-1 block text-[11px] text-white/50">القسم / الاختصاص</label>
            <select
              className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
            >
              {MEDICAL_SPECIALTIES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-white/50">الطبيب</label>
            <select
              className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
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
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[11px] text-white/50">اليوم المتاح للطبيب</label>
            {availableDateOptions.length === 0 ? (
              <p className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                {doctorId
                  ? 'هذا الطبيب لم يحدّد أيام دوام بعد — اختر طبيباً آخر.'
                  : 'اختر الطبيب أولاً لعرض الأيام المتاحة.'}
              </p>
            ) : (
              <select
                className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
              >
                {availableDateOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-white/50">الساعة</label>
            <input
              type="time"
              className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              required
            />
          </div>
          <textarea
            className="sm:col-span-2 rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="سبب الموعد"
          />
          <button type="submit" className="sm:col-span-2 rounded-lg bg-sky-700 py-2.5 font-semibold text-white transition active:scale-[0.98] hover:bg-sky-600">
            إرسال الطلب
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-white">مواعيدي</h3>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-lg border border-white/15 px-3 py-1 text-xs text-white/80 disabled:opacity-50"
          >
            تحديث
          </button>
        </div>
        <p className="mt-1 text-[11px] text-white/45">
          أي تغيير من السكرتارية (اعتماد، تعديل وقت، إلغاء) يظهر هنا بعد التحديث.
        </p>
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
                rows.map((row) => (
                  <tr key={String(row.id)} className="border-b border-white/[0.06]">
                    <td className="px-3 py-2.5">#{String(row.id)}</td>
                    <td className="px-3 py-2.5">{String(row.requested_specialty ?? '—')}</td>
                    <td className="px-3 py-2.5">{beneficiaryApptDate(row)}</td>
                    <td className="px-3 py-2.5">{beneficiaryApptStatus(row)}</td>
                    <td className="px-3 py-2.5">{String((row.doctor as { name?: string } | undefined)?.name ?? '—')}</td>
                    <td className="px-3 py-2.5">
                      {String(row.workflow_status ?? '') === 'reschedule_proposed' ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void onRespondReschedule(Number(row.id), 'accepted')}
                            className="rounded-md bg-emerald-700 px-2 py-1 text-[11px] text-white"
                          >
                            قبول التعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => void onRespondReschedule(Number(row.id), 'rejected')}
                            className="rounded-md bg-rose-700 px-2 py-1 text-[11px] text-white"
                          >
                            رفض
                          </button>
                        </div>
                      ) : (
                        <span className="text-white/45">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
