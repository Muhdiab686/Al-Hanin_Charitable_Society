import { type FormEvent, useEffect, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'

export function StorekeeperDonationsPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [itemName, setItemName] = useState('سلة غذائية')
  const [qty, setQty] = useState('20')

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
            spoilage_category: 'non_perishable',
            quantity: Number(qty),
            storage_location: 'WH-1',
          },
        ],
      })
      setMsg('تم تسجيل تبرع عيني.')
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
        <h2 className="font-semibold text-white">التبرعات</h2>
        <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-xs">
          {rows.map((d) => (
            <li key={String(d.id)} className="rounded bg-black/30 px-2 py-1">
              #{String(d.id)} {String(d.type)}
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-semibold text-white">تبرع عيني (مع صنف)</h2>
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={onInKind}>
          <input
            className="rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
          />
          <input
            className="w-24 rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
          <button type="submit" className="rounded-lg bg-orange-600 px-4 py-2 text-white">
            إنشاء
          </button>
        </form>
      </section>
    </div>
  )
}
