import { useEffect, useState } from 'react'
import { DonutChartCard } from '../../components/dashboard/DonutChartCard'
import { LineAreaChartCard } from '../../components/dashboard/LineAreaChartCard'
import { roleLabelAr } from '../../auth/roleRoutes'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import { badgeClassForAidStatus, labelAidStatusAr, labelAidTypeAr } from '../../lib/operationalLabels'
import type { AdminDashboardPayload } from '../../types/models'
import type { UserRole } from '../../types/models'

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner backdrop-blur">
      <p className="text-xs font-medium uppercase tracking-wide text-white/55">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-white/50">{hint}</p> : null}
    </div>
  )
}

function enrollmentLabel(code: string): string {
  const map: Record<string, string> = {
    draft: 'مسودة',
    pending_board: 'بانتظار قرار اللجنة',
    approved: 'عائلات مفعّلة',
    rejected: 'مرفوضة',
  }
  return map[code] ?? code
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

function donationChannelLabel(raw: unknown): string {
  const k = String(raw ?? '').trim()

  if (k === 'web') {
    return 'من المنصّة'
  }

  return 'تسجيل يدوي'
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat('ar-IQ', {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function formatInt(n: number): string {
  return new Intl.NumberFormat('ar-IQ').format(n)
}

function formatCompactDate(iso: unknown): string {
  if (!iso || typeof iso !== 'string') {
    return '—'
  }

  try {
    return new Intl.DateTimeFormat('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return '—'
  }
}

const MONTH_NAMES_AR = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
]

export function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const d = await api.fetchAdminDashboard()
        if (!cancelled) {
          setData(d)
        }
      } catch (e) {
        if (!cancelled) {
          setError(extractErrorMessage(e, 'تعذّر تحميل لوحة الإدارة'))
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

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-indigo-300 border-t-transparent" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-6 py-8 text-center text-red-100">
        {error ?? 'لا توجد بيانات'}
      </div>
    )
  }

  const w = data.widgets

  const warehouseItems =
    data.analytics.warehouse_consumption_by_month?.map((m) => ({
      label: MONTH_NAMES_AR[(m.month as number) - 1] ?? `شهر ${m.month}`,
      value: typeof m.total_consumption === 'number' ? m.total_consumption : Number(m.total_consumption) || 0,
    })) ?? []

  const donationsChannelItems = Object.entries(data.analytics.donations_by_channel).map(([k, v]) => ({
    label: k === 'web' ? 'المسجّلة عبر المنصّة الإلكترونية' : 'التي يسجّلها الفريق يدوياً',
    value: typeof v === 'number' ? v : Number(v) || 0,
  }))

  const aidBuckets = Object.entries(data.analytics.aid_distribution_by_type).map(([code, total]) => {
    const lbl =
      code === 'health'
        ? 'قطاع صحّي'
        : code === 'financial'
          ? 'دعم معيشي عاجل'
          : code === 'food'
            ? 'مواد أو عينية خاصة (تعبئة السلّة)'
            : code
    return { label: lbl, value: typeof total === 'number' ? total : Number(total) || 0 }
  })

  return (
    <div className="space-y-12">
      <section>
        <h2 className="mb-2 text-lg font-semibold text-white">مؤشرات الأثر</h2>
        <p className="mb-4 text-xs text-white/55">تلخّص البيانات المختارة في الجمعية مباشرة من السجلات.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="عائلات مكفولة" value={w.sponsored_families} hint="بحالة الاعتماد النشط" />
          <Stat label="تبرعات نقدية للشهر" value={w.cash_donations_this_month} hint="بحسب عملة الدفتر" />
          <Stat label="متطوعون خلال شهر" value={w.active_volunteers} hint="شاركوا ضمن آخر ثلاثين يوماً" />
          <Stat label="تقدير مركز المال" value={w.treasury_balance} hint="وارد − صادر وفق المعاملات" />
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold text-white">مخططات تحليلية</h2>
        <p className="mb-6 max-w-prose text-[13px] leading-relaxed text-white/54">
          الأعداد والكميات المعروضة مأخوذة كما هي من القاعدة. مخطّط المنحنى يضبط مقياس الرأس عمودياً وفق{' '}
          <strong className="font-semibold text-white/75">أعلى قيمة في السنة</strong> لإظهار فروق الشهور؛ الدائرتان القطاعيتان تعرضان{' '}
          <strong className="font-semibold text-white/75">نسباً من مجموع كل مخطّط على حدة</strong> (ليست قراءة واحدة مختلطة).
        </p>
        <div className="grid gap-6 lg:grid-cols-3">
          <LineAreaChartCard
            title={`استهلاك المستودع — ${data.analytics.year}`}
            description={`كل نقطة شهرية = مجموع وحدات «التوزيع على طلب المساعدة» مع وحدات «الاستبعاد من المخزون» لتلك الفترة. السنة المعروضة: ${data.analytics.year}.`}
            interactionHint={`الشهر المعروض: وحدات فعلية من السجل. مقياس الارتفاع في الرسم مرجَّع إلى أعلى شهر في هذه السنة (القيمة القصوى في السلسلة).`}
            items={warehouseItems}
          />
          <DonutChartCard
            title="مجالات المساعدة المعتمدة"
            description="إجمالي عدد الطلبات بحالة «معتمد»، مجمَّع إلى ثلاثة مجالات وفق نوع الطلب الطبي والمعيشي والعينية."
            interactionHint="يُعبِّر كل قطاع عن عدد الطلبات المعتمدة في ذلك المجال؛ النسبة من مجموع العدّ في هذا المخطّط وحده."
            items={aidBuckets}
          />
          <DonutChartCard
            title="اتجاه قنوات تسجيل التبرعات"
            description="كل قطاع بعدد سجلات التبرع بحسب القناة: عبر المنصّة أو تسجيل يدوي داخلي؛ النسب من مجموع تلك السجلات."
            interactionHint="الإحصاء بعدد السجلات لا بمبالغ النقد؛ النسب من مجموع سجلات التبرع المعروضة هنا فقط."
            items={donationsChannelItems}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h3 className="text-base font-semibold text-white">العائلات</h3>
          <p className="mt-1 text-3xl font-bold text-indigo-200">{data.families.total}</p>
          <ul className="mt-4 space-y-2 text-sm text-white/75">
            {Object.entries(data.families.by_enrollment_status).map(([k, v]) => (
              <li key={k} className="flex justify-between gap-4 border-b border-white/5 py-2">
                <span>{enrollmentLabel(k)}</span>
                <span className="font-mono text-white">{v}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h3 className="text-base font-semibold text-white">المساعدات</h3>
          <p className="mt-1 text-3xl font-bold text-violet-200">{data.aid_requests.total}</p>
          <ul className="mt-4 space-y-2 text-sm text-white/75">
            {Object.entries(data.aid_requests.by_status).map(([k, v]) => (
              <li key={k} className="flex justify-between gap-4 border-b border-white/5 py-2">
                <span>{labelAidStatusAr(k)}</span>
                <span className="font-mono text-white">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <h3 className="text-base font-semibold text-white">توزيع المستخدمين بحسب الوظيفة</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(data.users.by_role).map(([role, count]) => (
            <span
              key={role}
              className="rounded-full bg-indigo-500/25 px-4 py-1.5 text-sm font-medium text-indigo-100 ring-1 ring-indigo-400/30"
            >
              {roleLabelAr(role as UserRole)}: {count}
            </span>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h3 className="text-base font-semibold text-white">أحدث التبرعات</h3>
          <p className="mt-1 text-[11px] text-white/50">العملة المعروضة من حقل التبرع النقدي؛ العينية يُذكر مجموع وحدات السلع المرتبطة بالإيصال.</p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.06]">
            <table className="w-full min-w-[560px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-white/10 bg-black/30 text-[11px] uppercase tracking-wide text-white/45">
                  <th className="px-3 py-2 font-semibold text-start text-white/72">إيصال</th>
                  <th className="px-3 py-2 font-semibold text-start text-white/72">نوع الهبة</th>
                  <th className="px-3 py-2 font-semibold text-start text-white/72">مبلغ / وحدات</th>
                  <th className="px-3 py-2 font-semibold text-start text-white/72">القناة</th>
                  <th className="px-3 py-2 font-semibold text-start text-white/72">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {(data.analytics.recent_donations as Record<string, unknown>[]).map((r, idx) => {
                  const type = String(r.type ?? '')
                  const cashAmt = Number(r.cash_amount)
                  const inKindUnits = Number((r as { in_kind_units?: number }).in_kind_units ?? 0)
                  const valueCell =
                    type === 'cash' && Number.isFinite(cashAmt)
                      ? formatMoney(cashAmt)
                      : type === 'in_kind'
                        ? inKindUnits > 0
                          ? `${formatInt(inKindUnits)} وحدة مسجَّلة بالهبة`
                          : 'عينية — بدون أسطر مخزون'
                        : '—'

                  return (
                    <tr key={String(r.id)} className={`border-b border-white/[0.06] ${idx % 2 === 0 ? 'bg-black/[0.12]' : ''}`}>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[12px] text-white">{String(r.receipt_code)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">{donationTypeLabel(r.type)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-emerald-200/92">{valueCell}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-white/78">{donationChannelLabel(r.channel)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-white/62">{formatCompactDate(r.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h3 className="text-base font-semibold text-white">أحدث الطلبات</h3>
          <p className="mt-1 text-[11px] text-white/50">حالة العرض وفق المراجعة المسجَّلة؛ نوع الطلب يُجمَع ضمن مخطّط مجالات أعلى.</p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.06]">
            <table className="w-full min-w-[520px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-white/10 bg-black/30 text-[11px] uppercase tracking-wide text-white/45">
                  <th className="px-3 py-2 font-semibold text-start text-white/72">رقم</th>
                  <th className="px-3 py-2 font-semibold text-start text-white/72">المستفيد</th>
                  <th className="px-3 py-2 font-semibold text-start text-white/72">نوع الطلب</th>
                  <th className="px-3 py-2 font-semibold text-start text-white/72">الحالة</th>
                  <th className="px-3 py-2 font-semibold text-start text-white/72">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {(data.analytics.recent_aid_requests as Record<string, unknown>[]).map((r, idx) => {
                  const st = String(r.status ?? '')
                  const benName = String(((r.beneficiary as Record<string, unknown>)?.name as string) ?? '—')

                  return (
                    <tr key={String(r.id)} className={`border-b border-white/[0.06] ${idx % 2 === 0 ? 'bg-black/[0.12]' : ''}`}>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono tabular-nums text-white">{String(r.id)}</td>
                      <td className="max-w-[10rem] truncate px-3 py-2.5 text-white/88">{benName}</td>
                      <td className="px-3 py-2.5 text-white/82">{labelAidTypeAr(r.type)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${badgeClassForAidStatus(st)}`}
                        >
                          {labelAidStatusAr(st)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-white/62">{formatCompactDate(r.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
