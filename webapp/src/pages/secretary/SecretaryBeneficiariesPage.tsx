import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import type { Paginated } from '../../types/models'

const ENROLL_AR: { value: string; label: string }[] = [
  { value: 'draft', label: 'مسودة' },
  { value: 'pending_board', label: 'بانتظار اللجنة' },
  { value: 'approved', label: 'معتمدة' },
  { value: 'rejected', label: 'مرفوضة' },
]

export function SecretaryBeneficiariesPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [totalBeneficiaries, setTotalBeneficiaries] = useState(0)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  const [headName, setHeadName] = useState('')
  const [famPhone, setFamPhone] = useState('')
  const [famAddress, setFamAddress] = useState('')
  const [members, setMembers] = useState('4')
  const [famIncome, setFamIncome] = useState('')
  const [famEnrollNew, setFamEnrollNew] = useState<'draft' | 'pending_board'>('pending_board')

  const [bName, setBName] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [benPhone, setBenPhone] = useState('')
  const [benDob, setBenDob] = useState('')
  const [benNotes, setBenNotes] = useState('')

  const [editId, setEditId] = useState('')
  const [editName, setEditName] = useState('')
  const [editNationalId, setEditNationalId] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editDob, setEditDob] = useState('')

  const [famEnrollId, setFamEnrollId] = useState('')
  const [enrollStatus, setEnrollStatus] = useState('pending_board')

  const [famProfileId, setFamProfileId] = useState('')
  const [profHead, setProfHead] = useState('')
  const [profPhone, setProfPhone] = useState('')
  const [profAddress, setProfAddress] = useState('')
  const [profMembers, setProfMembers] = useState('')
  const [profIncome, setProfIncome] = useState('')

  const [walletBenId, setWalletBenId] = useState('')
  const [walletJson, setWalletJson] = useState('')
  const [creditAmt, setCreditAmt] = useState('10')

  const [eligFamId, setEligFamId] = useState('')
  const [hasIncome, setHasIncome] = useState('0')
  const [pauseReason, setPauseReason] = useState('')

  const [qrFamilyId, setQrFamilyId] = useState('')
  const [qrImg, setQrImg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)

    try {
      const res = (await api.fetchBeneficiaries({ page })) as Paginated<Record<string, unknown>>
      setRows((res.data as Record<string, unknown>[]) ?? [])
      setLastPage(Math.max(1, res.last_page))
      setTotalBeneficiaries(res.total ?? 0)
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر التحميل'))
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    void load()
  }, [load])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    const nid = nationalId.trim() || `NID${Date.now()}`

    try {
      await api.createBeneficiary({
        family: {
          head_name: headName.trim(),
          phone: famPhone.trim() || null,
          address: famAddress.trim() || null,
          members_count: Number(members),
          monthly_income: famIncome.trim() ? Number(famIncome) : 0,
          enrollment_status: famEnrollNew,
        },
        beneficiary: {
          national_id: nid,
          name: bName.trim(),
          is_head_of_family: true,
          phone: benPhone.trim() || null,
          date_of_birth: benDob.trim() || null,
          notes: benNotes.trim() || null,
        },
      })
      setMsg('تم تسجيل المستفيد والعائلة.')
      setShowCreateDialog(false)
      setNationalId('')
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex as Error, 'فشل الإنشاء'))
    }
  }

  async function onPatchBeneficiary(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)

    try {
      const payload: Record<string, unknown> = {}

      if (editName.trim()) {
        payload.name = editName.trim()
      }

      if (editNationalId.trim()) {
        payload.national_id = editNationalId.trim()
      }

      if (editPhone.trim()) {
        payload.phone = editPhone.trim()
      }

      if (editDob.trim()) {
        payload.date_of_birth = editDob.trim()
      }

      await api.updateBeneficiary(Number(editId), payload)
      setMsg('تم تحديث بيانات المستفيد.')
      setShowEditDialog(false)
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex as Error, 'فشل التحديث'))
    }
  }

  async function onRecalc() {
    setMsg(null)
    setErr(null)

    try {
      await api.recalculateBeneficiaryCategory(Number(editId))
      setMsg('تمت إعادة حساب الفئة.')
    } catch (ex) {
      setErr(extractErrorMessage(ex as Error, 'فشل'))
    }
  }

  async function onEnrollment(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)

    try {
      await api.updateFamilyEnrollmentStatus(Number(famEnrollId), {
        enrollment_status: enrollStatus,
      })
      setMsg('تم تحديث حالة تسجيل العائلة.')
    } catch (ex) {
      setErr(extractErrorMessage(ex as Error, 'تحقق من الصلاحيات لاعتماد/رفض اللجنة'))
    }
  }

  async function onLoadWallet(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)

    try {
      const w = await api.fetchBeneficiaryMedicalWallet(Number(walletBenId))
      setWalletJson(JSON.stringify(w, null, 2))
    } catch (ex) {
      setErr(extractErrorMessage(ex as Error, 'فشل عرض المحفظة'))
    }
  }

  async function onCredit(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)

    try {
      await api.creditBeneficiaryMedicalWallet(Number(walletBenId), {
        amount: Number(creditAmt),
        notes: 'إضافة رصيد — سكرتير',
      })
      setMsg('تم إضافة رصيد المحفظة الطبية.')
    } catch (ex) {
      setErr(extractErrorMessage(ex as Error, 'فشل الإضافة'))
    }
  }

  async function onEligibility(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    const hi = hasIncome === '1'

    try {
      await api.updateFamilyAidEligibility(Number(eligFamId), {
        has_direct_income: hi,
        aid_pause_reason: hi ? pauseReason.trim() || 'دخل مباشر مسجَّل' : undefined,
      })
      setMsg('تم ضبط أهلية الدعم (دخل مباشر).')
    } catch (ex) {
      setErr(extractErrorMessage(ex as Error, 'فشل تحديث الأهلية'))
    }
  }

  async function onProfile(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)

    try {
      const payload: Record<string, unknown> = {}

      if (profHead.trim()) {
        payload.head_name = profHead.trim()
      }

      if (profPhone.trim()) {
        payload.phone = profPhone.trim()
      }

      if (profAddress.trim()) {
        payload.address = profAddress.trim()
      }

      if (profMembers.trim()) {
        payload.members_count = Number(profMembers)
      }

      if (profIncome.trim()) {
        payload.monthly_income = Number(profIncome)
      }

      await api.updateFamilyProfile(Number(famProfileId), payload)
      setMsg('تم تحديث بيانات أسرة المستفيد.')
      setShowEditDialog(false)
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex as Error, 'فشل تحديث العائلة'))
    }
  }

  async function onQr(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)

    try {
      const r = await api.fetchFamilyQrCode(Number(qrFamilyId))
      setQrImg(`data:${r.mime_type};base64,${r.png_base64}`)
      setMsg('تم تحميل رمز الاستجابة للعائلة المعتمدة.')
    } catch (ex) {
      setErr(extractErrorMessage(ex as Error, 'التسجيل يجب أن يكون معتمداً لإصدار QR'))
      setQrImg(null)
    }
  }

  function openEditDialogForRow(row: Record<string, unknown>) {
    const family = row.family as { id?: number } | undefined
    setEditId(String(row.id ?? ''))
    setEditName(String((row as { name?: string }).name ?? ''))
    setEditNationalId(String(row.national_id ?? ''))
    setEditPhone(String(row.phone ?? ''))
    setEditDob(String(row.date_of_birth ?? ''))
    setFamProfileId(String(family?.id ?? ''))
    setShowEditDialog(true)
  }

  return (
    <div className="space-y-8 text-sm">
      {(msg || err) && (
        <div
          className={`rounded-xl px-4 py-3 ${err ? 'border border-red-400/35 bg-red-500/14 text-red-50' : 'border border-emerald-400/35 bg-emerald-500/12 text-emerald-50'}`}
        >
          {err ?? msg}
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-white">سجلّ المستفيدين</h2>
            <p className="mt-1 text-xs text-white/52">إضافة مستفيد/أسرة وتعديل البيانات عبر نوافذ Dialog.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowCreateDialog(true)}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
            >
              + إضافة مستفيد
            </button>
            <button
              type="button"
              onClick={() => setShowEditDialog(true)}
              className="rounded-lg border border-violet-300/30 bg-violet-600/25 px-4 py-2 text-xs font-semibold text-white"
            >
              تعديل مستفيد/أسرة
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-white/50">
            {totalBeneficiaries > 0 ? (
              <>
                {totalBeneficiaries} نتيجة — صفحة {page}/{lastPage}
              </>
            ) : loading ? null : (
              <>لا نتائج.</>
            )}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="rounded-lg border border-white/15 px-3 py-1 text-xs disabled:opacity-40"
            >
              السابق
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= lastPage || loading}
              className="rounded-lg border border-white/15 px-3 py-1 text-xs disabled:opacity-40"
            >
              التالي
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[760px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-black/30 text-[10px] uppercase tracking-wide text-white/45">
                <th className="px-3 py-2.5 font-semibold">المستفيد</th>
                <th className="px-3 py-2.5 font-semibold">رقم وطني</th>
                <th className="px-3 py-2.5 font-semibold">كود العائلة</th>
                <th className="px-3 py-2.5 font-semibold">عائلة #</th>
                <th className="px-3 py-2.5 font-semibold">مستفيد #</th>
                <th className="px-3 py-2.5 font-semibold">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center text-white/50">
                    جاري التحميل…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center text-white/45">
                    لا سجلات.
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => {
                  const fam = r.family as { id?: number; family_code?: string } | undefined

                  return (
                    <tr
                      key={String(r.id)}
                      className={`border-b border-white/[0.06] ${idx % 2 === 0 ? 'bg-black/15' : ''}`}
                    >
                      <td className="px-3 py-2.5 font-medium text-white">{String((r as { name?: string }).name ?? '—')}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[12px]">{String(r.national_id ?? '—')}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-violet-200/95">{String(fam?.family_code ?? '—')}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{String(fam?.id ?? '—')}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-white/65">#{String(r.id)}</td>
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => openEditDialogForRow(r)}
                          className="rounded-lg border border-white/20 px-2 py-1 text-[11px] text-white hover:bg-white/10"
                        >
                          تعديل
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white">مسار قبول الأسرة على اللجنة</h2>
        <form className="mt-4 flex flex-wrap items-end gap-2" onSubmit={onEnrollment}>
          <input
            className="w-32 rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            placeholder="رقم العائلة"
            value={famEnrollId}
            onChange={(e) => setFamEnrollId(e.target.value)}
          />
          <select
            className="rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            value={enrollStatus}
            onChange={(e) => setEnrollStatus(e.target.value)}
          >
            {ENROLL_AR.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-lg bg-amber-600 px-4 py-2 text-white">
            تحديث المسار
          </button>
        </form>
        <p className="mt-3 text-[11px] text-white/45">
          الموافقة النهائية أو الرفض يتطلّبان صلاحية مراجعة اللجنة؛ بقية المسارات المتاحة لمسؤولي التسجيل.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white">أهلية المساعدات (وجود دخل مباشر)</h2>
        <form className="mt-4 flex flex-wrap gap-2" onSubmit={onEligibility}>
          <input
            className="w-32 rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            placeholder="رقم العائلة"
            value={eligFamId}
            onChange={(e) => setEligFamId(e.target.value)}
          />
          <select
            className="rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            value={hasIncome}
            onChange={(e) => setHasIncome(e.target.value)}
          >
            <option value="0">لا يوجد دخل مباشر</option>
            <option value="1">وجود دخل مباشر (إيقاف/تقييد المحتمل للمساعدة)</option>
          </select>
          <input
            className="min-w-[200px] flex-1 rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            placeholder="ملاحظة الإيقاف"
            value={pauseReason}
            onChange={(e) => setPauseReason(e.target.value)}
          />
          <button type="submit" className="rounded-lg bg-rose-900/70 px-4 py-2 text-white">
            حفظ
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white">المحفظة الطبية ورصيد الوصفات</h2>
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={onLoadWallet}>
          <input
            className="w-32 rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            placeholder="beneficiary id"
            value={walletBenId}
            onChange={(e) => setWalletBenId(e.target.value)}
          />
          <button type="submit" className="rounded-lg bg-white/10 px-4 py-2">
            عرض JSON
          </button>
        </form>
        {walletJson ? (
          <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-black/40 p-3 text-xs text-emerald-100">
            {walletJson}
          </pre>
        ) : null}
        <form className="mt-4 flex flex-wrap gap-2" onSubmit={onCredit}>
          <input
            className="w-28 rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            placeholder="مبلغ الرصيد"
            value={creditAmt}
            onChange={(e) => setCreditAmt(e.target.value)}
          />
          <button type="submit" className="rounded-lg bg-teal-700 px-4 py-2 text-xs">
            إضافة رصيد تحضيري للوصفات
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white">رمز QR للأسرة المعتمدة</h2>
        <form className="mt-4 flex flex-wrap gap-2" onSubmit={onQr}>
          <input
            className="w-32 rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            placeholder="رقم العائلة"
            value={qrFamilyId}
            onChange={(e) => setQrFamilyId(e.target.value)}
          />
          <button type="submit" className="rounded-lg bg-white/10 px-4 py-2">
            تحميل
          </button>
        </form>
        {qrImg ? <img src={qrImg} alt="رمز الأسرة" className="mt-4 max-w-xs rounded-xl border border-white/10" /> : null}
      </section>

      {showCreateDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-emerald-300/25 bg-slate-950 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-emerald-100">إضافة مستفيد وعائلة</h2>
              <button
                type="button"
                onClick={() => setShowCreateDialog(false)}
                className="rounded-lg border border-white/20 px-3 py-1 text-xs text-white"
              >
                إغلاق
              </button>
            </div>
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={onCreate}>
              <h3 className="border-b border-white/10 pb-1 text-[13px] font-semibold text-white sm:col-span-2">بيانات الأسرة</h3>
              <input
                required
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white sm:col-span-2"
                placeholder="اسم رب الأسرة *"
                value={headName}
                onChange={(e) => setHeadName(e.target.value)}
              />
              <input
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                placeholder="هاتف العائلة"
                value={famPhone}
                onChange={(e) => setFamPhone(e.target.value)}
              />
              <input
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                placeholder="عدد الأفراد *"
                value={members}
                onChange={(e) => setMembers(e.target.value)}
              />
              <input
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white sm:col-span-2"
                placeholder="العنوان"
                value={famAddress}
                onChange={(e) => setFamAddress(e.target.value)}
              />
              <input
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                placeholder="دخل شهري تقديري"
                value={famIncome}
                onChange={(e) => setFamIncome(e.target.value)}
              />
              <select
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                value={famEnrollNew}
                onChange={(e) => setFamEnrollNew(e.target.value as 'draft' | 'pending_board')}
              >
                <option value="pending_board">إرسال مباشرة إلى اللجنة (بانتظار القرار)</option>
                <option value="draft">مسودة داخلية</option>
              </select>

              <h3 className="mt-2 border-b border-white/10 pb-1 text-[13px] font-semibold text-white sm:col-span-2">بيانات المستفيد</h3>
              <input
                required
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white sm:col-span-2"
                placeholder="اسم المستفيد الكامل *"
                value={bName}
                onChange={(e) => setBName(e.target.value)}
              />
              <input
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                placeholder="رقم وطني (اختياري)"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
              />
              <input
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                placeholder="جوال المستفيد"
                value={benPhone}
                onChange={(e) => setBenPhone(e.target.value)}
              />
              <input
                type="date"
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white sm:col-span-2"
                value={benDob}
                onChange={(e) => setBenDob(e.target.value)}
              />
              <textarea
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white sm:col-span-2"
                placeholder="ملاحظات"
                rows={2}
                value={benNotes}
                onChange={(e) => setBenNotes(e.target.value)}
              />
              <button type="submit" className="rounded-lg bg-emerald-600 py-2.5 font-semibold text-white sm:col-span-2">
                حفظ التسجيل
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {showEditDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-violet-300/25 bg-slate-950 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-violet-100">تعديل مستفيد / أسرة</h2>
              <button
                type="button"
                onClick={() => setShowEditDialog(false)}
                className="rounded-lg border border-white/20 px-3 py-1 text-xs text-white"
              >
                إغلاق
              </button>
            </div>

            <form className="grid gap-2 sm:grid-cols-2" onSubmit={onPatchBeneficiary}>
              <h3 className="border-b border-white/10 pb-1 text-[13px] font-semibold text-white sm:col-span-2">بيانات المستفيد</h3>
              <input
                required
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white sm:col-span-2"
                placeholder="معرّف المستفيد *"
                value={editId}
                onChange={(e) => setEditId(e.target.value)}
              />
              <input
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white sm:col-span-2"
                placeholder="الاسم"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
              <input
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                placeholder="رقم وطني"
                value={editNationalId}
                onChange={(e) => setEditNationalId(e.target.value)}
              />
              <input
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                placeholder="جوال"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
              <input
                type="date"
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white sm:col-span-2"
                value={editDob}
                onChange={(e) => setEditDob(e.target.value)}
              />
              <button type="submit" className="rounded-lg bg-violet-600 py-2 text-white sm:col-span-2">
                حفظ تعديل المستفيد
              </button>
              <button type="button" onClick={() => void onRecalc()} className="rounded-lg border border-white/20 px-3 py-2 text-xs sm:col-span-2">
                إعادة تصنيف تلقائية
              </button>
            </form>

            <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={onProfile}>
              <h3 className="border-b border-white/10 pb-1 text-[13px] font-semibold text-white sm:col-span-2">بيانات الأسرة</h3>
              <input
                required
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white sm:col-span-2"
                placeholder="معرّف العائلة *"
                value={famProfileId}
                onChange={(e) => setFamProfileId(e.target.value)}
              />
              <input
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white sm:col-span-2"
                placeholder="رب الأسرة"
                value={profHead}
                onChange={(e) => setProfHead(e.target.value)}
              />
              <input
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                placeholder="الهاتف"
                value={profPhone}
                onChange={(e) => setProfPhone(e.target.value)}
              />
              <input
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                placeholder="عدد الأفراد"
                value={profMembers}
                onChange={(e) => setProfMembers(e.target.value)}
              />
              <input
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white sm:col-span-2"
                placeholder="العنوان"
                value={profAddress}
                onChange={(e) => setProfAddress(e.target.value)}
              />
              <input
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white sm:col-span-2"
                placeholder="الدخل الشهري"
                value={profIncome}
                onChange={(e) => setProfIncome(e.target.value)}
              />
              <button type="submit" className="rounded-lg bg-sky-600 py-2 text-white sm:col-span-2">
                حفظ تعديل الأسرة
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <footer className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-[11px] text-white/50">
        <strong className="text-white/65">ملاحظة:</strong> تسجيل الدخول والخروج متاح عامّةً من قائمة الهوية في أعلى الصفحة.
      </footer>
    </div>
  )
}
