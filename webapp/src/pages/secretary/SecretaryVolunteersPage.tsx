import { type FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import type { Paginated } from '../../types/models'

function labelActivityKind(v: string): string {
  if (v === 'awareness') {
    return 'توعية'
  }

  return 'عامّة'
}

function labelStatus(st: string): string {
  return st === 'closed' ? 'مغلقة' : 'مفتوحة'
}

export function SecretaryVolunteersPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [title, setTitle] = useState('فرصة جديدة')
  const [slots, setSlots] = useState('5')
  const [activityKindCreate, setActivityKindCreate] = useState<'general' | 'awareness'>('general')
  const [starts, setStarts] = useState(() => new Date().toISOString().slice(0, 16))
  const [editId, setEditId] = useState('')
  const [status, setStatus] = useState('open')
  const [delId, setDelId] = useState('')
  const [linkOppId, setLinkOppId] = useState('')
  const [linkBeneficiaryCsv, setLinkBeneficiaryCsv] = useState('')

  async function load() {
    setErr(null)
    try {
      const res = (await api.fetchVolunteerOpportunities({ page: 1 })) as Paginated<Record<string, unknown>>
      setRows((res.data as Record<string, unknown>[]) ?? [])
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر التحميل'))
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    try {
      await api.createVolunteerOpportunity({
        title,
        required_slots: Number(slots),
        starts_at: new Date(starts).toISOString(),
        description: null,
        activity_kind: activityKindCreate,
      })
      setMsg('تم الإنشاء.')
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'فشل'))
    }
  }

  async function onUpdate(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    try {
      await api.updateVolunteerOpportunity(Number(editId), { status })
      setMsg('تم التحديث.')
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'فشل'))
    }
  }

  async function onDelete(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    try {
      await api.deleteVolunteerOpportunity(Number(delId))
      setMsg('تم الحذف.')
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'فشل الحذف'))
    }
  }

  async function onLinkBeneficiaries(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    try {
      const ids = linkBeneficiaryCsv
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((x) => Number.parseInt(x, 10))

      if (!linkOppId.trim() || ids.some((id) => !Number.isFinite(id))) {
        throw new Error('يجب تحديد معرّف فرصة وقائمة أرقام مستفيدين صالحة.')
      }

      await api.syncVolunteerOpportunityLinkedBeneficiaries(Number(linkOppId.trim()), ids)
      setMsg('تم تحديث المستفيدين المرتبطين.')
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex as Error, 'تعذّر الربط'))
    }
  }

  return (
    <div className="space-y-6 text-sm">
      {(msg || err) && (
        <div className={`rounded-xl px-4 py-3 ${err ? 'bg-red-500/15 text-red-100' : 'bg-emerald-500/15 text-emerald-50'}`}>
          {err ?? msg}
        </div>
      )}

      <p className="text-[13px] leading-relaxed text-white/72">
        لمراجعة تأثير التبرعات والتوعية على مستوى الحملات، استخدم لوحة القياس الموحَّدة مع{' '}
        <Link to="/app/secretary/campaign-reporting" className="text-violet-200 underline underline-offset-2">
          تقارير الحملات
        </Link>
        .
      </p>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white">الفرص</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[720px] border-collapse text-start text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-black/30 text-[11px] uppercase tracking-wide text-white/45">
                <th className="px-3 py-2 font-semibold">#</th>
                <th className="px-3 py-2 font-semibold">العنوان</th>
                <th className="px-3 py-2 font-semibold">النوع</th>
                <th className="px-3 py-2 font-semibold">الحالة</th>
                <th className="px-3 py-2 font-semibold">متطوعون</th>
                <th className="px-3 py-2 font-semibold">مستفيدون مرتبطون</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const kind = String((r as { activity_kind?: string }).activity_kind ?? 'general')
                const regCount = Number((r as { registrations_count?: number }).registrations_count ?? 0)
                const linked = Number((r as { linked_beneficiaries_count?: number }).linked_beneficiaries_count ?? 0)

                return (
                  <tr key={String(r.id)} className={`border-b border-white/[0.06] ${idx % 2 === 0 ? 'bg-black/15' : ''}`}>
                    <td className="whitespace-nowrap px-3 py-2 font-mono tabular-nums text-white">{String(r.id)}</td>
                    <td className="px-3 py-2 text-white/88">{String(r.title)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-white/75">{labelActivityKind(kind)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-white/75">{labelStatus(String(r.status))}</td>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-white/70">{regCount}</td>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-teal-200/90">{linked}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white">إنشاء فرصة</h2>
        <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={onCreate}>
          <input
            className="rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white sm:col-span-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            value={slots}
            onChange={(e) => setSlots(e.target.value)}
          />
          <input
            type="datetime-local"
            className="rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            value={starts}
            onChange={(e) => setStarts(e.target.value)}
          />
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-[11px] text-white/55">نوع النشاط</span>
            <select
              className="rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
              value={activityKindCreate}
              onChange={(e) => setActivityKindCreate(e.target.value as 'general' | 'awareness')}
            >
              <option value="general">عامّة (تطوع يومي / لوجستي)</option>
              <option value="awareness">توعية (يمكن ربط مستفيدين للتقارير)</option>
            </select>
          </label>
          <button type="submit" className="rounded-lg bg-violet-600 py-2 text-white sm:col-span-2">
            إنشاء فرصة
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-teal-500/25 bg-teal-950/15 p-5">
        <h2 className="text-base font-semibold text-white">ربط مستفيدين بنشاط توعية</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-white/55">
          صالح فقط لفرص مُعرَّفة كـ«توعية». أدخل أرقام المستفيدين مفصولة بفواصل أو مسافات.
        </p>
        <form className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap" onSubmit={onLinkBeneficiaries}>
          <input
            className="w-28 rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            placeholder="رقم الفرصة"
            value={linkOppId}
            onChange={(e) => setLinkOppId(e.target.value)}
          />
          <input
            className="min-w-[220px] flex-1 rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            placeholder="مثال: 1، 2، 5"
            value={linkBeneficiaryCsv}
            onChange={(e) => setLinkBeneficiaryCsv(e.target.value)}
          />
          <button type="submit" className="rounded-lg bg-teal-600 px-4 py-2 text-white">
            حفظ الربط
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white">تعديل حالة (مثلاً إغلاق)</h2>
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={onUpdate}>
          <input
            className="w-24 rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            placeholder="id"
            value={editId}
            onChange={(e) => setEditId(e.target.value)}
          />
          <select
            className="rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="open">مفتوحة</option>
            <option value="closed">مغلقة</option>
          </select>
          <button type="submit" className="rounded-lg bg-white/15 px-3 py-2">
            تحديث
          </button>
        </form>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white">حذف فرصة</h2>
        <form className="mt-3 flex gap-2" onSubmit={onDelete}>
          <input
            className="w-24 rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            value={delId}
            onChange={(e) => setDelId(e.target.value)}
          />
          <button type="submit" className="rounded-lg bg-rose-700 px-3 py-2">
            حذف
          </button>
        </form>
      </section>
    </div>
  )
}
