import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import { SubmitButton } from '../../components/SubmitButton'
import { useSubmitLock } from '../../hooks/useSubmitLock'
import type { Paginated } from '../../types/models'

import { labelFamilyRelationshipAr } from '../../lib/operationalLabels'

const ENROLL_AR: { value: string; label: string }[] = [
  { value: 'draft', label: 'مسودة' },
  { value: 'under_review', label: 'قيد المراجعة' },
  { value: 'pending_board', label: 'بانتظار اللجنة' },
  { value: 'approved', label: 'معتمدة' },
  { value: 'rejected', label: 'مرفوضة' },
]

const HOUSING_STATUS_AR: Record<string, string> = {
  owned: 'ملك',
  rented: 'إيجار',
  hosted: 'ضيافة',
  unstable: 'غير مستقر',
}

const HEALTH_STATUS_AR: { value: string; label: string }[] = [
  { value: '', label: 'بدون حالة صحية خاصة' },
  { value: 'healthy', label: 'سليم' },
  { value: 'chronic_illness', label: 'مرض مزمن' },
  { value: 'disability', label: 'إعاقة' },
  { value: 'needs_special_care', label: 'يحتاج رعاية خاصة' },
]

export function SecretaryBeneficiariesPage() {
  const CREDENTIALS_CACHE_KEY = 'hanin_generated_family_credentials'
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [totalBeneficiaries, setTotalBeneficiaries] = useState(0)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const createLock = useSubmitLock()
  const editLock = useSubmitLock()

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  const [headName, setHeadName] = useState('')
  const [famPhone, setFamPhone] = useState('')
  const [famAddress, setFamAddress] = useState('')
  const [members, setMembers] = useState('4')
  const [famIncome, setFamIncome] = useState('')
  const [housingStatus, setHousingStatus] = useState('rented')
  const [famEnrollNew, setFamEnrollNew] = useState<'draft' | 'pending_board'>('pending_board')

  const [bName, setBName] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [benPhone, setBenPhone] = useState('')
  const [benDob, setBenDob] = useState('')
  const [benHealthStatus, setBenHealthStatus] = useState('')
  const [benHealthDetails, setBenHealthDetails] = useState('')
  const [benNotes, setBenNotes] = useState('')

  const [editId, setEditId] = useState('')
  const [editName, setEditName] = useState('')
  const [editNationalId, setEditNationalId] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editDob, setEditDob] = useState('')
  const [editHealthStatus, setEditHealthStatus] = useState('')
  const [editHealthDetails, setEditHealthDetails] = useState('')

  const [famEnrollId, setFamEnrollId] = useState('')
  const [enrollStatus, setEnrollStatus] = useState('pending_board')

  const [famProfileId, setFamProfileId] = useState('')
  const [profHead, setProfHead] = useState('')
  const [profPhone, setProfPhone] = useState('')
  const [profAddress, setProfAddress] = useState('')
  const [profMembers, setProfMembers] = useState('')
  const [profIncome, setProfIncome] = useState('')
  const [profHousingStatus, setProfHousingStatus] = useState('')

  const [walletBenId, setWalletBenId] = useState('')
  const [walletBalance, setWalletBalance] = useState<string | null>(null)
  const [walletCreditsCount, setWalletCreditsCount] = useState<number | null>(null)
  const [creditAmt, setCreditAmt] = useState('10')

  const [eligFamId, setEligFamId] = useState('')
  const [hasIncome, setHasIncome] = useState('0')
  const [pauseReason, setPauseReason] = useState('')

  const [memberFamilyId, setMemberFamilyId] = useState('')
  const [memberName, setMemberName] = useState('')
  const [memberNationalId, setMemberNationalId] = useState('')
  const [memberRelationship, setMemberRelationship] = useState('child')
  const [memberGender, setMemberGender] = useState('')
  const [memberDob, setMemberDob] = useState('')
  const [memberHealthStatus, setMemberHealthStatus] = useState('')
  const [memberHealthDetails, setMemberHealthDetails] = useState('')

  const [qrFamilyId, setQrFamilyId] = useState('')
  const [qrImg, setQrImg] = useState<string | null>(null)
  const [historyFamilyId, setHistoryFamilyId] = useState('')
  const [historySummary, setHistorySummary] = useState<Record<string, unknown> | null>(null)
  const [historyAidRequests, setHistoryAidRequests] = useState<Record<string, unknown>[]>([])
  const [historyMedicalRecords, setHistoryMedicalRecords] = useState<Record<string, unknown>[]>([])

  const [filterEnrollmentStatus, setFilterEnrollmentStatus] = useState('')
  const [filterCategoryId, setFilterCategoryId] = useState('')
  const [categories, setCategories] = useState<Record<string, unknown>[]>([])

  const [showFamilyDetail, setShowFamilyDetail] = useState(false)
  const [detailFamilyId, setDetailFamilyId] = useState<number | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailFamily, setDetailFamily] = useState<Record<string, unknown> | null>(null)
  const [detailMembers, setDetailMembers] = useState<Record<string, unknown>[]>([])
  const [detailHistory, setDetailHistory] = useState<{
    summary: Record<string, unknown>
    aid_requests: Record<string, unknown>[]
    medical_records: Record<string, unknown>[]
  } | null>(null)

  const [createMembers, setCreateMembers] = useState<
    Array<{
      national_id: string
      name: string
      family_relationship: string
      gender: string
      date_of_birth: string
      health_status: string
      health_details: string
    }>
  >([{ national_id: '', name: '', family_relationship: 'spouse', gender: '', date_of_birth: '', health_status: '', health_details: '' }])
  const [generatedCredentials, setGeneratedCredentials] = useState<Record<number, { email: string; password: string }>>(() => {
    if (typeof window === 'undefined') {
      return {}
    }

    try {
      const raw = window.localStorage.getItem(CREDENTIALS_CACHE_KEY)
      if (!raw) {
        return {}
      }
      const parsed = JSON.parse(raw) as Record<string, { email?: string; password?: string }>
      const normalized: Record<number, { email: string; password: string }> = {}
      for (const [key, value] of Object.entries(parsed)) {
        const familyId = Number(key)
        if (Number.isFinite(familyId) && value?.email && value?.password) {
          normalized[familyId] = { email: value.email, password: value.password }
        }
      }
      return normalized
    } catch {
      return {}
    }
  })

  const familyOptions = useMemo(() => {
    const map = new Map<number, { id: number; label: string }>()
    for (const row of rows) {
      const family = row.family as { id?: number; family_code?: string; head_name?: string } | undefined
      if (family?.id && !map.has(family.id)) {
        map.set(family.id, {
          id: family.id,
          label: `${family.family_code ?? `FAM-${family.id}`} — ${family.head_name ?? 'عائلة'}`,
        })
      }
    }
    return Array.from(map.values())
  }, [rows])

  const beneficiaryOptions = useMemo(() => {
    return rows.map((row) => ({
      id: Number(row.id),
      label: `${String(row.name ?? 'مستفيد')} (#${String(row.id)})`,
    }))
  }, [rows])

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)

    try {
      const res = (await api.fetchBeneficiaries({
        page,
        ...(filterEnrollmentStatus ? { enrollment_status: filterEnrollmentStatus } : {}),
        ...(filterCategoryId ? { category_id: Number(filterCategoryId) } : {}),
        ...(filterEnrollmentStatus || filterCategoryId ? { heads_only: true } : {}),
      })) as Paginated<Record<string, unknown>>
      setRows((res.data as Record<string, unknown>[]) ?? [])
      setLastPage(Math.max(1, res.last_page))
      setTotalBeneficiaries(res.total ?? 0)
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر التحميل'))
    } finally {
      setLoading(false)
    }
  }, [page, filterEnrollmentStatus, filterCategoryId])

  useEffect(() => {
    void api.fetchCategoryRules()
      .then((r) => setCategories(r.categories ?? []))
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function cacheFamilyCredentials(familyId: number, credentials?: { email: string; password: string } | null) {
    if (!credentials?.email || !credentials.password || !Number.isFinite(familyId)) {
      return
    }

    setGeneratedCredentials((prev) => {
      const next = {
        ...prev,
        [familyId]: {
          email: credentials.email,
          password: credentials.password,
        },
      }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(CREDENTIALS_CACHE_KEY, JSON.stringify(next))
      }
      return next
    })
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    const nid = nationalId.trim() || `NID${Date.now()}`

<<<<<<< HEAD
    try {
      const response = await api.createBeneficiary({
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
          family_relationship: 'head',
          phone: benPhone.trim() || null,
          date_of_birth: benDob.trim() || null,
          health_status: benHealthStatus || null,
          health_details: benHealthDetails.trim() || null,
          notes: benNotes.trim() || null,
        },
        members: createMembers
          .filter((member) => member.name.trim())
          .map((member) => ({
            national_id: member.national_id.trim() || `NID-M-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            name: member.name.trim(),
            family_relationship: member.family_relationship,
            gender: member.gender || null,
            date_of_birth: member.date_of_birth || null,
            health_status: member.health_status || null,
            health_details: member.health_details.trim() || null,
          })),
      })
      const credentials = response.credentials
      const familyId = Number((response.beneficiary?.family as { id?: number } | undefined)?.id ?? response.beneficiary?.family_id)
      cacheFamilyCredentials(familyId, credentials ?? null)
      if (credentials?.email && credentials.password) {
        setMsg(`تم التسجيل وتوليد بيانات دخول المستفيد: ${credentials.email} / ${credentials.password}`)
      } else {
        setMsg('تم تسجيل المستفيد والعائلة.')
      }
      setShowCreateDialog(false)
      setNationalId('')
      setCreateMembers([
        { national_id: '', name: '', family_relationship: 'spouse', gender: '', date_of_birth: '', health_status: '', health_details: '' },
      ])
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex as Error, 'فشل الإنشاء'))
    }
=======
    await createLock.run(async () => {
      try {
        const response = await api.createBeneficiary({
          family: {
            head_name: headName.trim(),
            phone: famPhone.trim() || null,
            address: famAddress.trim() || null,
            members_count: Number(members),
            monthly_income: famIncome.trim() ? Number(famIncome) : 0,
            housing_status: housingStatus,
            enrollment_status: famEnrollNew,
          },
          beneficiary: {
            national_id: nid,
            name: bName.trim(),
            is_head_of_family: true,
            family_relationship: 'head',
            phone: benPhone.trim() || null,
            date_of_birth: benDob.trim() || null,
            notes: benNotes.trim() || null,
          },
          members: createMembers
            .filter((member) => member.name.trim())
            .map((member) => ({
              national_id: member.national_id.trim() || `NID-M-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              name: member.name.trim(),
              family_relationship: member.family_relationship,
              gender: member.gender || null,
            })),
        })
        const credentials = response.credentials
        const familyId = Number((response.beneficiary?.family as { id?: number } | undefined)?.id ?? response.beneficiary?.family_id)
        cacheFamilyCredentials(familyId, credentials ?? null)
        if (credentials?.email && credentials.password) {
          setMsg(`تم التسجيل وتوليد بيانات دخول المستفيد: ${credentials.email} / ${credentials.password}`)
        } else {
          setMsg('تم تسجيل المستفيد والعائلة.')
        }
        setShowCreateDialog(false)
        setNationalId('')
        setCreateMembers([{ national_id: '', name: '', family_relationship: 'spouse', gender: '' }])
        await load()
      } catch (ex) {
        setErr(extractErrorMessage(ex as Error, 'فشل الإنشاء'))
      }
    })
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
  }

  async function onPatchBeneficiary(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)

    await editLock.run(async () => {
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
<<<<<<< HEAD

      if (editNationalId.trim()) {
        payload.national_id = editNationalId.trim()
      }

      if (editPhone.trim()) {
        payload.phone = editPhone.trim()
      }

      if (editDob.trim()) {
        payload.date_of_birth = editDob.trim()
      }

      payload.health_status = editHealthStatus || null
      payload.health_details = editHealthDetails.trim() || null

      await api.updateBeneficiary(Number(editId), payload)
      setMsg('تم تحديث بيانات المستفيد.')
      setShowEditDialog(false)
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex as Error, 'فشل التحديث'))
    }
