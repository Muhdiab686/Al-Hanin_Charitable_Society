import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
<<<<<<< HEAD
import { WEEKDAY_OPTIONS } from '../../constants/medicalSpecialties'
=======
import { SubmitButton } from '../../components/SubmitButton'
import { useSubmitLock } from '../../hooks/useSubmitLock'
import { dateTimeLocalToIso, formatDateTimeAr, nowDateTimeLocal, toDateTimeLocalValue } from '../../lib/dateTime'
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
import type { Paginated } from '../../types/models'

function toDatetimeLocalValue(value: unknown): string {
  if (!value) {
    return new Date().toISOString().slice(0, 16)
  }

  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 16)
  }

  const pad = (part: number) => String(part).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function apptStatusAr(a: Record<string, unknown>): string {
  const status = String(a.status ?? '')
  const workflow = String(a.workflow_status ?? '')

  if (workflow === 'reschedule_proposed') {
    return 'اقتراح تعديل — بانتظار المستفيد'
  }

  if (workflow === 'pending_approval' || status === 'pending') {
    return 'بانتظار الاعتماد'
  }

<<<<<<< HEAD
=======
function apptStatusAr(status: string, workflowStatus?: string): string {
  if (workflowStatus === 'reschedule_proposed') {
    return 'اقتراح تعديل — بانتظار المستفيد'
  }
  if (workflowStatus === 'pending_approval' || status === 'pending') {
    return 'بانتظار الاعتماد'
  }
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
  const m: Record<string, string> = {
    scheduled: 'مجدول',
    cancelled: 'ملغى',
    completed: 'مُنجَز',
  }
<<<<<<< HEAD

  return m[status] ?? status
}

function canApproveAppointment(a: Record<string, unknown>): boolean {
  const status = String(a.status ?? '')
  const workflow = String(a.workflow_status ?? '')

  if (workflow === 'reschedule_proposed') {
    return false
  }

  return status === 'pending' && (workflow === 'pending_approval' || workflow === 'scheduled')
}

function isPendingApprovalRequest(a: Record<string, unknown>): boolean {
  const workflow = String(a.workflow_status ?? '')
  const status = String(a.status ?? '')

  return workflow === 'pending_approval' || (status === 'pending' && workflow === 'scheduled')
=======
  return m[status] ?? status
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
}

function staffRoleAr(r: string): string {
  return r === 'doctor' ? 'طبيب' : r === 'secretary' ? 'سكرتيرة / إداري' : r
}

export function SecretaryClinicPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const focusFromNav = (location.state as { focusAppointmentId?: number } | null)?.focusAppointmentId
  const [staff, setStaff] = useState<Record<string, unknown>[]>([])
  const [appts, setAppts] = useState<Record<string, unknown>[]>([])
  const [apptPage, setApptPage] = useState(1)
  const [apptLast, setApptLast] = useState(1)
  const [apptFilter, setApptFilter] = useState('')
  const [selectedDoctorId, setSelectedDoctorId] = useState('')
  const [focusedAppointmentId, setFocusedAppointmentId] = useState<number | null>(null)
  const [detailAppointment, setDetailAppointment] = useState<Record<string, unknown> | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const [userId, setUserId] = useState('')
  const [salary, setSalary] = useState('800')
  const [fee, setFee] = useState('15')
  const [staffRole, setStaffRole] = useState('doctor')
  const [staffActive, setStaffActive] = useState(true)
  const [availableDays, setAvailableDays] = useState<string[]>([])

  const [benId, setBenId] = useState('')
  const [docId, setDocId] = useState('')
  const [reason, setReason] = useState('متابعة دورية')
  const [when, setWhen] = useState(() => nowDateTimeLocal(60))

  const [cancelReason, setCancelReason] = useState('طلب المستفيد')
  const [candidates, setCandidates] = useState<{ id: number; name: string; email: string; role: string }[]>([])
  const [showStaffDialog, setShowStaffDialog] = useState(false)
  const [showCreateApptDialog, setShowCreateApptDialog] = useState(false)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [approveTargetId, setApproveTargetId] = useState<number | null>(null)
<<<<<<< HEAD
  const [approveTarget, setApproveTarget] = useState<Record<string, unknown> | null>(null)
=======
  const [approveDoctorId, setApproveDoctorId] = useState('')
  const [approveWhen, setApproveWhen] = useState(() => nowDateTimeLocal(60))
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null)
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false)
  const [rescheduleTargetId, setRescheduleTargetId] = useState<number | null>(null)
  const [rescheduleTarget, setRescheduleTarget] = useState<Record<string, unknown> | null>(null)
  const [rescheduleDoctorId, setRescheduleDoctorId] = useState('')
  const [rescheduleWhen, setRescheduleWhen] = useState(() => nowDateTimeLocal(120))
  const [rescheduleNote, setRescheduleNote] = useState('')
  const [approveDialogErr, setApproveDialogErr] = useState<string | null>(null)
  const [beneficiaries, setBeneficiaries] = useState<Record<string, unknown>[]>([])
  const staffLock = useSubmitLock()
  const createApptLock = useSubmitLock()
  const approveLock = useSubmitLock()
  const cancelLock = useSubmitLock()
  const rescheduleLock = useSubmitLock()

  const doctors = useMemo(() => {
    return staff.filter((row) => {
      const u = row.user as { role?: string } | undefined

      return u?.role === 'doctor' && (row as { is_active?: boolean }).is_active !== false
    })
  }, [staff])

  async function loadStaff() {
    const s = await api.fetchClinicStaff({ page: 1 })
    setStaff((s.data as Record<string, unknown>[]) ?? [])
  }

  async function loadAppts(page: number, doctorId: string) {
    if (!doctorId) {
      setAppts([])
      setApptLast(1)
      setApptPage(1)
      return
    }

    const params: { page: number; status?: string; doctor_id: number } = {
      page,
      doctor_id: Number(doctorId),
    }

    if (apptFilter.trim()) {
      params.status = apptFilter
    }

    const a = await api.fetchAppointments(params)
    const p = a as Paginated<Record<string, unknown>>

    setAppts((p.data as Record<string, unknown>[]) ?? [])
    setApptLast(Math.max(1, p.last_page))
    setApptPage(p.current_page ?? page)
  }

  async function refresh() {
    setErr(null)

    try {
      await loadStaff()
      if (selectedDoctorId) {
        await loadAppts(apptPage, selectedDoctorId)
      }
      const b = await api.fetchBeneficiaries({ page: 1 })
      setBeneficiaries((b.data as Record<string, unknown>[]) ?? [])
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر التحميل'))
    }
  }

  useEffect(() => {
    void refresh()
    void api.fetchClinicStaffCandidates().then(setCandidates).catch(() => setCandidates([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apptPage/filter applied via dedicated effects
  }, [])

  useEffect(() => {
    if (!showStaffDialog) {
      return
    }
    void api.fetchClinicStaffCandidates().then(setCandidates).catch(() => setCandidates([]))
  }, [showStaffDialog])

  useEffect(() => {
    const hasFocusTarget =
      Boolean(searchParams.get('appointment_id')) ||
      (focusFromNav != null && Number.isFinite(Number(focusFromNav)) && Number(focusFromNav) > 0)
    if (!selectedDoctorId && doctors.length > 0 && !hasFocusTarget) {
      const first = doctors[0]?.user as { id?: number } | undefined
      if (first?.id != null) {
        setSelectedDoctorId(String(first.id))
      }
    }
  }, [doctors, selectedDoctorId, searchParams, focusFromNav])

  useEffect(() => {
    const rawId = searchParams.get('appointment_id') ?? (focusFromNav != null ? String(focusFromNav) : null)
    if (!rawId) {
      return
    }
    const appointmentId = Number(rawId)
    if (!Number.isFinite(appointmentId) || appointmentId < 1) {
      return
    }

    let cancelled = false
    void (async () => {
      setErr(null)
      try {
        const appointment = await api.fetchAppointment(appointmentId)
        if (cancelled) {
          return
        }
        const doctorId = String(
          (appointment.doctor as { id?: number } | undefined)?.id ?? appointment.doctor_id ?? '',
        )
        setFocusedAppointmentId(appointmentId)
        setDetailAppointment(appointment)
        setApptFilter('')
        setApptPage(1)
        if (doctorId) {
          setSelectedDoctorId(doctorId)
        }
        setMsg(`تم فتح الموعد #${appointmentId} من الإشعار.`)
      } catch (e) {
        if (!cancelled) {
          setErr(extractErrorMessage(e, 'تعذّر فتح الموعد من الإشعار'))
        }
      } finally {
        if (!cancelled) {
          const next = new URLSearchParams(searchParams)
          next.delete('appointment_id')
          navigate(
            { pathname: location.pathname, search: next.toString() ? `?${next.toString()}` : '' },
            { replace: true, state: null },
          )
        }
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('appointment_id'), focusFromNav])

  useEffect(() => {
    if (!selectedDoctorId) {
      setAppts([])
      return
    }
    void loadAppts(apptPage, selectedDoctorId).catch((e: unknown) =>
      setErr(extractErrorMessage(e as Error, 'تعذّر تحميل المواعيد')),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apptPage, apptFilter, selectedDoctorId])

  useEffect(() => {
    if (!focusedAppointmentId || appts.length === 0) {
      return
    }
    const el = document.getElementById(`appt-row-${focusedAppointmentId}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focusedAppointmentId, appts])

  const selectedDoctorName = useMemo(() => {
    const row = doctors.find((d) => String((d.user as { id?: number } | undefined)?.id ?? '') === selectedDoctorId)
    return String((row?.user as { name?: string } | undefined)?.name ?? '')
  }, [doctors, selectedDoctorId])

  function openAppointmentDetail(a: Record<string, unknown>) {
    setFocusedAppointmentId(Number(a.id))
    setDetailAppointment(a)
  }

  async function onUpsertStaff(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    await staffLock.run(async () => {
      try {
        await api.upsertClinicStaff({
          user_id: Number(userId),
          monthly_salary: Number(salary),
          consultation_fee: Number(fee),
          is_active: staffActive,
          role: staffRole,
          available_days: availableDays,
        })
        setMsg('تم حفظ ملف العضو في الطاقم الطبي (رواتب وأجور ومتابعة التفعيل).')
        setShowStaffDialog(false)
        await loadStaff()
      } catch (ex) {
        setErr(extractErrorMessage(ex, 'فشل الحفظ'))
      }
    })
  }

  async function onCreateAppt(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    await createApptLock.run(async () => {
      try {
        await api.createAppointment({
          beneficiary_id: Number(benId),
          doctor_id: Number(docId),
          scheduled_at: dateTimeLocalToIso(when),
          reason,
        })
        setMsg('تم جدولة الموعد.')
        setShowCreateApptDialog(false)
        if (docId) {
          setSelectedDoctorId(docId)
        }
        setApptPage(1)
        await loadAppts(1, docId || selectedDoctorId)
      } catch (ex) {
        setErr(extractErrorMessage(ex, 'فشل إنشاء الموعد'))
      }
    })
  }

  async function onCancelTarget() {
    if (!cancelTargetId) {
      return
    }
    setMsg(null)
    setErr(null)
    await cancelLock.run(async () => {
      try {
        await api.cancelAppointment(cancelTargetId, { cancellation_reason: cancelReason })
        setMsg('تم إلغاء الموعد.')
        setCancelTargetId(null)
        await loadAppts(apptPage, selectedDoctorId)
      } catch (ex) {
        setErr(extractErrorMessage(ex, 'فشل الإلغاء'))
      }
    })
  }

  async function onApproveTarget() {
    if (!approveTargetId) {
      return
    }
    setMsg(null)
    setErr(null)
<<<<<<< HEAD
    setApproveDialogErr(null)
    try {
      await api.approveAppointment(approveTargetId)
      setMsg('تم اعتماد الطلب وجدولة الموعد بنجاح.')
      setShowApproveDialog(false)
      setApproveTargetId(null)
      setApproveTarget(null)
      await loadAppts(apptPage)
    } catch (ex) {
      const message = extractErrorMessage(ex, 'فشل اعتماد الموعد')
      setApproveDialogErr(message)
      setErr(message)
    }
=======
    await approveLock.run(async () => {
      try {
        await api.approveAppointment(approveTargetId, {
          doctor_id: Number(approveDoctorId),
          scheduled_at: dateTimeLocalToIso(approveWhen),
        })
        setMsg('تم اعتماد الطلب وجدولة الموعد بنجاح.')
        setShowApproveDialog(false)
        setApproveTargetId(null)
        setApproveDoctorId('')
        await loadAppts(apptPage, selectedDoctorId)
      } catch (ex) {
        setErr(extractErrorMessage(ex, 'فشل اعتماد الموعد'))
      }
    })
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
  }

  async function onProposeReschedule() {
    if (!rescheduleTargetId || !rescheduleTarget) {
      return
    }

    const pendingApproval = isPendingApprovalRequest(rescheduleTarget)
    const doctorId = pendingApproval
      ? Number((rescheduleTarget.doctor as { id?: number } | undefined)?.id ?? rescheduleTarget.doctor_id ?? 0)
      : Number(rescheduleDoctorId)

    if (!doctorId) {
      setErr('اختر الطبيب أولاً قبل إرسال التعديل.')
      return
    }
    setMsg(null)
    setErr(null)
<<<<<<< HEAD
    try {
      await api.proposeAppointmentReschedule(rescheduleTargetId, {
        doctor_id: doctorId,
        scheduled_at: new Date(rescheduleWhen).toISOString(),
        proposal_note: rescheduleNote.trim() || null,
      })
      setMsg(
        pendingApproval
          ? 'تم تحديث وقت الطلب — يمكنك الآن اعتماد الموعد.'
          : 'تم إرسال اقتراح التعديل للمستفيد.',
      )
      setShowRescheduleDialog(false)
      setRescheduleTargetId(null)
      setRescheduleTarget(null)
      setRescheduleDoctorId('')
      setRescheduleNote('')
      await loadAppts(apptPage)
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'فشل إرسال اقتراح التعديل'))
    }
=======
    await rescheduleLock.run(async () => {
      try {
        await api.proposeAppointmentReschedule(rescheduleTargetId, {
          doctor_id: Number(rescheduleDoctorId),
          scheduled_at: dateTimeLocalToIso(rescheduleWhen),
          proposal_note: rescheduleNote.trim() || null,
        })
        setMsg('تم إرسال اقتراح التعديل للمستفيد.')
        setShowRescheduleDialog(false)
        setRescheduleTargetId(null)
        setRescheduleDoctorId('')
        setRescheduleNote('')
        await loadAppts(apptPage, selectedDoctorId)
      } catch (ex) {
        setErr(extractErrorMessage(ex, 'فشل إرسال اقتراح التعديل'))
      }
    })
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
  }

  return (
    <div className="space-y-10 text-sm text-white/82">
      {(msg || err) && (
        <div
          className={`rounded-xl px-4 py-3 ${err ? 'border border-red-400/35 bg-red-500/12 text-red-50' : 'border border-emerald-400/35 bg-emerald-500/12 text-emerald-50'}`}
        >
          {err ?? msg}
        </div>
      )}

      <header className="space-y-1">
        <h2 className="text-xl font-bold text-white">العيادة — المواعيد والطاقم</h2>
        <p className="max-w-prose text-[13px] text-white/55">
          حجز الموعد، الإلغاء، ومتابعة مناوبات وملفات الطاقم (التفعيل والأجور). لربط نتيجة الزيارة بالسجل
          استخدم صفحة «الملف الطبي».
        </p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-white">طاقم العيادة والمناوبات</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowStaffDialog(true)}
              className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white"
            >
              إضافة/تعديل عضو
            </button>
            <button type="button" onClick={() => void refresh()} className="rounded-lg border border-white/15 px-3 py-1 text-xs">
              تحديث
            </button>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[640px] border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-white/10 bg-black/35 text-[10px] uppercase tracking-wide text-white/45">
                <th className="px-3 py-2.5 font-semibold text-start">العضو</th>
                <th className="px-3 py-2.5 font-semibold text-start">الدور</th>
                <th className="px-3 py-2.5 font-semibold text-start">راتب</th>
                <th className="px-3 py-2.5 font-semibold text-start">استشارة</th>
                <th className="px-3 py-2.5 font-semibold text-start">نشط</th>
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-white/45">
                    لا سجلات طاقم — أضف الطبيب الأول أدناه.
                  </td>
                </tr>
              ) : (
                staff.map((row, idx) => {
                  const u = row.user as { id?: number; name?: string; role?: string }
                  return (
                    <tr key={String(row.id)} className={`border-b border-white/[0.06] ${idx % 2 === 0 ? 'bg-black/12' : ''}`}>
                      <td className="px-3 py-2">
                        <span className="font-medium text-white">{String(u?.name ?? '—')}</span>
                        <span className="ms-2 font-mono text-[11px] text-white/45">user #{String(u?.id)}</span>
                      </td>
                      <td className="px-3 py-2">{staffRoleAr(String(u?.role ?? ''))}</td>
                      <td className="px-3 py-2 tabular-nums">{String(row.monthly_salary)}</td>
                      <td className="px-3 py-2 tabular-nums">{String(row.consultation_fee)}</td>
                      <td className="px-3 py-2">{row.is_active ? 'نعم' : 'لا'}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">المواعيد</h3>
            <p className="mt-1 text-xs text-white/50">
              اختر طبيباً أولاً لعرض مواعيده فقط
              {selectedDoctorName ? ` — المعروض الآن: ${selectedDoctorName}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (selectedDoctorId) {
                  setDocId(selectedDoctorId)
                }
                setShowCreateApptDialog(true)
              }}
              className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white"
            >
              حجز موعد جديد
            </button>
            <select
              className="rounded-lg border border-white/15 bg-slate-950/45 px-2 py-1.5 text-xs text-white"
              value={apptFilter}
              onChange={(e) => {
                setApptFilter(e.target.value)
                setApptPage(1)
              }}
            >
              <option value="">كل الحالات</option>
              <option value="pending">بانتظار الاعتماد</option>
              <option value="scheduled">مجدولة</option>
              <option value="completed">منجزة</option>
              <option value="cancelled">ملغاة</option>
            </select>
            <button
              type="button"
              disabled={apptPage <= 1 || !selectedDoctorId}
              onClick={() => setApptPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-white/15 px-2 py-1 text-xs disabled:opacity-40"
            >
              السابق
            </button>
            <span className="self-center text-[11px] text-white/50">
              صفحة {apptPage} / {apptLast}
            </span>
            <button
              type="button"
              disabled={apptPage >= apptLast || !selectedDoctorId}
              onClick={() => setApptPage((p) => p + 1)}
              className="rounded-lg border border-white/15 px-2 py-1 text-xs disabled:opacity-40"
            >
              التالي
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {doctors.length === 0 ? (
            <p className="text-xs text-amber-200/80">لا يوجد أطباء مفعّلون في الطاقم بعد.</p>
          ) : (
            doctors.map((d) => {
              const u = d.user as { id?: number; name?: string }
              const id = String(u?.id ?? '')
              const active = id === selectedDoctorId
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setSelectedDoctorId(id)
                    setApptPage(1)
                  }}
                  className={`rounded-xl border px-3 py-2 text-start text-xs transition ${
                    active
                      ? 'border-teal-400/50 bg-teal-500/20 text-white'
                      : 'border-white/12 bg-black/20 text-white/75 hover:bg-white/10'
                  }`}
                >
                  <span className="block font-medium">{String(u?.name ?? 'طبيب')}</span>
                  <span className="mt-0.5 block font-mono text-[10px] text-white/45">#{id}</span>
                </button>
              )
            })
          )}
        </div>

        <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[640px] border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-white/10 bg-black/35 text-[10px] uppercase text-white/45">
                <th className="px-3 py-2.5 font-semibold text-start">#</th>
                <th className="px-3 py-2.5 font-semibold text-start">المستفيد</th>
                <th className="px-3 py-2.5 font-semibold text-start">الموعد</th>
                <th className="px-3 py-2.5 font-semibold text-start">الحالة</th>
                <th className="px-3 py-2.5 font-semibold text-start">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {!selectedDoctorId ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-white/45">
                    اختر طبيباً من القائمة أعلاه لعرض مواعيده.
                  </td>
                </tr>
              ) : appts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-white/45">
                    لا مواعيد لهذا الطبيب ضمن التصفية الحالية.
                  </td>
                </tr>
              ) : (
                appts.map((a, idx) => {
                  const st = String(a.status ?? '')
<<<<<<< HEAD
                  const wf = String(a.workflow_status ?? '')
                  const ben = a.beneficiary as { name?: string } | undefined
                  const doc = a.doctor as { name?: string } | undefined
                  const showApprove = canApproveAppointment(a)
                  const pendingApproval = isPendingApprovalRequest(a)
=======
                  const workflow = String(a.workflow_status ?? '')
                  const ben = a.beneficiary as { name?: string; phone?: string; national_id?: string } | undefined
                  const isFocused = focusedAppointmentId != null && Number(a.id) === focusedAppointmentId
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194

                  return (
                    <tr
                      id={`appt-row-${String(a.id)}`}
                      key={String(a.id)}
                      className={`border-b border-white/[0.06] cursor-pointer ${
                        isFocused
                          ? 'bg-sky-500/20 ring-1 ring-inset ring-sky-400/40'
                          : idx % 2 === 0
                            ? 'bg-black/12'
                            : ''
                      }`}
                      onClick={() => openAppointmentDetail(a)}
                    >
                      <td className="whitespace-nowrap px-3 py-2 font-mono">{String(a.id)}</td>
                      <td className="px-3 py-2">{String(ben?.name ?? '—')}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-white/85">
                        <div className="leading-snug">{formatDateTimeAr(a.scheduled_at as string | undefined)}</div>
                        {workflow === 'reschedule_proposed' ? (
                          <div className="mt-0.5 text-[11px] text-amber-200/85">
                            مقترح: {formatDateTimeAr(a.proposed_scheduled_at as string | undefined)}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ring-1 ${
                            st === 'scheduled'
                              ? 'bg-sky-500/15 text-sky-100 ring-sky-400/35'
                              : st === 'cancelled'
                                ? 'bg-rose-500/15 text-rose-100 ring-rose-400/35'
<<<<<<< HEAD
                                : wf === 'reschedule_proposed'
                                  ? 'bg-amber-500/15 text-amber-100 ring-amber-400/35'
                                  : 'bg-emerald-500/12 text-emerald-100 ring-emerald-400/30'
                          }`}
                        >
                          {apptStatusAr(a)}
=======
                                : st === 'pending' || workflow === 'pending_approval'
                                  ? 'bg-indigo-500/15 text-indigo-100 ring-indigo-400/35'
                                  : workflow === 'reschedule_proposed'
                                    ? 'bg-amber-500/15 text-amber-100 ring-amber-400/35'
                                    : 'bg-emerald-500/12 text-emerald-100 ring-emerald-400/30'
                          }`}
                        >
                          {apptStatusAr(st, workflow)}
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
                        </span>
                      </td>
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap gap-1">
<<<<<<< HEAD
                          {showApprove ? (
=======
                          <button
                            type="button"
                            onClick={() => openAppointmentDetail(a)}
                            className="rounded-md bg-sky-700/80 px-2 py-1 text-[11px] text-white hover:bg-sky-600"
                          >
                            التفاصيل
                          </button>
                          {st === 'pending' ? (
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
                            <button
                              type="button"
                              onClick={() => {
                                setApproveTargetId(Number(a.id))
<<<<<<< HEAD
                                setApproveTarget(a)
                                setApproveDialogErr(null)
=======
                                setApproveDoctorId(String((a.doctor as { id?: number } | undefined)?.id ?? selectedDoctorId))
                                setApproveWhen(
                                  toDateTimeLocalValue((a.scheduled_at as string | undefined) ?? null) || nowDateTimeLocal(60),
                                )
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
                                setShowApproveDialog(true)
                              }}
                              className="rounded-md bg-emerald-700/80 px-2 py-1 text-[11px] text-white hover:bg-emerald-600"
                            >
                              اعتماد
                            </button>
                          ) : null}
                          {st === 'scheduled' ? (
                            <button
                              type="button"
                              onClick={() => setCancelTargetId(Number(a.id))}
                              className="rounded-md bg-rose-700/80 px-2 py-1 text-[11px] text-white hover:bg-rose-600"
                            >
                              إلغاء
                            </button>
                          ) : null}
<<<<<<< HEAD
                          {(pendingApproval || st === 'scheduled') ? (
=======
                          {st === 'pending' || st === 'scheduled' ? (
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
                            <button
                              type="button"
                              onClick={() => {
                                setRescheduleTargetId(Number(a.id))
<<<<<<< HEAD
                                setRescheduleTarget(a)
                                setRescheduleDoctorId(String((a.doctor as { id?: number } | undefined)?.id ?? a.doctor_id ?? ''))
                                setRescheduleWhen(toDatetimeLocalValue(a.scheduled_at))
                                setRescheduleNote('')
=======
                                setRescheduleDoctorId(String((a.doctor as { id?: number } | undefined)?.id ?? selectedDoctorId))
                                setRescheduleWhen(
                                  toDateTimeLocalValue((a.scheduled_at as string | undefined) ?? null) || nowDateTimeLocal(120),
                                )
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
                                setShowRescheduleDialog(true)
                              }}
                              className="rounded-md bg-amber-700/80 px-2 py-1 text-[11px] text-white hover:bg-amber-600"
                            >
                              {pendingApproval ? 'تعديل الوقت' : 'اقتراح تعديل'}
                            </button>
                          ) : null}
<<<<<<< HEAD
                          {!showApprove && st !== 'scheduled' && wf !== 'reschedule_proposed' && st !== 'pending' ? (
                            <span className="text-white/38">—</span>
                          ) : null}
=======
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
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

      {showStaffDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-violet-300/25 bg-slate-950 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">إضافة/تعديل عضو الطاقم</h4>
              <button type="button" onClick={() => setShowStaffDialog(false)} className="rounded-lg border border-white/20 px-3 py-1 text-xs">
                إغلاق
              </button>
            </div>
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={onUpsertStaff}>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-[11px] text-white/52">
                  الطبيب / المساعد — يُنشأ حساب الطبيب أولاً من لوحة المدير (دور doctor)
                </span>
                <select
                  className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                >
                  <option value="">— اختر من القائمة —</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      #{c.id} {c.name} ({c.role === 'doctor' ? 'طبيب' : c.role})
                    </option>
                  ))}
                </select>
                {candidates.length === 0 ? (
                  <span className="text-[10px] text-amber-200/80">
                    لا يوجد أطباء بلا ملف عيادة — أنشئ مستخدماً بدور طبيب من المدير ثم حدّث هذه الصفحة.
                  </span>
                ) : null}
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-white/52">الدور في الطاقم</span>
                <select
                  className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value)}
                >
                  <option value="doctor">طبيب</option>
                  <option value="secretary">سكرتير / مساعد إداري عيادة</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-white/52">نشط في المنظومة</span>
                <select
                  className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                  value={staffActive ? '1' : '0'}
                  onChange={(e) => setStaffActive(e.target.value === '1')}
                >
                  <option value="1">مفعّل — يظهر في القوائم الطبية</option>
                  <option value="0">موقوف — لا يُقترح للحجوزات</option>
                </select>
              </label>
              <input
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                placeholder="راتب شهري"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
              />
              <input
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                placeholder="أجر الاستشارة"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
              />
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-[11px] text-white/52">أيام الدوام المتاحة</span>
                <div className="flex flex-wrap gap-2 rounded-lg border border-white/15 bg-slate-900 px-3 py-2">
                  {WEEKDAY_OPTIONS.map((day) => (
                    <label key={day.value} className="flex items-center gap-1 text-[11px] text-white/85">
                      <input
                        type="checkbox"
                        checked={availableDays.includes(day.value)}
                        onChange={(e) => {
                          setAvailableDays((current) => {
                            if (e.target.checked) {
                              return [...current, day.value]
                            }
                            return current.filter((item) => item !== day.value)
                          })
                        }}
                      />
                      {day.label}
                    </label>
                  ))}
                </div>
              </label>
              <SubmitButton busy={staffLock.busy} className="rounded-lg bg-violet-600 py-2.5 font-medium text-white sm:col-span-2">
                حفظ أو تحديث الملف
              </SubmitButton>
            </form>
          </div>
        </div>
      ) : null}

      {showCreateApptDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-teal-300/25 bg-slate-950 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">حجز موعد جديد</h4>
              <button type="button" onClick={() => setShowCreateApptDialog(false)} className="rounded-lg border border-white/20 px-3 py-1 text-xs">
                إغلاق
              </button>
            </div>
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={onCreateAppt}>
              <select
                required
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                value={benId}
                onChange={(e) => setBenId(e.target.value)}
              >
                <option value="">— اختر المستفيد —</option>
                {beneficiaries.map((beneficiary) => (
                  <option key={String(beneficiary.id)} value={String(beneficiary.id)}>
                    {String(beneficiary.name ?? 'مستفيد')} (#{String(beneficiary.id)})
                  </option>
                ))}
              </select>
              <select
                required
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                value={docId}
                onChange={(e) => setDocId(e.target.value)}
              >
                <option value="">— اختر طبيباً —</option>
                {doctors.map((d) => {
                  const u = d.user as { id?: number; name?: string }
                  return (
                    <option key={String(u?.id)} value={String(u?.id)}>
                      {String(u?.name)} (#{String(u?.id)})
                    </option>
                  )
                })}
              </select>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-[11px] text-white/55">تاريخ ووقت الموعد (توقيت سوريا)</span>
                <input
                  type="datetime-local"
                  required
                  className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                />
              </label>
              <input
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white sm:col-span-2"
                placeholder="سبب الزيارة / الملاحظة"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <SubmitButton busy={createApptLock.busy} className="rounded-lg bg-teal-600 py-2.5 font-medium text-white sm:col-span-2">
                تأكيد الحجز
              </SubmitButton>
            </form>
          </div>
        </div>
      ) : null}

      {cancelTargetId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-rose-300/25 bg-slate-950 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">إلغاء الموعد #{cancelTargetId}</h4>
              <button type="button" onClick={() => setCancelTargetId(null)} className="rounded-lg border border-white/20 px-3 py-1 text-xs">
                إغلاق
              </button>
            </div>
            <div className="space-y-3">
              <input
                className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="سبب الإلغاء"
              />
              <SubmitButton
                type="button"
                busy={cancelLock.busy}
                onClick={() => void onCancelTarget()}
                className="w-full rounded-lg bg-rose-700 px-4 py-2 text-white"
              >
                تأكيد الإلغاء
              </SubmitButton>
            </div>
          </div>
        </div>
      ) : null}

      {showApproveDialog && approveTargetId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-emerald-300/25 bg-slate-950 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">اعتماد طلب الموعد #{approveTargetId}</h4>
              <button type="button" onClick={() => setShowApproveDialog(false)} className="rounded-lg border border-white/20 px-3 py-1 text-xs">
                إغلاق
              </button>
            </div>
            <div className="space-y-3">
<<<<<<< HEAD
              <p className="text-xs text-white/55">
                الطبيب والموعد محدّدان مسبقاً من قبل المستفيد — لا يمكن تعديلهما عند الاعتماد.
              </p>
              {approveDialogErr ? (
                <div className="rounded-lg border border-red-400/35 bg-red-500/12 px-3 py-2 text-xs text-red-100">
                  {approveDialogErr}
                </div>
              ) : null}
              <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
                <p className="text-[10px] text-white/45">الطبيب</p>
                <p className="mt-1 text-sm font-medium text-white">
                  {String((approveTarget?.doctor as { name?: string } | undefined)?.name ?? '—')}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
                <p className="text-[10px] text-white/45">الموعد المطلوب</p>
                <p className="mt-1 text-sm font-medium text-white">
                  {String(approveTarget?.scheduled_at ?? '—')}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
                <p className="text-[10px] text-white/45">الاختصاص</p>
                <p className="mt-1 text-sm text-white/85">{String(approveTarget?.requested_specialty ?? '—')}</p>
              </div>
              <button
=======
              <select
                className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                value={approveDoctorId}
                onChange={(e) => setApproveDoctorId(e.target.value)}
              >
                <option value="">— اختر الطبيب —</option>
                {doctors.map((d) => {
                  const u = d.user as { id?: number; name?: string }
                  return (
                    <option key={String(u?.id)} value={String(u?.id)}>
                      {String(u?.name ?? 'طبيب')} (#{String(u?.id ?? '')})
                    </option>
                  )
                })}
              </select>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-white/55">تاريخ ووقت الموعد (توقيت سوريا)</span>
                <input
                  type="datetime-local"
                  required
                  className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                  value={approveWhen}
                  onChange={(e) => setApproveWhen(e.target.value)}
                />
              </label>
              <SubmitButton
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
                type="button"
                busy={approveLock.busy}
                onClick={() => void onApproveTarget()}
                className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-white"
              >
                تأكيد الاعتماد والجدولة
              </SubmitButton>
            </div>
          </div>
        </div>
      ) : null}

      {showRescheduleDialog && rescheduleTargetId && rescheduleTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-amber-300/25 bg-slate-950 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">
                {isPendingApprovalRequest(rescheduleTarget) ? 'تعديل وقت الطلب' : 'اقتراح تعديل موعد'} #{rescheduleTargetId}
              </h4>
              <button
                type="button"
                onClick={() => {
                  setShowRescheduleDialog(false)
                  setRescheduleTargetId(null)
                  setRescheduleTarget(null)
                }}
                className="rounded-lg border border-white/20 px-3 py-1 text-xs"
              >
                إغلاق
              </button>
            </div>
            <div className="space-y-3">
<<<<<<< HEAD
              {isPendingApprovalRequest(rescheduleTarget) ? (
                <>
                  <p className="text-xs text-white/55">
                    يُحدَّث وقت هذا الطلب فقط. الطبيب يبقى كما اختاره المستفيد.
                  </p>
                  <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
                    <p className="text-[10px] text-white/45">الطبيب</p>
                    <p className="mt-1 text-sm font-medium text-white">
                      {String((rescheduleTarget.doctor as { name?: string } | undefined)?.name ?? '—')}
                    </p>
                  </div>
                </>
              ) : (
                <select
                  className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                  value={rescheduleDoctorId}
                  onChange={(e) => setRescheduleDoctorId(e.target.value)}
                >
                  <option value="">— اختر الطبيب —</option>
                  {doctors.map((d) => {
                    const u = d.user as { id?: number; name?: string }
                    return (
                      <option key={String(u?.id)} value={String(u?.id)}>
                        {String(u?.name ?? 'طبيب')} (#{String(u?.id ?? '')})
                      </option>
                    )
                  })}
                </select>
              )}
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                value={rescheduleWhen}
                onChange={(e) => setRescheduleWhen(e.target.value)}
              />
=======
              <select
                className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                value={rescheduleDoctorId}
                onChange={(e) => setRescheduleDoctorId(e.target.value)}
              >
                <option value="">— اختر الطبيب —</option>
                {doctors.map((d) => {
                  const u = d.user as { id?: number; name?: string }
                  return (
                    <option key={String(u?.id)} value={String(u?.id)}>
                      {String(u?.name ?? 'طبيب')} (#{String(u?.id ?? '')})
                    </option>
                  )
                })}
              </select>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-white/55">الموعد البديل (توقيت سوريا)</span>
                <input
                  type="datetime-local"
                  required
                  className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                  value={rescheduleWhen}
                  onChange={(e) => setRescheduleWhen(e.target.value)}
                />
              </label>
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
              <input
                className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                placeholder="ملاحظة (اختياري)"
                value={rescheduleNote}
                onChange={(e) => setRescheduleNote(e.target.value)}
              />
              <SubmitButton
                type="button"
                busy={rescheduleLock.busy}
                onClick={() => void onProposeReschedule()}
                className="w-full rounded-lg bg-amber-700 px-4 py-2 text-white"
              >
<<<<<<< HEAD
                {isPendingApprovalRequest(rescheduleTarget) ? 'حفظ الوقت الجديد' : 'إرسال اقتراح التعديل'}
=======
                إرسال اقتراح التعديل
              </SubmitButton>
            </div>
          </div>
        </div>
      ) : null}

      {detailAppointment ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-sky-300/25 bg-slate-950 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">تفاصيل الموعد #{String(detailAppointment.id)}</h4>
              <button
                type="button"
                onClick={() => {
                  setDetailAppointment(null)
                  setFocusedAppointmentId(null)
                }}
                className="rounded-lg border border-white/20 px-3 py-1 text-xs"
              >
                إغلاق
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
              </button>
            </div>
            {(() => {
              const ben = detailAppointment.beneficiary as
                | { id?: number; name?: string; phone?: string; national_id?: string; family?: { family_code?: string; head_name?: string; phone?: string; address?: string } }
                | undefined
              const doc = detailAppointment.doctor as { name?: string } | undefined
              const st = String(detailAppointment.status ?? '')
              const workflow = String(detailAppointment.workflow_status ?? '')
              return (
                <div className="space-y-3 text-sm text-white/85">
                  <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-3">
                    <p className="text-[11px] text-white/45">المريض</p>
                    <p className="mt-1 font-semibold text-white">{String(ben?.name ?? '—')}</p>
                    <p className="mt-1 text-xs text-white/60">رقم المستفيد: #{String(ben?.id ?? detailAppointment.beneficiary_id ?? '—')}</p>
                    <p className="mt-1 text-xs text-white/60">الهاتف: {String(ben?.phone ?? ben?.family?.phone ?? '—')}</p>
                    <p className="mt-1 text-xs text-white/60">الرقم الوطني: {String(ben?.national_id ?? '—')}</p>
                    <p className="mt-1 text-xs text-white/60">
                      العائلة: {String(ben?.family?.head_name ?? '—')} ({String(ben?.family?.family_code ?? '—')})
                    </p>
                    {ben?.family?.address ? (
                      <p className="mt-1 text-xs text-white/60">العنوان: {String(ben.family.address)}</p>
                    ) : null}
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-3">
                    <p className="text-[11px] text-white/45">الموعد</p>
                    <p className="mt-1 text-xs">الطبيب: {String(doc?.name ?? '—')}</p>
                    <p className="mt-1 text-xs">الوقت: {formatDateTimeAr(detailAppointment.scheduled_at as string | undefined)}</p>
                    <p className="mt-1 text-xs">الحالة: {apptStatusAr(st, workflow)}</p>
                    <p className="mt-1 text-xs">السبب: {String(detailAppointment.reason ?? '—')}</p>
                    {detailAppointment.requested_specialty ? (
                      <p className="mt-1 text-xs">التخصص المطلوب: {String(detailAppointment.requested_specialty)}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {st === 'pending' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setApproveTargetId(Number(detailAppointment.id))
                          setApproveDoctorId(
                            String((detailAppointment.doctor as { id?: number } | undefined)?.id ?? selectedDoctorId),
                          )
                          setApproveWhen(
                            toDateTimeLocalValue((detailAppointment.scheduled_at as string | undefined) ?? null) ||
                              nowDateTimeLocal(60),
                          )
                          setShowApproveDialog(true)
                        }}
                        className="rounded-lg bg-emerald-700 px-3 py-2 text-xs text-white"
                      >
                        اعتماد الموعد
                      </button>
                    ) : null}
                    {st === 'scheduled' || st === 'pending' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setRescheduleTargetId(Number(detailAppointment.id))
                          setRescheduleDoctorId(
                            String((detailAppointment.doctor as { id?: number } | undefined)?.id ?? selectedDoctorId),
                          )
                          setRescheduleWhen(
                            toDateTimeLocalValue((detailAppointment.scheduled_at as string | undefined) ?? null) ||
                              nowDateTimeLocal(120),
                          )
                          setShowRescheduleDialog(true)
                        }}
                        className="rounded-lg bg-amber-700 px-3 py-2 text-xs text-white"
                      >
                        تعديل الموعد
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      ) : null}
    </div>
  )
}
