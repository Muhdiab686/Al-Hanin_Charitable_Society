import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import { labelAidTypeAr } from '../../lib/operationalLabels'

const PAYMENT_METHODS = [
  { value: 'card', label: 'بطاقة بنكية' },
  { value: 'bank_transfer', label: 'تحويل بنكي' },
  { value: 'ewallet', label: 'محفظة إلكترونية' },
]

function campaignStatusLabel(status: string): string {
  if (status === 'completed') {
    return 'مكتملة'
  }
  if (status === 'paused') {
    return 'متوقفة'
  }
  return 'نشطة'
}

export function DonorDonationsPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [campaigns, setCampaigns] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const [showDonateDialog, setShowDonateDialog] = useState(false)
  const [showCampaignDonateDialog, setShowCampaignDonateDialog] = useState(false)
  const [showReceiptDialog, setShowReceiptDialog] = useState(false)
  const [selectedDonation, setSelectedDonation] = useState<Record<string, unknown> | null>(null)
  const [receiptQr, setReceiptQr] = useState<string | null>(null)

  const [amount, setAmount] = useState('50')
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0].value)
  const [showDonorName, setShowDonorName] = useState(true)
  const [donorName, setDonorName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [frequency, setFrequency] = useState<'once' | 'monthly' | 'yearly'>('once')
  const [notes, setNotes] = useState('')

  const [campaignId, setCampaignId] = useState('')
  const [urgentCases, setUrgentCases] = useState<Record<string, unknown>[]>([])
  const [urgentDonateId, setUrgentDonateId] = useState<number | null>(null)
  const [urgentAmount, setUrgentAmount] = useState('50')

  const totalGiven = useMemo(() => {
    return rows.reduce((sum, row) => sum + Number(row.cash_amount ?? 0), 0)
  }, [rows])

  async function load() {
    setLoading(true)
    setErr(null)
    try {
      const donations = await api.fetchDonations({ page: 1 })
      setRows((donations.data as Record<string, unknown>[]) ?? [])

      try {
        const urgent = await api.fetchPublishedAidRequests({ page: 1 })
        setUrgentCases((urgent.data as Record<string, unknown>[]) ?? [])
      } catch {
        setUrgentCases([])
      }

      try {
        const c = await api.fetchDonorCampaigns()
        setCampaigns(c)
      } catch {
        setCampaigns([])
      }
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر تحميل بيانات المتبرع'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function onDonate(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    try {
      if (paymentMethod === 'card') {
        const checkout = await api.createStripeCheckout({
          amount: Number(amount),
          purpose: purpose.trim() || undefined,
          show_donor_name: showDonorName,
          donor_name: showDonorName ? donorName.trim() || undefined : undefined,
        })
        window.location.href = checkout.checkout_url
        return
      }

      await api.createDonation({
        type: 'cash',
        channel: 'web',
        cash_amount: Number(amount),
        purpose: purpose.trim() || null,
        show_donor_name: showDonorName,
        donor_name: showDonorName ? donorName.trim() || 'متبرع' : 'متبرع مجهول',
        pledge_frequency: frequency,
        notes: [
          notes.trim() || null,
          `طريقة الدفع: ${PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.label ?? paymentMethod}`,
        ]
          .filter(Boolean)
          .join(' | '),
      })
      setMsg('تم تسجيل التبرع بنجاح.')
      setShowDonateDialog(false)
      await load()
    } catch (e) {
      setErr(extractErrorMessage(e, 'فشل تسجيل التبرع'))
    }
  }

  async function onDonateCampaign(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    if (!campaigns.length && !purpose.trim()) {
      setErr('لا توجد حملات متاحة حالياً. أدخل اسم الجهة أو المشروع في حقل التخصيص.')
      return
    }
    const campaign = campaigns.find((c) => String(c.id) === campaignId)
    try {
      if (paymentMethod === 'card') {
        const checkout = await api.createStripeCheckout({
          amount: Number(amount),
          purpose: campaign ? String(campaign.title ?? 'حملة') : purpose.trim() || undefined,
          campaign_id: campaign ? Number(campaign.id) : undefined,
          show_donor_name: showDonorName,
          donor_name: showDonorName ? donorName.trim() || undefined : undefined,
        })
        window.location.href = checkout.checkout_url
        return
      }
      await api.createDonation({
        type: 'cash',
        channel: 'web',
        cash_amount: Number(amount),
        purpose: campaign ? `حملة: ${String(campaign.title ?? '')}` : purpose.trim() || null,
        campaign_id: campaign ? Number(campaign.id) : undefined,
        show_donor_name: showDonorName,
        donor_name: showDonorName ? donorName.trim() || 'متبرع' : 'متبرع مجهول',
        pledge_frequency: frequency,
        notes: `تبرع مباشر لحملة محددة${campaign ? ` (#${String(campaign.id ?? '')})` : ''}`,
      })
      setMsg('تم التبرع للحملة بنجاح.')
      setShowCampaignDonateDialog(false)
      await load()
    } catch (e) {
      setErr(extractErrorMessage(e, 'فشل تبرع الحملة'))
    }
  }

  async function openReceiptDialog(donation: Record<string, unknown>) {
    setSelectedDonation(donation)
    setReceiptQr(null)
    setShowReceiptDialog(true)

    const donationId = Number(donation.id)
    if (!Number.isFinite(donationId) || donationId <= 0) {
      return
    }

    try {
      const qr = await api.fetchDonationReceiptQr(donationId)
      setReceiptQr(`data:${qr.mime_type};base64,${qr.png_base64}`)
    } catch {
      setReceiptQr(null)
    }
  }

  return (
    <div className="space-y-6 text-sm text-white/82">
      {(msg || err) && (
        <div
          className={`fixed inset-x-4 top-4 z-50 mx-auto max-w-lg rounded-xl px-4 py-3 shadow-lg ${err ? 'border border-red-400/35 bg-red-600/90 text-red-50' : 'border border-emerald-400/35 bg-emerald-600/90 text-emerald-50'}`}
        >
          {err ?? msg}
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">التبرع الإلكتروني وأثره</h2>
            <p className="mt-1 text-xs text-white/55">
              إجمالي تبرعاتك المسجلة: <span className="font-mono">{totalGiven.toFixed(2)}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowDonateDialog(true)}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
            >
              تبرع إلكتروني
            </button>
            <button
              type="button"
              onClick={() => setShowCampaignDonateDialog(true)}
              className="rounded-lg border border-rose-300/35 bg-rose-600/20 px-3 py-1.5 text-xs font-semibold text-white"
            >
              تبرع لحملة محددة
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">طلبات مساعدة طارئة (من الجمعية)</h3>
            <p className="mt-1 text-xs text-amber-100/85">
              حالات نشرتها الجمعية بعد الاعتماد — بجانب الحملات. الطلبات المرفوضة لا تظهر هنا.
            </p>
          </div>
          <Link
            to="/app/donor/urgent-aid"
            className="rounded-lg border border-amber-300/40 bg-amber-600/25 px-3 py-1.5 text-xs font-medium text-amber-50"
          >
            عرض الكل
          </Link>
        </div>
        <ul className="mt-4 space-y-3">
          {urgentCases.length === 0 ? (
            <li className="text-xs text-white/55">لا توجد حالات منشورة حالياً.</li>
          ) : (
            urgentCases.slice(0, 5).map((r) => (
              <li key={String(r.id)} className="rounded-xl border border-white/10 bg-black/25 p-4">
                <p className="font-semibold text-white">{String(r.public_title ?? '—')}</p>
                <p className="mt-1 text-xs text-white/65 line-clamp-2">{String(r.public_summary ?? '')}</p>
                <p className="mt-2 text-[11px] text-white/45">النوع: {labelAidTypeAr(r.type)}</p>
                {urgentDonateId === Number(r.id) ? (
                  <form
                    className="mt-3 flex flex-wrap items-end gap-2"
                    onSubmit={async (e) => {
                      e.preventDefault()
                      setMsg(null)
                      setErr(null)
                      try {
                        const checkout = await api.createStripeCheckout({
                          amount: Number(urgentAmount),
                          purpose: `حالة طارئة: ${String(r.public_title ?? '')} (#${String(r.id)})`,
                          show_donor_name: showDonorName,
                          donor_name: showDonorName ? donorName.trim() || undefined : undefined,
                        })
                        window.location.href = checkout.checkout_url
                      } catch (ex) {
                        setErr(extractErrorMessage(ex, 'فشل التحويل إلى الدفع الإلكتروني'))
                      }
                    }}
                  >
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-white/55">مبلغ التبرع</span>
                      <input
                        className="w-28 rounded-lg border border-white/15 bg-slate-950/50 px-2 py-2 text-white"
                        value={urgentAmount}
                        onChange={(e) => setUrgentAmount(e.target.value)}
                      />
                    </label>
                    <button type="submit" className="rounded-lg bg-amber-600 px-4 py-2 text-white">
                      الدفع الإلكتروني
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-white/20 px-3 py-2 text-white/80"
                      onClick={() => setUrgentDonateId(null)}
                    >
                      إلغاء
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="mt-3 rounded-lg bg-amber-600/90 px-4 py-2 text-xs font-medium text-white"
                    onClick={() => setUrgentDonateId(Number(r.id))}
                  >
                    التبرع لهذه الحالة
                  </button>
                )}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-base font-semibold text-white">الحملات النشطة</h3>
        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
          {campaigns.length === 0 ? (
            <p className="text-xs text-white/50">لا توجد حملات متاحة حالياً.</p>
          ) : (
            campaigns.map((c) => (
              <div key={String(c.id)} className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-white">{String(c.title ?? 'حملة')}</p>
                  <span className="rounded-full border border-fuchsia-300/30 bg-fuchsia-500/15 px-2 py-0.5 text-[10px] text-fuchsia-100">
                    {campaignStatusLabel(String(c.status ?? 'active'))}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-white/50">
                  كود الحملة: CMP-{String(c.id)} {c.ends_at ? `• إغلاق: ${String(c.ends_at)}` : ''}
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-fuchsia-500"
                    style={{ width: `${Math.min(100, Math.max(0, Number(c.progress_percentage ?? 0)))}%` }}
                  />
                </div>
                <div className="mt-2 grid gap-1 text-[11px] text-fuchsia-100/90 sm:grid-cols-3">
                  <p>
                    تم جمع: <span className="font-mono">{String(c.raised_amount ?? '0')}</span>
                  </p>
                  <p>
                    المتبقي: <span className="font-mono">{String(Math.max(0, Number(c.goal_amount ?? 0) - Number(c.raised_amount ?? 0)))}</span>
                  </p>
                  <p>
                    الرصيد: <span className="font-mono">{String(c.wallet_balance ?? '0')}</span>
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-base font-semibold text-white">سجل تبرعاتي ومتابعة الأثر</h3>
        <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[820px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-black/35 text-[10px] uppercase text-white/45">
                <th className="px-3 py-2 text-start font-semibold">الإيصال</th>
                <th className="px-3 py-2 text-start font-semibold">النوع</th>
                <th className="px-3 py-2 text-start font-semibold">المبلغ</th>
                <th className="px-3 py-2 text-start font-semibold">التكرار</th>
                <th className="px-3 py-2 text-start font-semibold">الغرض/المشروع</th>
                <th className="px-3 py-2 text-start font-semibold">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-white/45">
                    جاري التحميل...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-white/45">
                    لا توجد تبرعات بعد.
                  </td>
                </tr>
              ) : (
                rows.map((d, idx) => (
                  <tr key={String(d.id)} className={`border-b border-white/[0.06] ${idx % 2 === 0 ? 'bg-black/12' : ''}`}>
                    <td className="px-3 py-2 font-mono text-rose-100">{String(d.receipt_code ?? '—')}</td>
                    <td className="px-3 py-2">{String(d.type ?? '—')}</td>
                    <td className="px-3 py-2 font-mono">{String(d.cash_amount ?? '—')}</td>
                    <td className="px-3 py-2">{String(d.pledge_frequency ?? 'مرة واحدة')}</td>
                    <td className="max-w-[16rem] truncate px-3 py-2">{String(d.purpose ?? 'تبرع عام')}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => void openReceiptDialog(d)}
                        className="rounded-md border border-white/20 px-2 py-1 text-[11px] text-white"
                      >
                        عرض الإيصال
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showDonateDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-rose-300/25 bg-slate-950 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">التبرع الإلكتروني</h3>
              <button type="button" onClick={() => setShowDonateDialog(false)} className="rounded-lg border border-white/20 px-3 py-1 text-xs text-white">
                إغلاق
              </button>
            </div>
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={onDonate}>
              <input
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                placeholder="المبلغ"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <select
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <label className="sm:col-span-2 flex items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/85">
                <input type="checkbox" checked={showDonorName} onChange={(e) => setShowDonorName(e.target.checked)} />
                إظهار اسم المتبرع
              </label>
              {showDonorName ? (
                <input
                  className="sm:col-span-2 rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                  placeholder="اسم المتبرع"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                />
              ) : null}
              <select
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as 'once' | 'monthly' | 'yearly')}
              >
                <option value="once">مرة واحدة</option>
                <option value="monthly">شهري</option>
                <option value="yearly">سنوي</option>
              </select>
              <input
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                placeholder="تخصيص التبرع (مشروع/جهة)"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
              <textarea
                className="sm:col-span-2 rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                rows={2}
                placeholder="ملاحظات"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <button type="submit" className="sm:col-span-2 rounded-lg bg-rose-600 py-2.5 font-medium text-white">
                {paymentMethod === 'card' ? 'الانتقال إلى Stripe' : 'تنفيذ التبرع'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {showCampaignDonateDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-fuchsia-300/25 bg-slate-950 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">التبرع المباشر لحملة</h3>
              <button type="button" onClick={() => setShowCampaignDonateDialog(false)} className="rounded-lg border border-white/20 px-3 py-1 text-xs text-white">
                إغلاق
              </button>
            </div>
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={onDonateCampaign}>
              <select
                className="sm:col-span-2 rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                disabled={campaigns.length === 0}
              >
                <option value="">{campaigns.length === 0 ? 'لا توجد حملات متاحة' : '— اختر حملة نشطة —'}</option>
                {campaigns.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {String(c.title ?? 'حملة')} (#{String(c.id)})
                  </option>
                ))}
              </select>
              <label className="sm:col-span-2 flex items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/85">
                <input type="checkbox" checked={showDonorName} onChange={(e) => setShowDonorName(e.target.checked)} />
                إظهار اسم المتبرع
              </label>
              {showDonorName ? (
                <input
                  className="sm:col-span-2 rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                  placeholder="اسم المتبرع"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                />
              ) : null}
              <input
                className="sm:col-span-2 rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                placeholder="أو أدخل اسم الجهة/المشروع يدوياً عند عدم توفر الحملات"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
              <input
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                placeholder="المبلغ"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <select
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <select
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as 'once' | 'monthly' | 'yearly')}
              >
                <option value="once">مرة واحدة</option>
                <option value="monthly">شهري</option>
                <option value="yearly">سنوي</option>
              </select>
              <button type="submit" className="sm:col-span-2 rounded-lg bg-fuchsia-600 py-2.5 font-medium text-white">
                {paymentMethod === 'card' ? 'الدفع عبر Stripe' : 'تبرع للحملة'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {showReceiptDialog && selectedDonation ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/20 bg-slate-950 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">إيصال تبرع رسمي</h3>
              <button type="button" onClick={() => setShowReceiptDialog(false)} className="rounded-lg border border-white/20 px-3 py-1 text-xs text-white">
                إغلاق
              </button>
            </div>
            <div className="space-y-2 text-sm text-white/80">
              <p>
                رقم الإيصال: <span className="font-mono text-rose-100">{String(selectedDonation.receipt_code ?? '—')}</span>
              </p>
              <p>النوع: {String(selectedDonation.type ?? '—')}</p>
              <p>المبلغ: {String(selectedDonation.cash_amount ?? '—')}</p>
              <p>الغرض: {String(selectedDonation.purpose ?? 'تبرع عام')}</p>
              <p>التكرار: {String(selectedDonation.pledge_frequency ?? 'مرة واحدة')}</p>
              <p>التاريخ: {String(selectedDonation.created_at ?? '—')}</p>
              {receiptQr ? (
                <div className="pt-2">
                  <p className="mb-2 text-xs text-white/60">QR إيصال التبرع</p>
                  <img src={receiptQr} alt="Donation receipt QR" className="h-40 w-40 rounded-lg border border-white/20 bg-white p-1" />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
