import { type FormEvent, useEffect, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import { labelSpoilageCategoryAr } from '../../lib/operationalLabels'

export function StorekeeperDonationsPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [itemName, setItemName] = useState('سلة غذائية')
  const [qty, setQty] = useState('20')
  const [category, setCategory] = useState('non_perishable')
  const [expiry, setExpiry] = useState('')
  const [storage, setStorage] = useState('WH-1')

  async function load() {
    setErr(null)
    try {
      const res = await api.fetchDonations({ page: 1 })
      setRows((res.data as Record<string, unknown>[]) ?? [])
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر التحميل'))
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function onInKind(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    try {
      await api.createDonation({
        type: 'in_kind',
        channel: 'manual',
        donor_name: 'متبرع عيني',
        items: [
          {
            name: itemName,
            spoilage_category: category,
            quantity: Number(qty),
            expiry_date: expiry.trim() || null,
            storage_location: storage.trim() || null,
          },
        ],
      })
      setMsg(`تم تسجيل تبرع عيني (${labelSpoilageCategoryAr(category)}).`)
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'فشل (تحقق من الصلاحيات والبيانات)'))
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
        <h2 className="font-semibold text-white">التبرعات المسجّلة</h2>
        <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-xs">
          {rows.map((d) => (
            <li key={String(d.id)} className="rounded bg-black/30 px-2 py-1">
              #{String(d.id)} {String(d.type)}
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-semibold text-white">تسجيل تبرع عيني (يُضاف للمخزون)</h2>
        <p className="mt-1 text-xs text-white/50">
          اختر فئة «مواد طبية» للأدوية والمستلزمات الصيدلانية حتى تظهر في توزيع الوصفات الطبية.
        </p>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={onInKind}>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-[11px] text-white/55">اسم الصنف / المادة</span>
            <input
              className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-white/55">الكمية</span>
            <input
              className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-white/55">فئة المادة</span>
            <select
              className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="non_perishable">غير سريع التلف</option>
              <option value="perishable">سريع التلف</option>
              <option value="medical">مواد طبية / صيدلانية</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-white/55">تاريخ الانتهاء (اختياري)</span>
            <input
              type="date"
              className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-white/55">موقع التخزين</span>
            <input
              className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              value={storage}
              onChange={(e) => setStorage(e.target.value)}
            />
          </label>
          <button type="submit" className="rounded-lg bg-orange-600 px-4 py-2.5 font-medium text-white sm:col-span-2">
            إنشاء تبرع عيني وربطه بالمخزون
          </button>
        </form>
      </section>
    </div>
  )
}