=======
    })
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
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
      const response = await api.updateFamilyEnrollmentStatus(Number(famEnrollId), {
        enrollment_status: enrollStatus,
      })
      const credentials = response.credentials
      cacheFamilyCredentials(Number(famEnrollId), credentials ?? null)
      if (credentials?.email && credentials.password) {
        setMsg(`تم تحديث الحالة وتوليد بيانات الدخول: ${credentials.email} / ${credentials.password}`)
      } else {
        setMsg('تم تحديث حالة تسجيل العائلة.')
      }
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
      const wallet = w.medical_wallet as Record<string, unknown> | undefined
      setWalletBalance(String(wallet?.balance ?? '0'))
      const credits = wallet?.credits as { data?: unknown[] } | undefined
      setWalletCreditsCount(Array.isArray(credits?.data) ? credits.data.length : 0)
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

      if (profHousingStatus.trim()) {
        payload.housing_status = profHousingStatus.trim()
      }

      await api.updateFamilyProfile(Number(famProfileId), payload)
      setMsg('تم تحديث بيانات أسرة المستفيد.')
      setShowEditDialog(false)
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex as Error, 'فشل تحديث العائلة'))
    }
  }

  async function onAddMemberToExistingFamily(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)

    try {
      await api.addFamilyMember(Number(memberFamilyId), {
        national_id: memberNationalId.trim() || `NID-M-${Date.now()}`,
        name: memberName.trim(),
        family_relationship: memberRelationship,
        gender: memberGender || null,
        date_of_birth: memberDob || null,
        health_status: memberHealthStatus || null,
        health_details: memberHealthDetails.trim() || null,
      })
      setMsg('تمت إضافة فرد العائلة بنجاح.')
      setMemberName('')
      setMemberNationalId('')
      setMemberDob('')
      setMemberHealthStatus('')
      setMemberHealthDetails('')
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex as Error, 'فشلت إضافة فرد العائلة'))
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

  async function onLoadFamilyHistory(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)

    try {
      const history = await api.fetchFamilyHistory(Number(historyFamilyId))
      setHistorySummary(history.summary ?? null)
      setHistoryAidRequests(history.aid_requests ?? [])
      setHistoryMedicalRecords(history.medical_records ?? [])
      setMsg('تم تحميل السجل الكامل للعائلة.')
    } catch (ex) {
      setErr(extractErrorMessage(ex as Error, 'تعذّر تحميل سجل العائلة'))
      setHistorySummary(null)
      setHistoryAidRequests([])
      setHistoryMedicalRecords([])
    }
  }

  function openEditDialogForRow(row: Record<string, unknown>) {
    const family = row.family as { id?: number } | undefined
    setEditId(String(row.id ?? ''))
    setEditName(String((row as { name?: string }).name ?? ''))
    setEditNationalId(String(row.national_id ?? ''))
    setEditPhone(String(row.phone ?? ''))
    setEditDob(String(row.date_of_birth ?? ''))
    setEditHealthStatus(String((row as { health_status?: string }).health_status ?? ''))
    setEditHealthDetails(String((row as { health_details?: string }).health_details ?? ''))
    setFamProfileId(String(family?.id ?? ''))
    setShowEditDialog(true)
  }

  function closeFamilyDetail() {
    setShowFamilyDetail(false)
    setDetailFamilyId(null)
    setDetailFamily(null)
    setDetailMembers([])
    setDetailHistory(null)
    setDetailLoading(false)
  }

  async function openFamilyDetail(familyId: number) {
    setDetailFamilyId(familyId)
    setShowFamilyDetail(true)
    setDetailLoading(true)
    setDetailFamily(null)
    setDetailMembers([])
    setDetailHistory(null)
    setErr(null)

    try {
      const [membersRes, historyRes] = await Promise.all([
        api.fetchFamilyMembers(familyId),
        api.fetchFamilyHistory(familyId),
      ])
      setDetailFamily(membersRes.family)
      setDetailMembers(membersRes.members ?? [])
      setDetailHistory({
        summary: historyRes.summary ?? {},
        aid_requests: historyRes.aid_requests ?? [],
        medical_records: historyRes.medical_records ?? [],
      })
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر تحميل تفاصيل العائلة'))
      closeFamilyDetail()
    } finally {
      setDetailLoading(false)
    }
  }

  function enrollLabelFor(status: unknown): string {
    return ENROLL_AR.find((e) => e.value === status)?.label ?? String(status ?? '—')
  }

  function housingLabelFor(status: unknown): string {
    const key = String(status ?? '').trim()
    return HOUSING_STATUS_AR[key] ?? (key || '—')
  }

  function healthLabelFor(status: unknown): string {
    const key = String(status ?? '').trim()
    return HEALTH_STATUS_AR.find((h) => h.value === key)?.label ?? (key || '—')
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
        <h2 className="text-base font-semibold text-white">تصفية العائلات حسب حالة القبول والتصنيف</h2>
        <p className="mt-1 text-xs text-white/50">اختر حالة القبول أو التصنيف لعرض العائلات — اضغط على أي صف لعرض التفاصيل الكاملة.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-white/45">حالة القبول</label>
            <select
              className="w-full rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              value={filterEnrollmentStatus}
              onChange={(e) => {
                setFilterEnrollmentStatus(e.target.value)
                setPage(1)
              }}
            >
              <option value="">الكل</option>
              {ENROLL_AR.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-white/45">التصنيف</label>
            <select
              className="w-full rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              value={filterCategoryId}
              onChange={(e) => {
                setFilterCategoryId(e.target.value)
                setPage(1)
              }}
            >
              <option value="">الكل</option>
              {categories.map((cat) => (
                <option key={String(cat.id)} value={String(cat.id)}>
                  {String(cat.name ?? `فئة #${String(cat.id)}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
        {(filterEnrollmentStatus || filterCategoryId) && (
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.06]">
            <table className="w-full min-w-[720px] border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-black/30 text-[10px] uppercase tracking-wide text-white/45">
                  <th className="px-3 py-2.5 font-semibold">كود العائلة</th>
                  <th className="px-3 py-2.5 font-semibold">رب الأسرة</th>
                  <th className="px-3 py-2.5 font-semibold">عدد الأفراد</th>
                  <th className="px-3 py-2.5 font-semibold">التصنيف</th>
                  <th className="px-3 py-2.5 font-semibold">حالة القبول</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-white/50">
                      جاري التحميل…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-white/45">
                      لا عائلات مطابقة.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, idx) => {
                    const fam = r.family as {
                      id?: number
                      family_code?: string
                      head_name?: string
                      members_count?: number
                      enrollment_status?: string
                    } | undefined
                    const category = r.category as { name?: string } | undefined
                    const enrollLabel = enrollLabelFor(fam?.enrollment_status)

                    return (
                      <tr
                        key={String(r.id)}
                        role="button"
                        tabIndex={0}
                        onClick={() => fam?.id && void openFamilyDetail(fam.id)}
                        onKeyDown={(e) => {
                          if ((e.key === 'Enter' || e.key === ' ') && fam?.id) {
                            e.preventDefault()
                            void openFamilyDetail(fam.id)
                          }
                        }}
                        className={`cursor-pointer border-b border-white/[0.06] transition hover:bg-violet-500/10 ${idx % 2 === 0 ? 'bg-black/15' : ''}`}
                      >
                        <td className="whitespace-nowrap px-3 py-2.5 font-mono text-violet-200/95">{String(fam?.family_code ?? '—')}</td>
                        <td className="px-3 py-2.5 font-medium text-white">{String(fam?.head_name ?? (r as { name?: string }).name ?? '—')}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{String(fam?.members_count ?? '—')}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-white/80">{String(category?.name ?? '—')}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-white/80">{enrollLabel}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
          <table className="w-full min-w-[980px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-black/30 text-[10px] uppercase tracking-wide text-white/45">
                <th className="px-3 py-2.5 font-semibold">المستفيد</th>
                <th className="px-3 py-2.5 font-semibold">رقم وطني</th>
                <th className="px-3 py-2.5 font-semibold">كود العائلة</th>
                <th className="px-3 py-2.5 font-semibold">إيميل الدخول</th>
                <th className="px-3 py-2.5 font-semibold">كلمة السر</th>
                <th className="px-3 py-2.5 font-semibold">عائلة #</th>
                <th className="px-3 py-2.5 font-semibold">مستفيد #</th>
                <th className="px-3 py-2.5 font-semibold">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-white/50">
                    جاري التحميل…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-white/45">
                    لا سجلات.
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => {
                  const fam = r.family as { id?: number; family_code?: string } | undefined
                  const familyCredentials = fam?.id ? generatedCredentials[fam.id] : undefined

                  return (
                    <tr
                      key={String(r.id)}
                      className={`border-b border-white/[0.06] ${idx % 2 === 0 ? 'bg-black/15' : ''}`}
                    >
                      <td className="px-3 py-2.5 font-medium text-white">{String((r as { name?: string }).name ?? '—')}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[12px]">{String(r.national_id ?? '—')}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-violet-200/95">
                        {fam?.id ? (
                          <button
                            type="button"
                            onClick={() => void openFamilyDetail(fam.id!)}
                            className="underline decoration-violet-300/40 hover:text-violet-100"
                          >
                            {String(fam.family_code ?? '—')}
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-emerald-100">
                        {familyCredentials?.email ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-amber-100">
                        {familyCredentials?.password ?? '—'}
                      </td>
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
        <p className="mt-2 text-[11px] text-white/40">
          يتم إظهار بيانات الدخول المولدة تلقائياً فقط (وقد لا تظهر للعائلات القديمة التي لم تُولّد لها بيانات ضمن هذه الجلسة).
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white">مسار قبول الأسرة على اللجنة</h2>
        <form className="mt-4 flex flex-wrap items-end gap-2" onSubmit={onEnrollment}>
          <select
            className="min-w-[260px] rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            value={famEnrollId}
            onChange={(e) => setFamEnrollId(e.target.value)}
          >
            <option value="">اختر العائلة</option>
            {familyOptions.map((family) => (
              <option key={family.id} value={String(family.id)}>
                {family.label}
              </option>
            ))}
          </select>
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
          <select
            className="min-w-[260px] rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            value={eligFamId}
            onChange={(e) => setEligFamId(e.target.value)}
          >
            <option value="">اختر العائلة</option>
            {familyOptions.map((family) => (
              <option key={family.id} value={String(family.id)}>
                {family.label}
              </option>
            ))}
          </select>
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
          <select
            className="min-w-[260px] rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            value={walletBenId}
            onChange={(e) => setWalletBenId(e.target.value)}
          >
            <option value="">اختر المستفيد</option>
            {beneficiaryOptions.map((beneficiary) => (
              <option key={beneficiary.id} value={String(beneficiary.id)}>
                {beneficiary.label}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-lg bg-white/10 px-4 py-2 transition active:scale-[0.98] hover:bg-white/15">
            عرض الرصيد
          </button>
        </form>
        {walletBalance !== null ? (
          <div className="mt-3 rounded-lg border border-teal-400/25 bg-teal-500/10 px-4 py-3 text-sm text-teal-50">
            <p>الرصيد الحالي: <strong>{walletBalance}</strong></p>
            <p className="mt-1 text-teal-100/80">عدد حركات الرصيد: {walletCreditsCount ?? 0}</p>
          </div>
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
        <h2 className="text-base font-semibold text-white">إضافة فرد (مولود جديد / حالة صحية) لعائلة موجودة</h2>
        <p className="mt-1 text-xs text-white/52">
          استخدم هذا النموذج لتسجيل مولود جديد أو أي فرد إضافي في عائلة مسجّلة مسبقاً، مع تحديد حالته الصحية لدعم التصنيف عند التوزيع.
        </p>
        <form className="mt-4 grid gap-2 sm:grid-cols-2" onSubmit={onAddMemberToExistingFamily}>
          <select
            required
            className="rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white sm:col-span-2"
            value={memberFamilyId}
            onChange={(e) => setMemberFamilyId(e.target.value)}
          >
            <option value="">اختر العائلة</option>
            {familyOptions.map((family) => (
              <option key={family.id} value={String(family.id)}>
                {family.label}
              </option>
            ))}
          </select>
          <input
            required
            className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
            placeholder="اسم الفرد *"
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
          />
          <input
            className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
            placeholder="الرقم الوطني (اختياري للمواليد)"
            value={memberNationalId}
            onChange={(e) => setMemberNationalId(e.target.value)}
          />
          <select
            className="rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            value={memberRelationship}
            onChange={(e) => setMemberRelationship(e.target.value)}
          >
            <option value="child">ابن/ابنة (مولود جديد)</option>
            <option value="spouse">زوج/زوجة</option>
            <option value="other">تابع آخر</option>
          </select>
          <select
            className="rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            value={memberGender}
            onChange={(e) => setMemberGender(e.target.value)}
          >
            <option value="">الجنس</option>
            <option value="male">ذكر</option>
            <option value="female">أنثى</option>
          </select>
          <input
            type="date"
            title="تاريخ الميلاد"
            className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
            value={memberDob}
            onChange={(e) => setMemberDob(e.target.value)}
          />
          <select
            className="rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            value={memberHealthStatus}
            onChange={(e) => setMemberHealthStatus(e.target.value)}
          >
            {HEALTH_STATUS_AR.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white sm:col-span-2"
            placeholder="تفاصيل الحالة الصحية (اختياري)"
            value={memberHealthDetails}
            onChange={(e) => setMemberHealthDetails(e.target.value)}
          />
          <button type="submit" className="rounded-lg bg-emerald-700 py-2 text-white sm:col-span-2">
            حفظ الفرد الجديد
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white">رمز QR للأسرة المعتمدة</h2>
        <form className="mt-4 flex flex-wrap gap-2" onSubmit={onQr}>
          <select
            className="min-w-[260px] rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            value={qrFamilyId}
            onChange={(e) => setQrFamilyId(e.target.value)}
          >
            <option value="">اختر العائلة</option>
            {familyOptions.map((family) => (
              <option key={family.id} value={String(family.id)}>
                {family.label}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-lg bg-white/10 px-4 py-2">
            تحميل
          </button>
        </form>
        {qrImg ? <img src={qrImg} alt="رمز الأسرة" className="mt-4 max-w-xs rounded-xl border border-white/10" /> : null}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white">السجل الكامل للعائلة (عيني + طبي + طلبات)</h2>
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={onLoadFamilyHistory}>
          <select
            className="min-w-[260px] rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            value={historyFamilyId}
            onChange={(e) => setHistoryFamilyId(e.target.value)}
          >
            <option value="">اختر العائلة</option>
            {familyOptions.map((family) => (
              <option key={family.id} value={String(family.id)}>
                {family.label}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-lg bg-white/10 px-4 py-2">
            تحميل السجل
          </button>
        </form>

        {historySummary ? (
          <div className="mt-4 grid gap-2 text-xs sm:grid-cols-5">
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">أفراد الأسرة: {String(historySummary.beneficiaries_count ?? 0)}</div>
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">طلبات المساعدة: {String(historySummary.aid_requests_count ?? 0)}</div>
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">تسليمات عينية: {String(historySummary.delivered_allocations_count ?? 0)}</div>
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">سجلات طبية: {String(historySummary.medical_records_count ?? 0)}</div>
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">وصفات مصروفة: {String(historySummary.disbursed_prescriptions_count ?? 0)}</div>
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <h3 className="text-sm font-semibold text-white">طلبات المساعدة</h3>
            <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto text-[12px] text-white/80">
              {historyAidRequests.length === 0 ? (
                <li className="text-white/45">لا يوجد سجل طلبات بعد.</li>
              ) : (
                historyAidRequests.map((aidRequest) => (
                  <li key={String(aidRequest.id)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    #{String(aidRequest.id)} — {String(aidRequest.type ?? '—')} — {String(aidRequest.status ?? '—')}
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <h3 className="text-sm font-semibold text-white">السجل الطبي</h3>
            <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto text-[12px] text-white/80">
              {historyMedicalRecords.length === 0 ? (
                <li className="text-white/45">لا يوجد سجل طبي بعد.</li>
              ) : (
                historyMedicalRecords.map((record) => (
                  <li key={String(record.id)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    #{String(record.id)} — {String((record.beneficiary as { name?: string } | undefined)?.name ?? 'مستفيد')} —{' '}
                    {String(record.prescription_workflow_status ?? 'بدون وصفة')}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
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
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-white/55">حالة السكن *</span>
                <select
                  required
                  className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                  value={housingStatus}
                  onChange={(e) => setHousingStatus(e.target.value)}
                >
                  <option value="owned">ملك</option>
                  <option value="rented">إيجار</option>
                  <option value="hosted">ضيافة</option>
                  <option value="unstable">غير مستقر</option>
                </select>
              </label>
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
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                value={benDob}
                onChange={(e) => setBenDob(e.target.value)}
              />
              <select
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                value={benHealthStatus}
                onChange={(e) => setBenHealthStatus(e.target.value)}
              >
                {HEALTH_STATUS_AR.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <textarea
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white sm:col-span-2"
                placeholder="تفاصيل الحالة الصحية (اختياري)"
                rows={2}
                value={benHealthDetails}
                onChange={(e) => setBenHealthDetails(e.target.value)}
              />
              <textarea
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white sm:col-span-2"
                placeholder="ملاحظات"
                rows={2}
                value={benNotes}
                onChange={(e) => setBenNotes(e.target.value)}
              />
              <h3 className="mt-2 border-b border-white/10 pb-1 text-[13px] font-semibold text-white sm:col-span-2">
                أفراد العائلة (يدخلون مع التسجيل نفسه)
              </h3>
              {createMembers.map((member, idx) => (
                <div key={idx} className="grid gap-2 rounded-lg border border-white/10 bg-black/20 p-3 sm:col-span-2 sm:grid-cols-4">
                  <input
                    className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                    placeholder="الاسم"
                    value={member.name}
                    onChange={(e) =>
                      setCreateMembers((prev) => prev.map((item, i) => (i === idx ? { ...item, name: e.target.value } : item)))
                    }
                  />
                  <input
                    className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                    placeholder="الرقم الوطني"
                    value={member.national_id}
                    onChange={(e) =>
                      setCreateMembers((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, national_id: e.target.value } : item)),
                      )
                    }
                  />
                  <select
                    className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                    value={member.family_relationship}
                    onChange={(e) =>
                      setCreateMembers((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, family_relationship: e.target.value } : item)),
                      )
                    }
                  >
                    <option value="spouse">زوج/زوجة</option>
                    <option value="child">ابن/ابنة</option>
                    <option value="other">تابع آخر</option>
                  </select>
                  <div className="flex gap-2">
                    <select
                      className="flex-1 rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                      value={member.gender}
                      onChange={(e) =>
                        setCreateMembers((prev) => prev.map((item, i) => (i === idx ? { ...item, gender: e.target.value } : item)))
                      }
                    >
                      <option value="">الجنس</option>
                      <option value="male">ذكر</option>
                      <option value="female">أنثى</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setCreateMembers((prev) => prev.filter((_, i) => i !== idx))}
                      className="rounded-lg border border-red-400/30 px-2 py-2 text-xs text-red-100"
                    >
                      حذف
                    </button>
                  </div>
                  <input
                    type="date"
                    title="تاريخ الميلاد (لتحديد المواليد الجدد)"
                    className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                    value={member.date_of_birth}
                    onChange={(e) =>
                      setCreateMembers((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, date_of_birth: e.target.value } : item)),
                      )
                    }
                  />
                  <select
                    className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                    value={member.health_status}
                    onChange={(e) =>
                      setCreateMembers((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, health_status: e.target.value } : item)),
                      )
                    }
                  >
                    {HEALTH_STATUS_AR.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white sm:col-span-2"
                    placeholder="تفاصيل الحالة الصحية (اختياري)"
                    value={member.health_details}
                    onChange={(e) =>
                      setCreateMembers((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, health_details: e.target.value } : item)),
                      )
                    }
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setCreateMembers((prev) => [
                    ...prev,
                    {
                      national_id: '',
                      name: '',
                      family_relationship: 'child',
                      gender: '',
                      date_of_birth: '',
                      health_status: '',
                      health_details: '',
                    },
                  ])
                }
                className="rounded-lg border border-white/20 py-2 text-xs text-white sm:col-span-2"
              >
                + إضافة فرد عائلة
              </button>
              <SubmitButton busy={createLock.busy} className="rounded-lg bg-emerald-600 py-2.5 font-semibold text-white sm:col-span-2">
                حفظ التسجيل
              </SubmitButton>
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
              <select
                required
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white sm:col-span-2"
                value={editId}
                onChange={(e) => setEditId(e.target.value)}
              >
                <option value="">اختر المستفيد</option>
                {beneficiaryOptions.map((beneficiary) => (
                  <option key={beneficiary.id} value={String(beneficiary.id)}>
                    {beneficiary.label}
                  </option>
                ))}
              </select>
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
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                value={editDob}
                onChange={(e) => setEditDob(e.target.value)}
              />
<<<<<<< HEAD
              <select
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                value={editHealthStatus}
                onChange={(e) => setEditHealthStatus(e.target.value)}
              >
                {HEALTH_STATUS_AR.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <textarea
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white sm:col-span-2"
                placeholder="تفاصيل الحالة الصحية (اختياري)"
                rows={2}
                value={editHealthDetails}
                onChange={(e) => setEditHealthDetails(e.target.value)}
              />
              <button type="submit" className="rounded-lg bg-violet-600 py-2 text-white sm:col-span-2">
=======
              <SubmitButton busy={editLock.busy} className="rounded-lg bg-violet-600 py-2 text-white sm:col-span-2">
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
                حفظ تعديل المستفيد
              </SubmitButton>
              <button type="button" onClick={() => void onRecalc()} className="rounded-lg border border-white/20 px-3 py-2 text-xs sm:col-span-2">
                إعادة تصنيف تلقائية
              </button>
            </form>

            <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={onProfile}>
              <h3 className="border-b border-white/10 pb-1 text-[13px] font-semibold text-white sm:col-span-2">بيانات الأسرة</h3>
              <select
                required
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white sm:col-span-2"
                value={famProfileId}
                onChange={(e) => setFamProfileId(e.target.value)}
              >
                <option value="">اختر العائلة</option>
                {familyOptions.map((family) => (
                  <option key={family.id} value={String(family.id)}>
                    {family.label}
                  </option>
                ))}
              </select>
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
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-[11px] text-white/55">حالة السكن</span>
                <select
                  className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                  value={profHousingStatus}
                  onChange={(e) => setProfHousingStatus(e.target.value)}
                >
                  <option value="">— بدون تغيير —</option>
                  <option value="owned">ملك</option>
                  <option value="rented">إيجار</option>
                  <option value="hosted">ضيافة</option>
                  <option value="unstable">غير مستقر</option>
                </select>
              </label>
              <button type="submit" className="rounded-lg bg-sky-600 py-2 text-white sm:col-span-2">
                حفظ تعديل الأسرة
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {showFamilyDetail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/15 bg-slate-950 p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">تفاصيل العائلة</h2>
                <p className="mt-1 text-xs text-white/50">
                  {detailFamily
                    ? `${String(detailFamily.family_code ?? '')} — ${String(detailFamily.head_name ?? '')}`
                    : detailFamilyId
                      ? `عائلة #${detailFamilyId}`
                      : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={closeFamilyDetail}
                className="rounded-lg border border-white/20 px-3 py-1 text-xs text-white hover:bg-white/10"
              >
                إغلاق
              </button>
            </div>

            {detailLoading ? (
              <p className="mt-8 text-center text-white/60">جاري تحميل التفاصيل…</p>
            ) : detailFamily ? (
              <div className="mt-5 space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ['كود العائلة', String(detailFamily.family_code ?? '—')],
                    ['رب الأسرة', String(detailFamily.head_name ?? '—')],
                    ['عدد الأفراد', String(detailFamily.members_count ?? '—')],
                    ['الجوال', String(detailFamily.phone ?? '—')],
                    ['العنوان', String(detailFamily.address ?? '—')],
                    ['الحي', String(detailFamily.neighborhood ?? '—')],
                    ['الدخل الشهري', String(detailFamily.monthly_income ?? '—')],
                    ['وضع السكن', housingLabelFor(detailFamily.housing_status)],
                    ['حالة القبول', enrollLabelFor(detailFamily.enrollment_status)],
                    ['دخل مباشر', detailFamily.has_direct_income ? 'نعم' : 'لا'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                      <p className="text-[10px] text-white/45">{label}</p>
                      <p className="mt-0.5 text-sm text-white">{value}</p>
                    </div>
                  ))}
                </div>

                {detailHistory ? (
                  <div className="grid gap-3 sm:grid-cols-4">
                    {[
                      ['أفراد مسجّلون', String(detailHistory.summary.beneficiaries_count ?? detailMembers.length)],
                      ['طلبات مساعدة', String(detailHistory.summary.aid_requests_count ?? detailHistory.aid_requests.length)],
                      ['تسليمات عينية', String(detailHistory.summary.delivered_allocations_count ?? '—')],
                      ['سجلات طبية', String(detailHistory.summary.medical_records_count ?? detailHistory.medical_records.length)],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-center">
                        <p className="text-[10px] text-emerald-100/70">{label}</p>
                        <p className="mt-1 text-lg font-semibold text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-violet-100">أفراد العائلة ({detailMembers.length})</h3>
                  <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                    <table className="w-full min-w-[760px] border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/10 bg-black/30 text-[10px] uppercase tracking-wide text-white/45">
                          <th className="px-3 py-2 font-semibold">الاسم</th>
                          <th className="px-3 py-2 font-semibold">القرابة</th>
                          <th className="px-3 py-2 font-semibold">رقم وطني</th>
                          <th className="px-3 py-2 font-semibold">تاريخ الميلاد</th>
                          <th className="px-3 py-2 font-semibold">العمر</th>
                          <th className="px-3 py-2 font-semibold">الحالة الصحية</th>
                          <th className="px-3 py-2 font-semibold">التصنيف</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailMembers.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-3 py-6 text-center text-white/45">
                              لا أفراد مسجّلين.
                            </td>
                          </tr>
                        ) : (
                          detailMembers.map((member, idx) => {
                            const category = member.category as { name?: string } | undefined
                            return (
                              <tr
                                key={String(member.id ?? idx)}
                                className={`border-b border-white/[0.06] ${idx % 2 === 0 ? 'bg-black/15' : ''}`}
                              >
                                <td className="px-3 py-2 font-medium text-white">{String(member.name ?? '—')}</td>
                                <td className="px-3 py-2 text-white/80">
                                  {labelFamilyRelationshipAr(member.family_relationship)}
                                </td>
                                <td className="px-3 py-2 font-mono">{String(member.national_id ?? '—')}</td>
                                <td className="px-3 py-2 font-mono">{String(member.date_of_birth ?? '—').slice(0, 10)}</td>
                                <td className="px-3 py-2 tabular-nums">{String(member.age ?? '—')}</td>
                                <td className="px-3 py-2 text-white/80">{healthLabelFor(member.health_status)}</td>
                                <td className="px-3 py-2 text-white/80">{String(category?.name ?? '—')}</td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {detailHistory && detailHistory.aid_requests.length > 0 ? (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-violet-100">آخر طلبات المساعدة</h3>
                    <ul className="space-y-1 text-xs text-white/75">
                      {detailHistory.aid_requests.slice(0, 5).map((req) => (
                        <li key={String(req.id)} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                          #{String(req.id)} — {String(req.type ?? '—')} — {String(req.status ?? '—')}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {detailHistory && detailHistory.medical_records.length > 0 ? (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-violet-100">آخر السجلات الطبية</h3>
                    <ul className="space-y-1 text-xs text-white/75">
                      {detailHistory.medical_records.slice(0, 5).map((rec) => (
                        <li key={String(rec.id)} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                          #{String(rec.id)} — {String(rec.diagnosis_name ?? rec.title ?? 'سجل طبي')} — {String(rec.prescription_workflow_status ?? '—')}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <footer className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-[11px] text-white/50">
        <strong className="text-white/65">ملاحظة:</strong> تسجيل الدخول والخروج متاح عامّةً من قائمة الهوية في أعلى الصفحة.
      </footer>
    </div>
  )
}
