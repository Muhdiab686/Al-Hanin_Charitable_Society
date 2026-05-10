import { type FormEvent, useEffect, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'

function pledgeLabel(raw: unknown): string {
  if (raw === 'monthly') {
    return 'شهري'
  }
  if (raw === 'quarterly') {
    return 'ربع سنوي'
  }
  if (raw === 'yearly') {
    return 'سنوي'
  }
  if (raw === 'once') {
    return 'مرّة واحدة'
  }

  return String(raw ?? '')
}

function donationTypeLabel(raw: unknown): string {
  if (raw === 'cash') {
    return 'نقدية'
  }
  if (raw === 'in_kind') {
    return 'عينية'
  }

  return String(raw ?? '')
}

function DetailCard({ donation }: { donation: Record<string, unknown> }) {
  const items = (donation.inventory_items ?? []) as Record<string, unknown>[]

  return (
    <div className="mt-4 rounded-2xl border border-white/15 bg-black/35 p-4 text-sm text-white/85">
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <p className="text-[11px] text-white/50">رقم الإيصال</p>
          <p className="font-mono text-white">{String(donation.receipt_code ?? '—')}</p>
        </div>
        <div>
          <p className="text-[11px] text-white/50">نوع التبرع</p>
          <p>{donationTypeLabel(donation.type)}</p>
        </div>
        <div>
          <p className="text-[11px] text-white/50">المبلغ النقدي</p>
          <p className="tabular-nums text-emerald-200/95">{String(donation.cash_amount ?? '—')}</p>
        </div>
        <div>
          <p className="text-[11px] text-white/50">قناة الإدخال</p>
          <p>{String(donation.channel ?? 'يدوي')}</p>
        </div>
        {(donation.purpose as string)?.trim() ? (
          <div className="sm:col-span-2">
            <p className="text-[11px] text-white/50">التوجيه / الغرض الخيري</p>
            <p>{String(donation.purpose)}</p>
          </div>
        ) : null}
        {(donation.pledge_frequency as string)?.trim() ? (
          <div>
            <p className="text-[11px] text-white/50">تكرار التبرع</p>
            <p>{pledgeLabel(donation.pledge_frequency)}</p>
          </div>
        ) : null}
      </div>
      {donation.type === 'in_kind' && items.length > 0 ? (
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="mb-2 text-xs font-semibold text-white">بنود عينية</p>
          <ul className="space-y-2 text-xs">
            {items.map((it) => (
              <li key={String(it.item_code ?? it.name)} className="rounded-lg bg-black/35 px-2 py-1">
                {String(it.name)} — الكمية: {String(it.quantity_remaining ?? it.quantity)}{' '}
                {it.storage_location ? `— الموقع: ${String(it.storage_location)}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

type Variant = 'finance' | 'donorPortal'

export function AccountantDonationsPage({ variant = 'finance' }: { variant?: Variant }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [cash, setCash] = useState(variant === 'donorPortal' ? '150' : '250')
  const [donorName, setDonorName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [pledgeFrequency, setPledgeFrequency] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  async function load() {
    setErr(null)
    try {
      const res = await api.fetchDonations({ page: 1 })
      setRows((res.data as Record<string, unknown>[]) ?? [])
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر تحميل التبرعات'))
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function toggleDetail(id: number) {
    if (expandedId === id) {
      setExpandedId(null)
      setDetail(null)

      return
    }
    setExpandedId(id)
    setDetailLoading(true)
    setErr(null)

    try {
      const d = (await api.fetchDonation(id)) as Record<string, unknown>
      setDetail(d)
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'تعذّر عرض التفاصيل'))
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  async function onCreateCash(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)

    try {
      const payload: Record<string, unknown> = {
        type: 'cash',
        channel: variant === 'donorPortal' ? 'web' : 'manual',
        cash_amount: Number(cash),
        donor_name: donorName.trim() || (variant === 'donorPortal' ? 'متبرع بالمنصّة' : 'متبرع نقدي'),
        notes:
          variant === 'donorPortal'
            ? 'تبرّع مسجّل عبر بوابة المتبرعين'
            : 'تبرّع مسجّل عبر وحدة المحاسبة',
      }

      if (purpose.trim()) {
        payload.purpose = purpose.trim()
      }
      if (pledgeFrequency.trim()) {
        payload.pledge_frequency = pledgeFrequency
      }

      await api.createDonation(payload)
      setMsg('تم حفظ التبرع وإصدار سجل الإيصال.')
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'تعذّر حفظ التبرع'))
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
        <h2 className="text-base font-semibold text-white">سجلّ التبرعات</h2>
        <div className="mt-4 space-y-2">
          {rows.length === 0 ? (
            <p className="text-white/55">لا توجد عناصر لعرضها حالياً.</p>
          ) : (
            rows.map((d) => {
              const id = Number(d.id)

              return (
                <div key={String(d.id)} className="rounded-xl border border-white/5 bg-black/30">
                  <button
                    type="button"
                    onClick={() => void toggleDetail(id)}
                    className="flex w-full flex-wrap justify-between gap-2 px-3 py-3 text-start text-xs text-white/85 hover:bg-white/5"
                  >
                    <span className="font-mono text-white/55">#{id}</span>
                    <span>{donationTypeLabel(d.type)}</span>
                    <span className="tabular-nums text-emerald-200/95">{String(d.cash_amount ?? '—')}</span>
                  </button>
                  {expandedId === id ? (
                    <div className="border-t border-white/10 px-3 pb-3">
                      {detailLoading ? (
                        <p className="pt-3 text-[11px] text-white/50">جاري التحميل…</p>
                      ) : detail ? (
                        <DetailCard donation={detail} />
                      ) : (
                        <p className="pt-3 text-[11px] text-white/50">اختر عملية مختلفة وحاول مجدداً.</p>
                      )}
                    </div>
                  ) : null}
                </div>
              )
            })
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white">إضافة تبرع نقدي</h2>
        <p className="mt-1 text-xs text-white/50">
          التبرعات العينية تُسجّل عبر فريق التخزين لضمان ضبط المخزون.
        </p>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={onCreateCash}>
          <label className="space-y-1 text-xs">
            <span className="text-white/60">المبلغ</span>
            <input
              className="w-full rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              inputMode="decimal"
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-white/60">اسم المتبرع (اختياري)</span>
            <input
              className="w-full rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
            />
          </label>
          <label className="space-y-1 text-xs md:col-span-2">
            <span className="text-white/60">التوجيه (مثل: كسوة، دواء عاجل)</span>
            <input
              className="w-full rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="أين تود أن يذهب أثر هذا التبرع؟"
            />
          </label>
          <label className="space-y-1 text-xs md:col-span-2">
            <span className="text-white/60">تكرار التبرع (اختياري)</span>
            <select
              className="w-full rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              value={pledgeFrequency}
              onChange={(e) => setPledgeFrequency(e.target.value)}
            >
              <option value="">مرّة واحدة</option>
              <option value="monthly">شهري</option>
              <option value="quarterly">ربع سنوي</option>
              <option value="yearly">سنوي</option>
              <option value="once">تأكيد كتبرّع وحيد</option>
            </select>
          </label>
          <button
            type="submit"
            className={`rounded-xl px-4 py-2 font-medium text-slate-900 md:col-span-2 ${variant === 'donorPortal' ? 'bg-rose-400' : 'bg-amber-500'}`}
          >
            حفظ التبرع النقدي
          </button>
        </form>
      </section>
    </div>
  )
}
