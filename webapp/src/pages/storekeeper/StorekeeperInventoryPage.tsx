import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import { labelInventoryStatusAr, labelRemovalReasonAr } from '../../lib/operationalLabels'

const LOW_STOCK_THRESHOLD = 5

function daysUntil(dateLike: unknown): number | null {
  if (typeof dateLike !== 'string' || !dateLike.trim()) {
    return null
  }
  const target = new Date(dateLike)
  if (Number.isNaN(target.getTime())) {
    return null
  }
  const now = new Date()
  const diff = target.getTime() - now.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function StorekeeperInventoryPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [spoilageCategory, setSpoilageCategory] = useState('')

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)

  const [selectedItem, setSelectedItem] = useState<Record<string, unknown> | null>(null)

  const [itemName, setItemName] = useState('دواء')
  const [itemQty, setItemQty] = useState('20')
  const [itemExpiry, setItemExpiry] = useState('')
  const [itemLocation, setItemLocation] = useState('WH-1')
  const [itemNotes, setItemNotes] = useState('')
  const [itemConditionNotes, setItemConditionNotes] = useState('')
  const [itemSpoilageCategory, setItemSpoilageCategory] = useState('non_perishable')

  const [removeQty, setRemoveQty] = useState('1')
  const [removeReason, setRemoveReason] = useState('damaged')
  const [removeNotes, setRemoveNotes] = useState('')

  const lowStockItems = useMemo(() => {
    return rows.filter((row) => Number(row.quantity_remaining ?? 0) <= LOW_STOCK_THRESHOLD)
  }, [rows])

  const expiringOrExpiredItems = useMemo(() => {
    return rows.filter((row) => {
      const days = daysUntil(row.expiry_date)
      return days !== null && days <= 30
    })
  }, [rows])

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const res = await api.fetchInventoryItems({
        page,
        q: search.trim() || undefined,
        spoilage_category: spoilageCategory || undefined,
      })
      setRows((res.data as Record<string, unknown>[]) ?? [])
      setLastPage(Math.max(1, res.last_page))
      setTotal(res.total ?? 0)
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر تحميل المخزون'))
    } finally {
      setLoading(false)
    }
  }, [page, search, spoilageCategory])

  useEffect(() => {
    void load()
  }, [load])

  async function onAddMaterial(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    try {
      const response = (await api.createDonation({
        type: 'in_kind',
        channel: 'manual',
        donor_name: 'إدخال مستودع مباشر',
        notes: itemNotes.trim() || null,
        items: [
          {
            name: itemName.trim(),
            spoilage_category: itemSpoilageCategory,
            quantity: Number(itemQty),
            expiry_date: itemExpiry || null,
            condition_notes: itemConditionNotes.trim() || null,
            storage_location: itemLocation.trim() || null,
          },
        ],
      })) as { donation?: { inventory_items?: Array<{ item_code?: string }> } }

      const code = response?.donation?.inventory_items?.[0]?.item_code
      setMsg(code ? `تم إدخال المادة الجديدة. الباركود: ${code}` : 'تم إدخال مادة جديدة للمخزون.')
      setShowAddDialog(false)
      await load()
    } catch (e) {
      setErr(extractErrorMessage(e, 'فشل إدخال المادة'))
    }
  }

  async function onRemoveFromStock(e: FormEvent) {
    e.preventDefault()
    if (!selectedItem) {
      return
    }
    setMsg(null)
    setErr(null)
    try {
      const res = (await api.removeInventoryItem(Number(selectedItem.id), {
        quantity: Number(removeQty),
        reason: removeReason,
        notes: removeNotes.trim() || null,
      })) as { removal?: { id?: number } }
      setMsg(
        `تم إخراج المادة بنجاح${res?.removal?.id ? ` — إيصال التخريج #${String(res.removal.id)}` : '.'}`,
      )
      setShowRemoveDialog(false)
      await load()
    } catch (e) {
      setErr(extractErrorMessage(e, 'فشل إخراج المادة'))
    }
  }

  return (
    <div className="space-y-6 text-sm text-white/85">
      {(msg || err) && (
        <div
          className={`fixed inset-x-4 top-4 z-50 mx-auto max-w-lg rounded-xl px-4 py-3 shadow-lg ${err ? 'border border-red-400/35 bg-red-600/90 text-red-50' : 'border border-emerald-400/35 bg-emerald-600/90 text-emerald-50'}`}
        >
          {err ?? msg}
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-white">إدارة المستودع</h2>
            <p className="mt-1 text-xs text-white/55">
              إدخال مواد للمستودع مع الباركود، إخراج مواد بإيصال، ومتابعة الصلاحية للمواد القابلة للتلف فقط.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddDialog(true)}
            className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white transition active:scale-[0.98] hover:bg-orange-500"
          >
            + إضافة مادة
          </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-rose-400/25 bg-rose-950/15 p-4">
          <h3 className="font-semibold text-rose-100">تنبيه نقص المخزون</h3>
          <p className="mt-1 text-xs text-white/60">الحد الأدنى التشغيلي: {LOW_STOCK_THRESHOLD}</p>
          <div className="mt-3 max-h-40 space-y-1 overflow-y-auto">
            {lowStockItems.length === 0 ? (
              <p className="text-xs text-white/45">لا يوجد نقص حرج في الصفحة الحالية.</p>
            ) : (
              lowStockItems.map((item) => (
                <p key={String(item.id)} className="rounded bg-black/25 px-2 py-1 text-xs">
                  #{String(item.id)} {String(item.name ?? '—')} — المتبقي {String(item.quantity_remaining ?? 0)}
                </p>
              ))
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-amber-300/25 bg-amber-950/15 p-4">
          <h3 className="font-semibold text-amber-100">متابعة صلاحية المواد</h3>
          <p className="mt-1 text-xs text-white/60">يظهر هنا القريب من الانتهاء أو المنتهي خلال 30 يوم.</p>
          <div className="mt-3 max-h-40 space-y-1 overflow-y-auto">
            {expiringOrExpiredItems.length === 0 ? (
              <p className="text-xs text-white/45">لا مواد حرجة للصلاحية في الصفحة الحالية.</p>
            ) : (
              expiringOrExpiredItems.map((item) => {
                const d = daysUntil(item.expiry_date)
                return (
                  <p key={String(item.id)} className="rounded bg-black/25 px-2 py-1 text-xs">
                    #{String(item.id)} {String(item.name ?? '—')} — الانتهاء: {String(item.expiry_date ?? '—')}
                    {d !== null ? ` (${d} يوم)` : ''}
                  </p>
                )
              })
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">المخزون</h3>
            <p className="mt-1 text-xs text-white/50">
              {total > 0 ? `${total} بند — صفحة ${page} من ${lastPage}` : 'لا بيانات حالياً.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الفئة/الباركود"
              className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-xs text-white"
            />
            <select
              value={spoilageCategory}
              onChange={(e) => setSpoilageCategory(e.target.value)}
              className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-xs text-white"
            >
              <option value="">كل الفئات</option>
              <option value="non_perishable">غير سريع التلف</option>
              <option value="perishable">سريع التلف</option>
              <option value="medical">طبي</option>
            </select>
            <button type="button" onClick={() => void load()} className="rounded-lg border border-white/15 px-3 py-2 text-xs">
              تحديث
            </button>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-white/15 px-3 py-2 text-xs disabled:opacity-40"
            >
              السابق
            </button>
            <button
              type="button"
              disabled={page >= lastPage}
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              className="rounded-lg border border-white/15 px-3 py-2 text-xs disabled:opacity-40"
            >
              التالي
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[900px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-black/35 text-[10px] uppercase tracking-wide text-white/45">
                <th className="px-3 py-2.5 text-start font-semibold">#</th>
                <th className="px-3 py-2.5 text-start font-semibold">الاسم</th>
                <th className="px-3 py-2.5 text-start font-semibold">الباركود</th>
                <th className="px-3 py-2.5 text-start font-semibold">المتبقي</th>
                <th className="px-3 py-2.5 text-start font-semibold">الانتهاء</th>
                <th className="px-3 py-2.5 text-start font-semibold">الحالة</th>
                <th className="px-3 py-2.5 text-start font-semibold">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-white/45">
                    جاري التحميل...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-white/45">
                    لا يوجد مخزون مطابق.
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => (
                  <tr key={String(r.id)} className={`border-b border-white/[0.06] ${idx % 2 === 0 ? 'bg-black/12' : ''}`}>
                    <td className="px-3 py-2.5 font-mono">#{String(r.id)}</td>
                    <td className="px-3 py-2.5 text-white">{String(r.name ?? '—')}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-cyan-100/90">{String(r.item_code ?? '—')}</td>
                    <td className="px-3 py-2.5 font-mono">{String(r.quantity_remaining ?? '0')}</td>
                    <td className="px-3 py-2.5">{String(r.expiry_date ?? '—')}</td>
                    <td className="px-3 py-2.5">{labelInventoryStatusAr(r.status)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItem(r)
                            setRemoveQty('1')
                            setRemoveReason('damaged')
                            setRemoveNotes('')
                            setShowRemoveDialog(true)
                          }}
                          className="rounded-md bg-rose-700 px-2 py-1 text-[11px] text-white transition active:scale-[0.98] hover:bg-rose-600"
                        >
                          إخراج مادة
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showAddDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-orange-300/25 bg-slate-950 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">إدخال مادة جديدة</h3>
              <button type="button" onClick={() => setShowAddDialog(false)} className="rounded-lg border border-white/20 px-3 py-1 text-xs text-white">
                إغلاق
              </button>
            </div>
            <p className="mb-3 text-xs text-white/60">
              أدخل بيانات المادة الجديدة. للمواد غير القابلة للتلف لا يلزم تاريخ انتهاء. يُولَّد باركود تلقائياً عند الحفظ.
            </p>
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={onAddMaterial}>
              <input
                required
                className="sm:col-span-2 rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                placeholder="اسم المادة"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
              />
              <input
                required
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                placeholder="الكمية"
                value={itemQty}
                onChange={(e) => setItemQty(e.target.value)}
              />
              <select
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                value={itemSpoilageCategory}
                onChange={(e) => {
                  setItemSpoilageCategory(e.target.value)
                  if (e.target.value === 'non_perishable') {
                    setItemExpiry('')
                  }
                }}
              >
                <option value="non_perishable">غير سريع التلف</option>
                <option value="perishable">سريع التلف</option>
                <option value="medical">طبي</option>
              </select>
              {itemSpoilageCategory !== 'non_perishable' ? (
                <input
                  type="date"
                  className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                  value={itemExpiry}
                  onChange={(e) => setItemExpiry(e.target.value)}
                />
              ) : (
                <p className="flex items-center rounded-lg border border-dashed border-white/15 px-3 py-2 text-xs text-white/50">
                  لا يلزم تاريخ انتهاء للمواد غير القابلة للتلف
                </p>
              )}
              <input
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                placeholder="موقع التخزين"
                value={itemLocation}
                onChange={(e) => setItemLocation(e.target.value)}
              />
              <input
                className="sm:col-span-2 rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                placeholder="ملاحظات الحالة"
                value={itemConditionNotes}
                onChange={(e) => setItemConditionNotes(e.target.value)}
              />
              <textarea
                className="sm:col-span-2 rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                rows={2}
                placeholder="ملاحظات الإدخال"
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
              />
              <button type="submit" className="sm:col-span-2 rounded-lg bg-orange-600 py-2.5 font-medium text-white">
                حفظ وإصدار باركود
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {showRemoveDialog && selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-rose-300/25 bg-slate-950 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">إخراج مادة وإصدار إيصال</h3>
              <button type="button" onClick={() => setShowRemoveDialog(false)} className="rounded-lg border border-white/20 px-3 py-1 text-xs text-white">
                إغلاق
              </button>
            </div>
            <p className="mb-3 text-xs text-white/60">
              المادة: {String(selectedItem.name ?? '—')} — الباركود: {String(selectedItem.item_code ?? '—')}
            </p>
            <form className="space-y-3" onSubmit={onRemoveFromStock}>
              <input
                className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                placeholder="الكمية"
                value={removeQty}
                onChange={(e) => setRemoveQty(e.target.value)}
              />
              <select
                className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
              >
                <option value="expired">{labelRemovalReasonAr('expired')}</option>
                <option value="damaged">{labelRemovalReasonAr('damaged')}</option>
                <option value="lost">{labelRemovalReasonAr('lost')}</option>
                <option value="other">{labelRemovalReasonAr('other')}</option>
              </select>
              <textarea
                className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                rows={2}
                placeholder="ملاحظات الإخراج"
                value={removeNotes}
                onChange={(e) => setRemoveNotes(e.target.value)}
              />
              <button type="submit" className="w-full rounded-lg bg-rose-700 py-2.5 font-medium text-white">
                تأكيد الإخراج
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
