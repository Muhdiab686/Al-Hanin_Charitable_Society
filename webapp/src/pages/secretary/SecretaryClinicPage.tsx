import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import { WEEKDAY_OPTIONS } from '../../constants/medicalSpecialties'
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

  const m: Record<string, string> = {
    scheduled: 'مجدول',
    cancelled: 'ملغى',
    completed: 'مُنجَز',
  }

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
}

function staffRoleAr(r: string): string {
  return r === 'doctor' ? 'طبيب' : r === 'secretary' ? 'سكرتيرة / إداري' : r
}

export function SecretaryClinicPage() {
  const [staff, setStaff] = useState<Record<string, unknown>[]>([])
  const [appts, setAppts] = useState<Record<string, unknown>[]>([])
  const [apptPage, setApptPage] = useState(1)
  const [apptLast, setApptLast] = useState(1)
  const [apptFilter, setApptFilter] = useState('')
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
  const [when, setWhen] = useState(() => new Date().toISOString().slice(0, 16))

  const [cancelReason, setCancelReason] = useState('طلب المستفيد')
  const [candidates, setCandidates] = useState<{ id: number; name: string; email: string; role: string }[]>([])
  const [showStaffDialog, setShowStaffDialog] = useState(false)
  const [showCreateApptDialog, setShowCreateApptDialog] = useState(false)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [approveTargetId, setApproveTargetId] = useState<number | null>(null)
  const [approveTarget, setApproveTarget] = useState<Record<string, unknown> | null>(null)
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null)
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false)
  const [rescheduleTargetId, setRescheduleTargetId] = useState<number | null>(null)
  const [rescheduleTarget, setRescheduleTarget] = useState<Record<string, unknown> | null>(null)
  const [rescheduleDoctorId, setRescheduleDoctorId] = useState('')
  const [rescheduleWhen, setRescheduleWhen] = useState(() => new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16))
  const [rescheduleNote, setRescheduleNote] = useState('')
  const [approveDialogErr, setApproveDialogErr] = useState<string | null>(null)
  const [beneficiaries, setBeneficiaries] = useState<Record<string, unknown>[]>([])

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

  async function loadAppts(page: number) {
    const params: { page: number; status?: string } = { page }

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
      await loadAppts(apptPage)
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
    void loadAppts(apptPage).catch((e: unknown) =>
      setErr(extractErrorMessage(e as Error, 'تعذّر تحميل المواعيد')),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apptPage, apptFilter])

  async function onUpsertStaff(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
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
  }

  async function onCreateAppt(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    try {
      await api.createAppointment({
        beneficiary_id: Number(benId),
        doctor_id: Number(docId),
        scheduled_at: new Date(when).toISOString(),
        reason,
      })
      setMsg('تم جدولة الموعد.')
      setShowCreateApptDialog(false)
      await loadAppts(1)
      setApptPage(1)
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'فشل إنشاء الموعد'))
    }
  }

  async function onCancelTarget() {
    if (!cancelTargetId) {
      return
    }
    setMsg(null)
    setErr(null)
    try {
      await api.cancelAppointment(cancelTargetId, { cancellation_reason: cancelReason })
      setMsg('تم إلغاء الموعد.')
      setCancelTargetId(null)
      await loadAppts(apptPage)
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'فشل الإلغاء'))
    }
  }

  async function onApproveTarget() {
    if (!approveTargetId) {
      return
    }
    setMsg(null)
    setErr(null)
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
          <h3 className="text-base font-semibold text-white">المواعيد</h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowCreateApptDialog(true)}
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
              disabled={apptPage <= 1}
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
              disabled={apptPage >= apptLast}
              onClick={() => setApptPage((p) => p + 1)}
              className="rounded-lg border border-white/15 px-2 py-1 text-xs disabled:opacity-40"
            >
              التالي
            </button>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[720px] border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-white/10 bg-black/35 text-[10px] uppercase text-white/45">
                <th className="px-3 py-2.5 font-semibold text-start">#</th>
                <th className="px-3 py-2.5 font-semibold text-start">المستفيد</th>
                <th className="px-3 py-2.5 font-semibold text-start">الطبيب</th>
                <th className="px-3 py-2.5 font-semibold text-start">الموعد</th>
                <th className="px-3 py-2.5 font-semibold text-start">الحالة</th>
                <th className="px-3 py-2.5 font-semibold text-start">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {appts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-white/45">
                    لا مواعيد ضمن التصفية الحالية.
                  </td>
                </tr>
              ) : (
                appts.map((a, idx) => {
                  const st = String(a.status ?? '')
                  const wf = String(a.workflow_status ?? '')
                  const ben = a.beneficiary as { name?: string } | undefined
                  const doc = a.doctor as { name?: string } | undefined
                  const showApprove = canApproveAppointment(a)
                  const pendingApproval = isPendingApprovalRequest(a)

                  return (
                    <tr key={String(a.id)} className={`border-b border-white/[0.06] ${idx % 2 === 0 ? 'bg-black/12' : ''}`}>
                      <td className="whitespace-nowrap px-3 py-2 font-mono">{String(a.id)}</td>
                      <td className="px-3 py-2">{String(ben?.name ?? '—')}</td>
                      <td className="px-3 py-2">{String(doc?.name ?? '—')}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-white/72">{String(a.scheduled_at)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ring-1 ${
                            st === 'scheduled'
                              ? 'bg-sky-500/15 text-sky-100 ring-sky-400/35'
                              : st === 'cancelled'
                                ? 'bg-rose-500/15 text-rose-100 ring-rose-400/35'
                                : wf === 'reschedule_proposed'
                                  ? 'bg-amber-500/15 text-amber-100 ring-amber-400/35'
                                  : 'bg-emerald-500/12 text-emerald-100 ring-emerald-400/30'
                          }`}
                        >
                          {apptStatusAr(a)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {showApprove ? (
                            <button
                              type="button"
                              onClick={() => {
                                setApproveTargetId(Number(a.id))
                                setApproveTarget(a)
                                setApproveDialogErr(null)
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
                          {(pendingApproval || st === 'scheduled') ? (
                            <button
                              type="button"
                              onClick={() => {
                                setRescheduleTargetId(Number(a.id))
                                setRescheduleTarget(a)
                                setRescheduleDoctorId(String((a.doctor as { id?: number } | undefined)?.id ?? a.doctor_id ?? ''))
                                setRescheduleWhen(toDatetimeLocalValue(a.scheduled_at))
                                setRescheduleNote('')
                                setShowRescheduleDialog(true)
                              }}
                              className="rounded-md bg-amber-700/80 px-2 py-1 text-[11px] text-white hover:bg-amber-600"
                            >
                              {pendingApproval ? 'تعديل الوقت' : 'اقتراح تعديل'}
                            </button>
                          ) : null}
                          {!showApprove && st !== 'scheduled' && wf !== 'reschedule_proposed' && st !== 'pending' ? (
                            <span className="text-white/38">—</span>
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
              <button type="submit" className="rounded-lg bg-violet-600 py-2.5 font-medium text-white sm:col-span-2">
                حفظ أو تحديث الملف
              </button>
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
              <input
                type="datetime-local"
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white sm:col-span-2"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
              />
              <input
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white sm:col-span-2"
                placeholder="سبب الزيارة / الملاحظة"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <button type="submit" className="rounded-lg bg-teal-600 py-2.5 font-medium text-white sm:col-span-2">
                تأكيد الحجز
              </button>
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
              <button type="button" onClick={() => void onCancelTarget()} className="w-full rounded-lg bg-rose-700 px-4 py-2 text-white">
                تأكيد الإلغاء
              </button>
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
                type="button"
                onClick={() => void onApproveTarget()}
                className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-white"
              >
                تأكيد الاعتماد والجدولة
              </button>
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
              <input
                className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                placeholder="ملاحظة (اختياري)"
                value={rescheduleNote}
                onChange={(e) => setRescheduleNote(e.target.value)}
              />
              <button
                type="button"
                onClick={() => void onProposeReschedule()}
                className="w-full rounded-lg bg-amber-700 px-4 py-2 text-white"
              >
                {isPendingApprovalRequest(rescheduleTarget) ? 'حفظ الوقت الجديد' : 'إرسال اقتراح التعديل'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
