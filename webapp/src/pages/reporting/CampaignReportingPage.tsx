import { type FormEvent, useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { extractErrorMessage } from '../../api/client'
import type { CampaignReportingResponse } from '../../api/services'
import * as api from '../../api/services'
import { BarChartCard } from '../../components/dashboard/BarChartCard'
import type { ChartDatum } from '../../components/dashboard/chartTypes'

function formatCash(n: number): string {
  return new Intl.NumberFormat('ar-IQ', {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function formatInt(n: number): string {
  return new Intl.NumberFormat('ar-IQ').format(n)
}

function statusLabelAr(status: string): string {
  if (status === 'draft') {
    return 'مسودة'
  }
  if (status === 'completed') {
    return 'مكتملة'
  }
  if (status === 'closed') {
    return 'مغلقة'
  }
  return 'نشطة'
}

function statusBadgeClass(status: string): string {
  if (status === 'draft') {
    return 'border-white/25 bg-white/10 text-white/70'
  }
  if (status === 'completed') {
    return 'border-emerald-300/35 bg-emerald-500/15 text-emerald-100'
  }
  if (status === 'closed') {
    return 'border-rose-300/35 bg-rose-500/15 text-rose-100'
  }
  return 'border-sky-300/35 bg-sky-500/15 text-sky-100'
}

export function CampaignReportingPage() {
  const { user } = useAuth()
  const canManageCampaigns = user?.role === 'recording_secretary'
  const [data, setData] = useState<CampaignReportingResponse | null>(null)
  const [campaigns, setCampaigns] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [campaignMsg, setCampaignMsg] = useState<string | null>(null)
  const [campaignErr, setCampaignErr] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [goalAmount, setGoalAmount] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [walletCampaignId, setWalletCampaignId] = useState<number | null>(null)
  const [walletData, setWalletData] = useState<{ wallet: { balance: number; transactions: Record<string, unknown>[] } } | null>(null)
  const [walletLoading, setWalletLoading] = useState(false)
  const [actionBusyId, setActionBusyId] = useState<number | null>(null)

  async function loadCampaigns() {
    try {
      const response = await api.fetchCampaigns()
      setCampaigns((response.data as Record<string, unknown>[]) ?? [])
    } catch {
      setCampaigns([])
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setError(null)
      try {
        const [d] = await Promise.all([
          api.fetchCampaignReporting(),
          loadCampaigns(),
        ])
        if (!cancelled) {
          setData(d)
        }
      } catch (e) {
        if (!cancelled) {
          setError(extractErrorMessage(e, 'تعذّر تحميل تقرير الحملات'))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  async function onCreateCampaign(e: FormEvent) {
    e.preventDefault()
    setCampaignErr(null)
    setCampaignMsg(null)

    try {
      await api.createCampaign({
        title: title.trim(),
        description: description.trim() || undefined,
        goal_amount: Number(goalAmount),
        ends_at: endsAt || undefined,
      })
      setCampaignMsg('تم إنشاء الحملة كمسودة بنجاح. يجب نشرها لتظهر للمتبرعين.')
      setTitle('')
      setDescription('')
      setGoalAmount('')
      setEndsAt('')
      await loadCampaigns()
    } catch (e) {
      setCampaignErr(extractErrorMessage(e, 'فشل إنشاء الحملة'))
    }
  }

  async function onPublishCampaign(campaignId: number) {
    setCampaignErr(null)
    setCampaignMsg(null)
    setActionBusyId(campaignId)
    try {
      await api.publishCampaign(campaignId)
      setCampaignMsg('تم نشر الحملة، أصبحت مرئية للمتبرعين الآن.')
      await loadCampaigns()
    } catch (e) {
      setCampaignErr(extractErrorMessage(e, 'فشل نشر الحملة'))
    } finally {
      setActionBusyId(null)
    }
  }

  async function onCloseCampaign(campaignId: number) {
    setCampaignErr(null)
    setCampaignMsg(null)
    setActionBusyId(campaignId)
    try {
      await api.closeCampaign(campaignId)
      setCampaignMsg('تم إغلاق الحملة.')
      await loadCampaigns()
    } catch (e) {
      setCampaignErr(extractErrorMessage(e, 'فشل إغلاق الحملة'))
    } finally {
      setActionBusyId(null)
    }
  }

  async function onViewWallet(campaignId: number) {
    setWalletCampaignId(campaignId)
    setWalletLoading(true)
    setWalletData(null)
    try {
      const response = await api.fetchCampaignWallet(campaignId)
      setWalletData(response as unknown as { wallet: { balance: number; transactions: Record<string, unknown>[] } })
    } catch (e) {
      setCampaignErr(extractErrorMessage(e, 'تعذّر تحميل محفظة الحملة'))
    } finally {
      setWalletLoading(false)
    }
  }

  const cashSeries: ChartDatum[] =
    data?.cash_by_campaign_tag?.map((r) => ({
      label: String(r.label),
      value: r.total_cash,
    })) ?? []

  const inkSeries: ChartDatum[] =
    data?.in_kind_by_campaign_tag?.map((r) => ({
      label: String(r.label),
      value: r.total_quantity_units,
    })) ?? []

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-11 w-11 animate-spin rounded-full border-2 border-violet-300 border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-400/35 bg-rose-950/35 px-4 py-4 text-sm text-rose-50">{error}</div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="space-y-10 text-sm text-white/80">
      {canManageCampaigns ? (
        <section className="rounded-2xl border border-white/12 bg-black/28 p-5">
          <h3 className="text-base font-semibold text-white">إدارة الحملات (أمين السر)</h3>
          {(campaignMsg || campaignErr) ? (
            <p className={`mt-3 rounded-lg px-3 py-2 text-xs ${campaignErr ? 'bg-rose-500/15 text-rose-100' : 'bg-emerald-500/15 text-emerald-100'}`}>
              {campaignErr ?? campaignMsg}
            </p>
          ) : null}
          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={onCreateCampaign}>
            <input
              className="sm:col-span-2 rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              placeholder="عنوان الحملة"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <input
              className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              placeholder="المبلغ المستهدف"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              required
            />
            <input
              type="date"
              className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
            <textarea
              className="sm:col-span-2 rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
              rows={2}
              placeholder="هدف الحملة ووصفها"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <button type="submit" className="sm:col-span-2 rounded-lg bg-violet-600 py-2 font-semibold text-white">
              إنشاء الحملة
            </button>
          </form>

          <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
            {campaigns.map((campaign) => {
              const status = String(campaign.status ?? 'draft')
              const id = Number(campaign.id)
              return (
                <div key={String(campaign.id)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-white">{String(campaign.title ?? `حملة #${String(campaign.id)}`)}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(status)}`}>
                      {statusLabelAr(status)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-white/50">
                    كود الحملة: <span className="font-mono text-white/80">{String(campaign.campaign_code ?? '—')}</span>{' '}
                    {campaign.ends_at ? `• إغلاق: ${String(campaign.ends_at)}` : ''}
                  </p>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-fuchsia-500"
                      style={{ width: `${Math.min(100, Math.max(0, Number(campaign.progress_percentage ?? 0)))}%` }}
                    />
                  </div>
                  <div className="mt-2 grid gap-2 text-[11px] text-white/75 sm:grid-cols-3">
                    <p>
                      تم جمع: <span className="font-mono text-white">{String(campaign.raised_amount ?? '0')}</span>
                    </p>
                    <p>
                      المتبقي: <span className="font-mono text-white">{String(Math.max(0, Number(campaign.goal_amount ?? 0) - Number(campaign.raised_amount ?? 0)))}</span>
                    </p>
                    <p>
                      رصيد المحفظة: <span className="font-mono text-white">{String(campaign.wallet_balance ?? '0')}</span>
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {status === 'draft' ? (
                      <button
                        type="button"
                        disabled={actionBusyId === id}
                        onClick={() => onPublishCampaign(id)}
                        className="rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                      >
                        نشر الحملة
                      </button>
                    ) : null}
                    {status === 'active' || status === 'completed' ? (
                      <button
                        type="button"
                        disabled={actionBusyId === id}
                        onClick={() => onCloseCampaign(id)}
                        className="rounded-lg bg-rose-600/85 px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                      >
                        إغلاق الحملة
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onViewWallet(id)}
                      className="rounded-lg border border-white/20 px-3 py-1 text-[11px] font-semibold text-white/85"
                    >
                      سجل المحفظة
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      {walletCampaignId !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setWalletCampaignId(null)}>
          <div
            className="max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/20 bg-slate-950 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">سجل حركات محفظة الحملة</h3>
              <button
                type="button"
                onClick={() => setWalletCampaignId(null)}
                className="rounded-lg border border-white/20 px-3 py-1 text-xs text-white"
              >
                إغلاق
              </button>
            </div>
            {walletLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-300 border-t-transparent" />
              </div>
            ) : walletData ? (
              <div className="space-y-3">
                <p className="text-sm text-white/85">
                  الرصيد الحالي: <span className="font-mono font-semibold text-emerald-200">{String(walletData.wallet.balance)}</span>
                </p>
                <div className="space-y-2">
                  {walletData.wallet.transactions.length === 0 ? (
                    <p className="text-xs text-white/50">لا توجد حركات على هذه المحفظة بعد.</p>
                  ) : (
                    walletData.wallet.transactions.map((t) => (
                      <div key={String(t.id)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              t.direction === 'credit' ? 'bg-emerald-500/15 text-emerald-100' : 'bg-rose-500/15 text-rose-100'
                            }`}
                          >
                            {t.direction === 'credit' ? 'إيداع' : 'صرف'}
                          </span>
                          <span className="font-mono text-white">{String(t.amount)}</span>
                        </div>
                        <p className="mt-1 text-white/60">{String(t.description ?? t.source ?? '')}</p>
                        <p className="mt-1 text-[10px] text-white/40">{String(t.recorded_at ?? '')}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <header className="space-y-2">
        <h2 className="text-xl font-bold text-white">لوحة تقارير الحملات وأثر التوعية</h2>
        <p className="max-w-prose leading-relaxed text-white/62">
          مبالغ نقدية وعينية مجمَّعة بتصنيف الغرض كما هو مسجَّل على التبرع، ومستفيدون مرتبطون بالأنشطة التوعوية ضمن المنصّة.
        </p>
        <p className="text-[11px] text-white/42">
          تم إنشاؤه: {new Date(data.generated_at).toLocaleString('ar-IQ')}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-400/28 bg-emerald-950/20 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-200/75">المبالغ النقدية (بحسب الغرض)</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-100">{formatCash(data.summary.cash_grand_total)}</p>
        </div>
        <div className="rounded-2xl border border-sky-400/28 bg-sky-950/20 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-sky-200/75">وحدات عينية (إجمالي الكميات)</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-sky-50">{formatInt(data.summary.in_kind_total_quantity_units)}</p>
        </div>
        <div className="rounded-2xl border border-violet-400/28 bg-violet-950/20 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-violet-200/75">أنشطة توعية مفعّلة</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-violet-50">{formatInt(data.summary.awareness_activities_count)}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-white/12 bg-black/28 p-5">
        <h3 className="text-base font-semibold text-white">منطق المحاسبة وسجلات الأثر</h3>
        <ul className="mt-4 list-disc space-y-3 pe-6 ps-4 text-[13px] leading-relaxed marker:text-teal-300/90">
          {data.summary.methodology_notes_ar.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {cashSeries.length > 0 ? (
          <BarChartCard
            title="التبرعات النقدية بحسب عنوان الغرض"
            variant="distribution"
            barClass="bg-gradient-to-l from-emerald-400/92 to-teal-500/75"
            items={cashSeries}
          />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-white/56">لا توجد تبرعات نقدية لتصنيفها حالياً.</div>
        )}
        {inkSeries.length > 0 ? (
          <BarChartCard
            title="الهبات العينية — وحدات مكسوبة بحسب عنوان الغرض"
            variant="distribution"
            barClass="bg-gradient-to-l from-sky-400/90 to-blue-600/72"
            items={inkSeries}
          />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-white/56">لا توجد عينات عينية مرتبطة بتبرعات مصنَّفة.</div>
        )}
      </div>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-white">أنشطة التوعية والمستفيدون المرتبطون</h3>
        <p className="text-xs text-white/52">
          العدد يعكس الربط اليدوي في النظام لكل نشاط مُصرَّح كــ«توعية» — لا يعتمد على تسجيل المتطوّعين وحدهم.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
          <table className="min-w-[640px] w-full border-collapse text-start text-[13px]">
            <thead>
              <tr className="border-b border-white/10 bg-black/35 text-[11px] uppercase tracking-wide text-white/42">
                <th className="px-4 py-2.5 font-semibold text-white/75">المعرّف</th>
                <th className="px-4 py-2.5 font-semibold text-white/75">العنوان</th>
                <th className="px-4 py-2.5 font-semibold text-white/75">المستفيدون المرتبطون</th>
                <th className="px-4 py-2.5 font-semibold text-white/75">المتطوعون</th>
                <th className="px-4 py-2.5 font-semibold text-white/75">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {data.awareness_activities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-white/52">
                    لا توجد فرص تُصنَّف «توعية» بعد؛ أنشِئ واحدة من صفحة التطوّع واحتفِظ بحقل النوع «توعية» ثم استخدم ربط المستفيدين.
                  </td>
                </tr>
              ) : (
                data.awareness_activities.map((row, idx) => (
                  <tr key={row.id} className={`border-b border-white/[0.06] ${idx % 2 === 0 ? 'bg-black/[0.12]' : ''}`}>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono tabular-nums text-white">{row.id}</td>
                    <td className="px-4 py-2.5 text-white/92">{String(row.title)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium tabular-nums text-teal-200/95">
                      {formatInt(Number(row.linked_beneficiaries_count))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-white/70">
                      {formatInt(Number(row.volunteer_slots_filled))} / {formatInt(Number(row.volunteer_slots_required))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">{String(row.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
