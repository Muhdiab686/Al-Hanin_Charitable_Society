import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { extractErrorMessage } from '../../api/client'
import type { CampaignReportingResponse } from '../../api/services'
import * as api from '../../api/services'
import { labelAidTypeAr } from '../../lib/operationalLabels'

const PAYMENT_METHODS = [
  { value: 'card', label: 'بطاقة بنكية' },
  { value: 'bank_transfer', label: 'تحويل بنكي' },
  { value: 'ewallet', label: 'محفظة إلكترونية' },
]

export function DonorDonationsPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [campaigns, setCampaigns] = useState<CampaignReportingResponse['awareness_activities']>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [campaignsNotice, setCampaignsNotice] = useState<string | null>(null)

  const [showDonateDialog, setShowDonateDialog] = useState(false)
  const [showCampaignDonateDialog, setShowCampaignDonateDialog] = useState(false)
  const [showReceiptDialog, setShowReceiptDialog] = useState(false)
  const [selectedDonation, setSelectedDonation] = useState<Record<string, unknown> | null>(null)

  const [amount, setAmount] = useState('50')
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0].value)
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
    setCampaignsNotice(null)
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
        const reporting = await api.fetchCampaignReporting()
        setCampaigns(reporting.awareness_activities ?? [])
      } catch {
        setCampaigns([])
        setCampaignsNotice('عرض الحملات غير متاح حالياً لحسابك. يمكنك الاستمرار بالتبرع العام أو التخصيص النصّي.')
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
      await api.createDonation({
        type: 'cash',
        channel: 'web',
        cash_amount: Number(amount),
        purpose: purpose.trim() || null,
        pledge_frequency: frequency,
        notes: [
          notes.trim() || null,
          `طريقة الدفع: ${PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.label ?? paymentMethod}`,
        ]
          .filter(Boolean)
          .join(' | '),
      })
      setMsg('تم إرسال التبرع الإلكتروني بنجاح.')
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
      await api.createDonation({
        type: 'cash',
        channel: 'web',
        cash_amount: Number(amount),
        purpose: campaign ? `حملة: ${campaign.title}` : purpose.trim() || null,
        pledge_frequency: frequency,
        notes: `تبرع مباشر لحملة محددة${campaign ? ` (#${campaign.id})` : ''}`,
      })
      setMsg('تم التبرع المباشر للحملة بنجاح.')
      setShowCampaignDonateDialog(false)
      await load()
    } catch (e) {
      setErr(extractErrorMessage(e, 'فشل تبرع الحملة'))
    }
  }

  return (
    <div className="space-y-6 text-sm text-white/82">
      {(msg || err) && (
        <div
          className={`rounded-xl px-4 py-3 ${err ? 'border border-red-400/35 bg-red-500/12 text-red-50' : 'border border-emerald-400/35 bg-emerald-500/12 text-emerald-50'}`}
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
                        await api.createDonation({
                          type: 'cash',
                          channel: 'donor_portal',
                          cash_amount: Number(urgentAmount),
                          purpose: `طوارئ-مساعدة:#${String(r.id)}`,
                          donor_name: 'متبرع بالمنصّة',
                          notes: `تبرع لحالة: ${String(r.public_title ?? '')}`,
                        })
                        setMsg('تم تسجيل تبرعك للحالة الطارئة.')
                        setUrgentDonateId(null)
                        await load()
                      } catch (ex) {
                        setErr(extractErrorMessage(ex, 'فشل التبرع'))
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
                      تأكيد
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
        {campaignsNotice ? (
          <div className="mt-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            {campaignsNotice}
          </div>
        ) : null}
        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
          {campaigns.length === 0 ? (
            <p className="text-xs text-white/50">لا توجد حملات متاحة حالياً.</p>
          ) : (
            campaigns.map((c) => (
              <div key={c.id} className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
                <p className="font-medium text-white">{c.title}</p>
                <p className="mt-1 text-[12px] text-white/62">حالة: {c.status}</p>
                <p className="text-[12px] text-white/62">
                  مستفيدون مرتبطون: <span className="font-mono">{c.linked_beneficiaries_count}</span>
                </p>
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
                        onClick={() => {
                          setSelectedDonation(d)
                          setShowReceiptDialog(true)
                        }}
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
                تنفيذ التبرع
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
                  <option key={c.id} value={String(c.id)}>
                    {c.title} (#{c.id})
                  </option>
                ))}
              </select>
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
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as 'once' | 'monthly' | 'yearly')}
              >
                <option value="once">مرة واحدة</option>
                <option value="monthly">شهري</option>
                <option value="yearly">سنوي</option>
              </select>
              <button type="submit" className="sm:col-span-2 rounded-lg bg-fuchsia-600 py-2.5 font-medium text-white">
                تبرع للحملة
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
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
