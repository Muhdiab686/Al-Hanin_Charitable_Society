import { type FormEvent, useEffect, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import { badgeClassForAidStatus, labelAidStatusAr, labelAidTypeAr } from '../../lib/operationalLabels'

export function VolunteerAidPage() {
  const [aids, setAids] = useState<Record<string, unknown>[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [benId, setBenId] = useState('')
  const [type, setType] = useState('special_item')
  const [desc, setDesc] = useState('طلب من متطوع')
  const [aidId, setAidId] = useState('')
  const [invId, setInvId] = useState('')
  const [qty, setQty] = useState('2')
  const [delivAid, setDelivAid] = useState('')
  const [allocIds, setAllocIds] = useState('')

  async function load() {
    setErr(null)
    try {
      const res = await api.fetchAidRequests({ page: 1 })
      setAids((res.data as Record<string, unknown>[]) ?? [])
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
      await api.createAidRequest({
        beneficiary_id: Number(benId),
        type,
        description: desc,
      })
      setMsg('تم إنشاء الطلب.')
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'فشل الإنشاء'))
    }
  }

  async function onDist(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    try {
      await api.postAidInventoryDistribution(Number(aidId), {
        items: [{ inventory_item_id: Number(invId), quantity: Number(qty) }],
      })
      setMsg('تم التوزيع.')
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'فشل'))
    }
  }

  async function onDeliv(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    try {
      const ids = allocIds.split(',').map((s) => Number(s.trim())).filter(Boolean)
      await api.confirmAidDelivery(Number(delivAid), { allocation_ids: ids })
      setMsg('تم التسليم.')
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'فشل'))
    }
  }

  return (
    <div className="space-y-6 text-sm">
      {(msg || err) && (
        <div className={`rounded-xl px-4 py-3 ${err ? 'bg-red-500/15 text-red-100' : 'bg-emerald-500/15 text-emerald-50'}`}>
          {err ?? msg}
        </div>
      )}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-semibold text-white">طلبات المساعدة</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[420px] border-collapse text-start text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-black/30 text-[11px] uppercase tracking-wide text-white/45">
                <th className="px-3 py-2 font-semibold">الرقم</th>
                <th className="px-3 py-2 font-semibold">النوع</th>
                <th className="px-3 py-2 font-semibold">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {aids.map((a, idx) => {
                const st = String(a.status ?? '')
                const tp = String((a as { type?: string }).type ?? '')

                return (
                  <tr key={String(a.id)} className={`border-b border-white/[0.06] ${idx % 2 === 0 ? 'bg-black/15' : ''}`}>
                    <td className="whitespace-nowrap px-3 py-2 font-mono tabular-nums text-white">#{String(a.id)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-white/82">{labelAidTypeAr(tp)}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${badgeClassForAidStatus(st)}`}
                      >
                        {labelAidStatusAr(st)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-semibold text-white">طلب مساعدة جديد</h2>
        <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={onCreate}>
          <input
            className="rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            placeholder="beneficiary_id"
            value={benId}
            onChange={(e) => setBenId(e.target.value)}
          />
          <select
            className="rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="special_item">مواد أو عينية خاصة</option>
            <option value="medical_prescription">وصفة طبيّة / صرف دوائي</option>
            <option value="urgent_financial">دعم معيشي عاجل</option>
          </select>
          <input
            className="sm:col-span-2 rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <button type="submit" className="rounded-lg bg-emerald-600 py-2 text-white sm:col-span-2">
            إرسال
          </button>
        </form>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-semibold text-white">توزيع مخزون</h2>
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={onDist}>
          <input className="w-20 rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white" placeholder="aid" value={aidId} onChange={(e) => setAidId(e.target.value)} />
          <input className="w-20 rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white" placeholder="inv" value={invId} onChange={(e) => setInvId(e.target.value)} />
          <input className="w-16 rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white" value={qty} onChange={(e) => setQty(e.target.value)} />
          <button type="submit" className="rounded-lg bg-teal-600 px-3 py-2 text-white">توزيع</button>
        </form>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-semibold text-white">تأكيد تسليم</h2>
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={onDeliv}>
          <input className="w-20 rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white" placeholder="aid" value={delivAid} onChange={(e) => setDelivAid(e.target.value)} />
          <input className="min-w-[160px] flex-1 rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white" placeholder="allocation ids" value={allocIds} onChange={(e) => setAllocIds(e.target.value)} />
          <button type="submit" className="rounded-lg bg-cyan-600 px-3 py-2 text-white">تسليم</button>
        </form>
      </section>
    </div>
  )
}
