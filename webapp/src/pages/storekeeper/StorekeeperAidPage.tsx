import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'

export function StorekeeperAidPage() {
  const [aids, setAids] = useState<Record<string, unknown>[]>([])
  const [inventoryItems, setInventoryItems] = useState<Record<string, unknown>[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [aidId, setAidId] = useState('')
  const [invId, setInvId] = useState('')
  const [qty, setQty] = useState('5')
  const [allocJson, setAllocJson] = useState('[]')
  const [delivAid, setDelivAid] = useState('')
  const [selectedAllocationIds, setSelectedAllocationIds] = useState<string[]>([])

  const deliveryAllocationOptions = useMemo(() => {
    if (!delivAid) {
      return []
    }

    const selectedAid = aids.find((aid) => String(aid.id) === delivAid)
    if (!selectedAid) {
      return []
    }

    const keys = ['allocations', 'distribution_allocations', 'inventory_allocations', 'aid_allocations']
    for (const key of keys) {
      const raw = selectedAid[key as keyof typeof selectedAid]
      if (!Array.isArray(raw)) {
        continue
      }

      return raw
        .map((entry) => {
          if (!entry || typeof entry !== 'object') {
            return null
          }
          const record = entry as Record<string, unknown>
          if (record.id == null) {
            return null
          }
          return {
            id: String(record.id),
            label: `#${String(record.id)} — ${String(record.status ?? (record.delivered_at ? 'delivered' : 'pending'))}`,
          }
        })
        .filter((entry): entry is { id: string; label: string } => entry !== null)
    }

    return []
  }, [aids, delivAid])

  async function load() {
    setErr(null)
    try {
      const [res, inv] = await Promise.all([
        api.fetchAidRequests({ page: 1 }),
        api.fetchInventoryItems({ page: 1 }),
      ])
      setAids((res.data as Record<string, unknown>[]) ?? [])
      setInventoryItems((inv.data as Record<string, unknown>[]) ?? [])
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر التحميل'))
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function onDistribute(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    try {
      let items: { inventory_item_id: number; quantity: number }[]
      if (allocJson.trim().startsWith('[')) {
        items = JSON.parse(allocJson) as { inventory_item_id: number; quantity: number }[]
      } else {
        items = [{ inventory_item_id: Number(invId), quantity: Number(qty) }]
      }
      await api.postAidInventoryDistribution(Number(aidId), { items })
      setMsg('تم التوزيع.')
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'فشل التوزيع'))
    }
  }

  async function onDeliver(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    try {
      const ids = selectedAllocationIds.map((id) => Number(id)).filter(Boolean)
      await api.confirmAidDelivery(Number(delivAid), {
        allocation_ids: ids,
        delivery_note: 'تسليم من الويب',
      })
      setMsg('تم تأكيد التسليم.')
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'فشل التسليم'))
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
        <h2 className="font-semibold text-white">طلبات مساعدة (مع توزيعات)</h2>
        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs">
          {aids.map((a) => (
            <li key={String(a.id)} className="rounded bg-black/30 px-2 py-1">
              #{String(a.id)} {String(a.type)} {String(a.status)}
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-semibold text-white">توزيع مخزون على طلب</h2>
        <p className="mt-2 text-xs leading-relaxed text-white/55">
          أدخل رقم الطلب، ثم حدّد صفًا واحدًا للمادة والكمية، أو عدة صفوف عبر لوحة الإدخال المتقدمة أدناه.
        </p>
        <form className="mt-3 space-y-2" onSubmit={onDistribute}>
          <select
            className="w-full rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            value={aidId}
            onChange={(e) => setAidId(e.target.value)}
          >
            <option value="">اختر طلب المساعدة</option>
            {aids.map((aid) => (
              <option key={String(aid.id)} value={String(aid.id)}>
                #{String(aid.id)} — {String(aid.type ?? '—')} — {String(aid.status ?? '—')}
              </option>
            ))}
          </select>
          <textarea
            className="w-full rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 font-mono text-xs text-white"
            rows={3}
            placeholder='مثال: [{"inventory_item_id":1,"quantity":2}]'
            value={allocJson}
            onChange={(e) => setAllocJson(e.target.value)}
          />
          <div className="flex gap-2">
            <select
              className="min-w-[260px] rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
              value={invId}
              onChange={(e) => setInvId(e.target.value)}
            >
              <option value="">اختر صنف المخزون</option>
              {inventoryItems.map((item) => (
                <option key={String(item.id)} value={String(item.id)}>
                  #{String(item.id)} — {String(item.name ?? 'صنف')} (متبقي: {String(item.quantity_remaining ?? '0')})
                </option>
              ))}
            </select>
            <input
              className="w-20 rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
              placeholder="qty"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>
          <button type="submit" className="rounded-lg bg-orange-600 px-4 py-2 text-white">
            توزيع
          </button>
        </form>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-semibold text-white">تأكيد تسليم</h2>
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={onDeliver}>
          <select
            className="min-w-[260px] rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            value={delivAid}
            onChange={(e) => {
              setDelivAid(e.target.value)
              setSelectedAllocationIds([])
            }}
          >
            <option value="">اختر طلب المساعدة</option>
            {aids.map((aid) => (
              <option key={String(aid.id)} value={String(aid.id)}>
                #{String(aid.id)} — {String(aid.type ?? '—')} — {String(aid.status ?? '—')}
              </option>
            ))}
          </select>
          <select
            multiple
            className="min-h-[110px] min-w-[280px] flex-1 rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            value={selectedAllocationIds}
            onChange={(e) =>
              setSelectedAllocationIds(Array.from(e.target.selectedOptions).map((option) => option.value))
            }
          >
            {deliveryAllocationOptions.length === 0 ? (
              <option value="" disabled>
                لا توجد تخصيصات ظاهرة لهذا الطلب حالياً
              </option>
            ) : (
              deliveryAllocationOptions.map((allocation) => (
                <option key={allocation.id} value={allocation.id}>
                  {allocation.label}
                </option>
              ))
            )}
          </select>
          <button type="submit" className="rounded-lg bg-teal-600 px-4 py-2 text-white">
            تأكيد
          </button>
        </form>
      </section>
    </div>
  )
}
