import { type FormEvent, useEffect, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import type { Paginated } from '../../types/models'

function rowsForBeneficiary<T extends Record<string, unknown>>(rows: T[], beneficiaryId: number): T[] {
  return rows.filter((row) => {
    const direct = row.beneficiary_id
    if (typeof direct === 'number') {
      return direct === beneficiaryId
    }
    if (typeof direct === 'string' && direct.trim() !== '') {
      return Number.parseInt(direct, 10) === beneficiaryId
    }
    const ben = row.beneficiary as { id?: unknown } | undefined
    if (ben?.id != null) {
      return Number(ben.id) === beneficiaryId
    }

    return false
  })
}

export function SecretaryMedicalPage() {
  const [beneficiaryIdInput, setBeneficiaryIdInput] = useState('')
  const [beneficiaryOptions, setBeneficiaryOptions] = useState<Record<string, unknown>[]>([])
  const [activeBenId, setActiveBenId] = useState<number | null>(null)
  const [activeBeneficiary, setActiveBeneficiary] = useState<Record<string, unknown> | null>(null)

  const [records, setRecords] = useState<Record<string, unknown>[]>([])
  const [labs, setLabs] = useState<Record<string, unknown>[]>([])
  const [prescriptionRows, setPrescriptionRows] = useState<Record<string, unknown>[]>([])
  const [prescriptionReviewId, setPrescriptionReviewId] = useState('')
  const [prescriptionDecision, setPrescriptionDecision] = useState<'approved' | 'rejected'>('approved')
  const [prescriptionReviewNote, setPrescriptionReviewNote] = useState('')

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const [showPicker, setShowPicker] = useState(false)
  const [showLabDialog, setShowLabDialog] = useState(false)
  const [pickerRows, setPickerRows] = useState<Record<string, unknown>[]>([])
  const [pickerPage, setPickerPage] = useState(1)
  const [pickerLast, setPickerLast] = useState(1)
  const [pickerLoading, setPickerLoading] = useState(false)

  const [labTitle, setLabTitle] = useState('')
  const [labFindings, setLabFindings] = useState('')
  const [labFile, setLabFile] = useState<File | null>(null)

  useEffect(() => {
    void loadPickerPage(1)
    void loadPrescriptionRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadPickerPage(page: number) {
    setPickerLoading(true)
    setErr(null)
    try {
      const res = (await api.fetchBeneficiaries({ page })) as Paginated<Record<string, unknown>>
      setPickerRows((res.data as Record<string, unknown>[]) ?? [])
      if (page === 1) {
        setBeneficiaryOptions((res.data as Record<string, unknown>[]) ?? [])
      }
      setPickerLast(Math.max(1, res.last_page))
      setPickerPage(res.current_page ?? page)
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر تحميل قائمة المستفيدين'))
    } finally {
      setPickerLoading(false)
    }
  }

  async function loadPrescriptionRequests() {
    setErr(null)
    try {
      const res = await api.fetchMedicalPrescriptionRequests({
        page: 1,
        workflow_status: 'pending_secretary_review',
      })
      setPrescriptionRows((res.data as Record<string, unknown>[]) ?? [])
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر تحميل طلبات صرف الوصفات'))
    }
  }

  async function loadForBeneficiary(id: number): Promise<boolean> {
    setLoading(true)
    setErr(null)
    try {
      const { beneficiary: ben } = await api.fetchBeneficiary(id)

      const [recPage, labPage] = await Promise.all([
        api.fetchMedicalRecords({ beneficiary_id: id, page: 1 }),
        api.fetchBeneficiaryLabReports(id, { page: 1 }),
      ])

      const rawRecords =
        ((recPage as Paginated<Record<string, unknown>>).data as Record<string, unknown>[]) ?? []

      setRecords(rowsForBeneficiary(rawRecords, id))
      setLabs(((labPage as Paginated<Record<string, unknown>>).data as Record<string, unknown>[]) ?? [])
      setActiveBenId(id)
      setActiveBeneficiary(ben ?? null)

      return true
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر تحميل البيانات'))
      setActiveBenId(null)
      setActiveBeneficiary(null)
      setRecords([])
      setLabs([])

      return false
    } finally {
      setLoading(false)
    }
  }

  async function onLoadBeneficiary(e: FormEvent) {
    e.preventDefault()
    setMsg(null)

    const id = Number.parseInt(beneficiaryIdInput.trim(), 10)

    if (!Number.isFinite(id) || id < 1) {
      setErr('اختر مستفيداً صالحاً من القائمة.')

      return
    }

    const ok = await loadForBeneficiary(id)
    if (ok) {
      setMsg(`تم تحميل بيانات المستفيد #${id}.`)
    }
  }

  async function onUploadLab(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)

    if (!activeBenId) {
      setErr('حمِّل مستفيداً أولاً.')

      return
    }

    if (!labTitle.trim()) {
      setErr('أدخل عنواناً للتحليل.')

      return
    }

    if (!labFile) {
      setErr('اختر ملف PDF أو صورة للتقرير.')

      return
    }

    try {
      await api.uploadBeneficiaryLabReport(activeBenId, {
        title: labTitle.trim(),
        findings: labFindings.trim(),
        file: labFile,
      })
      setMsg('تم رفع تقرير المختبر وربطه بالمريض.')
      setShowLabDialog(false)
      setLabTitle('')
      setLabFindings('')
      setLabFile(null)
      await loadForBeneficiary(activeBenId)
    } catch (ex) {
      setErr(extractErrorMessage(ex as Error, 'رفع ملف مختبر لم ينجح'))
    }
  }

  async function onReviewPrescription(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    if (!prescriptionReviewId) {
      setErr('اختر طلب وصفة أولاً.')
      return
    }

    try {
      await api.reviewMedicalPrescription(Number(prescriptionReviewId), {
        decision: prescriptionDecision,
        review_note: prescriptionReviewNote.trim() || null,
      })
      setMsg(prescriptionDecision === 'approved' ? 'تمت الموافقة على صرف الوصفة.' : 'تم رفض صرف الوصفة.')
      setPrescriptionReviewId('')
      setPrescriptionReviewNote('')
      await loadPrescriptionRequests()
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر مراجعة طلب الوصفة'))
    }
  }

  return (
    <div className="space-y-10 text-sm text-white/80">
      <header className="space-y-2">
        <h2 className="text-xl font-bold text-white">الملف الطبي والتحاليل (سكرتير العيادة)</h2>
        <p className="max-w-prose text-[13px] leading-relaxed text-white/55">
          بعد اختيار مستفيد تُعرض فقط السجلات والمواعيد المجدولة له، ومعها تقارير المختبر من مسار هذا المريض فقط.
        </p>
      </header>

      {(msg || err) && (
        <div
          className={`rounded-xl px-4 py-3 ${err ? 'border border-red-400/35 bg-red-500/15 text-red-50' : 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-50'}`}
        >
          {err ?? msg}
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <h3 className="text-base font-semibold text-white">تحميل مستفيد</h3>
        <p className="mt-1 text-[11px] text-white/45">أدخل الرقم أو اختر اسماً من القائمة؛ يُعرض بعدها ملف هذا المريض فقط.</p>
        <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={onLoadBeneficiary}>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-white/50">المستفيد</span>
            <select
              className="min-w-[260px] rounded-lg border border-white/15 bg-slate-950/45 px-3 py-2 text-white"
              value={beneficiaryIdInput}
              onChange={(e) => setBeneficiaryIdInput(e.target.value)}
            >
              <option value="">اختر مستفيداً</option>
              {beneficiaryOptions.map((beneficiary) => (
                <option key={String(beneficiary.id)} value={String(beneficiary.id)}>
                  {String(beneficiary.name ?? 'مستفيد')} (#{String(beneficiary.id)})
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={loading} className="rounded-lg bg-violet-600 px-4 py-2 font-medium disabled:opacity-40">
            {loading ? '…' : 'تحميل'}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setShowPicker(true)
              void loadPickerPage(1)
            }}
            className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-medium text-white disabled:opacity-40"
          >
            اختر من القائمة
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-amber-300/20 bg-amber-500/10 p-5">
        <h3 className="text-base font-semibold text-white">طلبات صرف الوصفات (بانتظار قرار أمين السر)</h3>
        <p className="mt-1 text-xs text-white/55">
          تظهر هنا فقط السجلات التي أدخل فيها الطبيب وصفة مع تكلفة أكبر من صفر.
        </p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[720px] border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-white/10 bg-black/30 text-[10px] uppercase text-white/45">
                <th className="px-3 py-2 font-semibold text-start"># السجل</th>
                <th className="px-3 py-2 font-semibold text-start">المريض</th>
                <th className="px-3 py-2 font-semibold text-start">الطبيب</th>
                <th className="px-3 py-2 font-semibold text-start">تكلفة الوصفة</th>
                <th className="px-3 py-2 font-semibold text-start">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {prescriptionRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-white/45">
                    لا توجد طلبات وصفات بانتظار المراجعة حالياً.
                  </td>
                </tr>
              ) : (
                prescriptionRows.map((row, idx) => (
                  <tr key={String(row.id)} className={`border-b border-white/[0.06] ${idx % 2 === 0 ? 'bg-black/12' : ''}`}>
                    <td className="px-3 py-2 font-mono">#{String(row.id)}</td>
                    <td className="px-3 py-2">{String((row.beneficiary as { name?: string } | undefined)?.name ?? '—')}</td>
                    <td className="px-3 py-2">{String((row.doctor as { name?: string } | undefined)?.name ?? '—')}</td>
                    <td className="px-3 py-2 font-mono">{String(row.prescription_cost ?? '—')}</td>
                    <td className="px-3 py-2">{String(row.recorded_at ?? '—')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <form className="mt-4 grid gap-2 sm:grid-cols-3" onSubmit={onReviewPrescription}>
          <select
            className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
            value={prescriptionReviewId}
            onChange={(e) => setPrescriptionReviewId(e.target.value)}
          >
            <option value="">اختر طلب الوصفة</option>
            {prescriptionRows.map((row) => (
              <option key={String(row.id)} value={String(row.id)}>
                #{String(row.id)} — {String((row.beneficiary as { name?: string } | undefined)?.name ?? 'مريض')}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
            value={prescriptionDecision}
            onChange={(e) => setPrescriptionDecision(e.target.value as 'approved' | 'rejected')}
          >
            <option value="approved">موافقة على الصرف</option>
            <option value="rejected">رفض الصرف</option>
          </select>
          <input
            className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
            placeholder="ملاحظة (اختياري)"
            value={prescriptionReviewNote}
            onChange={(e) => setPrescriptionReviewNote(e.target.value)}
          />
          <button type="submit" className="rounded-lg bg-amber-700 py-2.5 font-medium text-white sm:col-span-3">
            حفظ القرار
          </button>
        </form>
      </section>

      {activeBenId && activeBeneficiary ? (
        <section className="rounded-2xl border border-violet-400/25 bg-violet-950/20 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-violet-200/75">المستفيد النشط</p>
          <p className="mt-1 text-lg font-semibold text-white">{String(activeBeneficiary.name ?? '—')}</p>
          <p className="mt-1 text-[12px] text-white/60">
            <span className="font-mono">#{activeBenId}</span>
            {activeBeneficiary.national_id ? (
              <span className="ms-3">وطني: {String(activeBeneficiary.national_id)}</span>
            ) : null}
            {(() => {
              const fam = activeBeneficiary.family as { family_code?: string } | undefined
              return fam?.family_code ? <span className="ms-3">أسرة: {String(fam.family_code)}</span> : null
            })()}
          </p>
        </section>
      ) : null}

      {activeBenId ? (
        <>
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-base font-semibold text-white">السجل الطبي (آخر الطلب)</h3>
              <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-white/[0.06]">
                <table className="w-full border-collapse text-start text-[12px]">
                  <thead>
                    <tr className="border-b border-white/10 bg-black/30 text-[10px] uppercase text-white/45">
                      <th className="px-3 py-2 font-semibold">المريض</th>
                      <th className="px-3 py-2 font-semibold">الموعد</th>
                      <th className="px-3 py-2 font-semibold">التشخيص</th>
                      <th className="px-3 py-2 font-semibold">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-white/45">
                          لا سجلات بعد.
                        </td>
                      </tr>
                    ) : (
                      records.map((r, idx) => (
                        <tr key={String(r.id)} className={`border-b border-white/[0.06] ${idx % 2 === 0 ? 'bg-black/12' : ''}`}>
                          <td className="max-w-[8rem] truncate px-3 py-2 text-white/85">
                            {String((r.beneficiary as { name?: string })?.name ?? '—')}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 font-mono text-white/85">#{String((r.appointment as { id?: number })?.id ?? '—')}</td>
                          <td className="max-w-[12rem] truncate px-3 py-2">{String(r.diagnosis ?? '—')}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-white/55">{String(r.recorded_at ?? '')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="rounded-2xl border border-teal-500/20 bg-teal-950/15 p-5">
              <h3 className="text-base font-semibold text-teal-100">تقارير المختبر المرفوعة</h3>
              <div className="mt-3 max-h-56 space-y-2 overflow-y-auto text-[12px]">
                {labs.length === 0 ? (
                  <p className="text-white/45">لم يُرفع تقرير مختبر لهذا المستفيد بعد.</p>
                ) : (
                  labs.map((lab) => (
                    <div key={String(lab.id)} className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
                      <p className="font-medium text-white">{String(lab.title)}</p>
                      {lab.attachment_original_name ? (
                        <p className="mt-1 text-[11px] text-white/52">ملف: {String(lab.attachment_original_name)}</p>
                      ) : null}
                      <p className="mt-1 text-[11px] text-emerald-200/80">{lab.findings ? String(lab.findings) : '—'}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-cyan-400/28 bg-black/25 p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-white">رفع تقرير مختبر ورَبْط بالمريض</h3>
              <button
                type="button"
                onClick={() => setShowLabDialog(true)}
                className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white"
              >
                فتح نموذج الرفع
              </button>
            </div>
          </section>
        </>
      ) : (
        <p className="text-center text-[13px] text-white/45">حمِّل مستفيداً لعرض الأقسام.</p>
      )}

      {showPicker ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-white/15 bg-slate-950 p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white">اختيار مستفيد</h3>
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="rounded-lg border border-white/20 px-3 py-1 text-xs text-white"
              >
                إغلاق
              </button>
            </div>
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                disabled={pickerPage <= 1 || pickerLoading}
                onClick={() => void loadPickerPage(Math.max(1, pickerPage - 1))}
                className="rounded-lg border border-white/15 px-3 py-1 text-xs disabled:opacity-40"
              >
                السابق
              </button>
              <span className="self-center text-[11px] text-white/50">
                صفحة {pickerPage}/{pickerLast}
              </span>
              <button
                type="button"
                disabled={pickerPage >= pickerLast || pickerLoading}
                onClick={() => void loadPickerPage(pickerPage + 1)}
                className="rounded-lg border border-white/15 px-3 py-1 text-xs disabled:opacity-40"
              >
                التالي
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-white/[0.06]">
              <table className="w-full min-w-[560px] border-collapse text-[12px]">
                <thead>
                  <tr className="border-b border-white/10 bg-black/35 text-[10px] uppercase text-white/45">
                    <th className="px-3 py-2 font-semibold text-start">المستفيد</th>
                    <th className="px-3 py-2 font-semibold text-start">#</th>
                    <th className="px-3 py-2 font-semibold text-start">وطني</th>
                    <th className="px-3 py-2 font-semibold text-start">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {pickerLoading ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-white/45">
                        جاري التحميل…
                      </td>
                    </tr>
                  ) : pickerRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-white/45">
                        لا صفوف.
                      </td>
                    </tr>
                  ) : (
                    pickerRows.map((row, idx) => {
                      const fam = row.family as { family_code?: string } | undefined

                      return (
                        <tr key={String(row.id)} className={`border-b border-white/[0.06] ${idx % 2 === 0 ? 'bg-black/12' : ''}`}>
                          <td className="px-3 py-2 font-medium text-white">{String(row.name ?? '—')}</td>
                          <td className="whitespace-nowrap px-3 py-2 font-mono">#{String(row.id)}</td>
                          <td className="whitespace-nowrap px-3 py-2 font-mono text-white/72">{String(row.national_id ?? '—')}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              className="rounded-md bg-violet-600 px-2 py-1 text-[11px] text-white"
                              onClick={() => {
                                const idNum = Number(row.id)
                                setBeneficiaryIdInput(String(row.id))
                                setShowPicker(false)
                                void (async () => {
                                  const ok = await loadForBeneficiary(idNum)
                                  if (ok) {
                                    setMsg(
                                      `تم اختيار المستفيد #${String(row.id)}${fam?.family_code ? ` — أسرة ${String(fam.family_code)}` : ''}.`,
                                    )
                                  }
                                })()
                              }}
                            >
                              تحميل
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {showLabDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-cyan-300/25 bg-slate-950 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">رفع تقرير مختبر ورَبْط بالمريض</h3>
              <button
                type="button"
                onClick={() => setShowLabDialog(false)}
                className="rounded-lg border border-white/20 px-3 py-1 text-xs text-white"
              >
                إغلاق
              </button>
            </div>
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={onUploadLab}>
              <input
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white sm:col-span-2"
                placeholder="عنوان التحليل *"
                value={labTitle}
                onChange={(e) => setLabTitle(e.target.value)}
              />
              <textarea
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white sm:col-span-2"
                placeholder="خلاصة النتائج / الملخص النصّي"
                rows={3}
                value={labFindings}
                onChange={(e) => setLabFindings(e.target.value)}
              />
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-[11px] text-white/52">مرفق (PDF أو صورة — حتى 10MB)</span>
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp,image/gif,.pdf,.png,.jpg,.jpeg,.webp,.gif"
                  className="text-[12px] text-white/80 file:mr-3 file:rounded-lg file:border-0 file:bg-white/15 file:px-3 file:py-1.5"
                  onChange={(e) => setLabFile(e.target.files?.[0] ?? null)}
                />
                {labFile ? (
                  <span className="text-[11px] text-cyan-200/80">المحدد: {labFile.name}</span>
                ) : (
                  <span className="text-[11px] text-white/40">اختَر ملفاً قبل الرفع</span>
                )}
              </label>
              <button
                type="submit"
                disabled={!labFile}
                className="rounded-lg bg-cyan-600 py-2.5 font-medium text-white sm:col-span-2 disabled:opacity-40"
              >
                رفع ومزامنة
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
