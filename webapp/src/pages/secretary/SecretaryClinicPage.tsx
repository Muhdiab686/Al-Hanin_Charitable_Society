import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import type { Paginated } from '../../types/models'

function apptStatusAr(s: string): string {
  const m: Record<string, string> = {
    scheduled: 'مجدول',
    cancelled: 'ملغى',
    completed: 'مُنجَز',
  }
  return m[s] ?? s
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

  const [benId, setBenId] = useState('')
  const [docId, setDocId] = useState('')
  const [reason, setReason] = useState('متابعة دورية')
  const [when, setWhen] = useState(() => new Date().toISOString().slice(0, 16))

  const [cancelReason, setCancelReason] = useState('طلب المستفيد')
  const [showStaffDialog, setShowStaffDialog] = useState(false)
  const [showCreateApptDialog, setShowCreateApptDialog] = useState(false)
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null)

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
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر التحميل'))
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apptPage/filter applied via dedicated effects
  }, [])

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
                  const ben = a.beneficiary as { name?: string } | undefined
                  const doc = a.doctor as { name?: string } | undefined

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
                                : 'bg-emerald-500/12 text-emerald-100 ring-emerald-400/30'
                          }`}
                        >
                          {apptStatusAr(st)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {st === 'scheduled' ? (
                          <button
                            type="button"
                            onClick={() => setCancelTargetId(Number(a.id))}
                            className="rounded-md bg-rose-700/80 px-2 py-1 text-[11px] text-white hover:bg-rose-600"
                          >
                            إلغاء
                          </button>
                        ) : (
                          <span className="text-white/38">—</span>
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
                <span className="text-[11px] text-white/52">معرّف المستخدم في النظام (الطبيب أو السكرتيرة)</span>
                <input
                  className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                  placeholder="user_id"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
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
              <input
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                placeholder="معرّف المستفيد"
                value={benId}
                onChange={(e) => setBenId(e.target.value)}
              />
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
    </div>
  )
}
