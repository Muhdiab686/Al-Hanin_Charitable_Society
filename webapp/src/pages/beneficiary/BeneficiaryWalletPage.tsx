import { useEffect, useState } from 'react'
<<<<<<< HEAD
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import type { Paginated } from '../../types/models'

const CATEGORY_LABELS: Record<string, string> = {
  doctor_payout: 'صرف راتب/مستحقات',
  prescription_credit: 'رصيد وصفة طبية',
  cash_aid: 'مساعدة نقدية',
  material_aid: 'مساعدة مادية',
  cash_donation: 'تبرع نقدي',
}

function formatEntry(row: Record<string, unknown>): string {
  const category = String(row.category ?? '')
  const amount = row.amount != null ? `${String(row.amount)} $` : null
  const units = row.units != null ? `${String(row.units)} ${String(row.unit_label ?? 'وحدة')}` : null

  if (amount) {
    return amount
  }

  if (units) {
    return units
  }

  return CATEGORY_LABELS[category] ?? category
}

export function BeneficiaryWalletPage() {
  const [balance, setBalance] = useState('0.00')
  const [entries, setEntries] = useState<Record<string, unknown>[]>([])
=======
import { Link } from 'react-router-dom'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import { formatDateAr, formatDateTimeAr } from '../../lib/dateTime'

type WalletEntry = {
  id: string
  type_label?: string
  item_label?: string
  value_label?: string
  description?: string
  occurred_at?: string
}

type ReceiptQr = {
  payload: string
  png_base64: string
  mime_type: string
}

export function BeneficiaryWalletPage() {
  const [cashBalance, setCashBalance] = useState('0.00')
  const [entries, setEntries] = useState<WalletEntry[]>([])
  const [receiptQr, setReceiptQr] = useState<ReceiptQr | null>(null)
  const [pendingDeliveries, setPendingDeliveries] = useState(0)
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setErr(null)
    try {
<<<<<<< HEAD
      const data = await api.fetchBeneficiaryWalletSelf()
      const wallet = (data.wallet ?? data.medical_wallet) as Record<string, unknown> | undefined
      setBalance(String(wallet?.balance ?? '0.00'))
      const paginated = wallet?.entries as Paginated<Record<string, unknown>> | undefined
      setEntries((paginated?.data as Record<string, unknown>[]) ?? [])
=======
      const data = await api.fetchBeneficiaryAidWallet()
      setCashBalance(String(data.cash_balance ?? '0.00'))
      setEntries((data.entries as WalletEntry[]) ?? [])
      setPendingDeliveries(Number(data.pending_deliveries_count ?? 0))
      setReceiptQr((data.receipt_qr as ReceiptQr | null) ?? null)
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر تحميل المحفظة'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
<<<<<<< HEAD
    <div className="space-y-6 text-sm text-white/82">
      {err ? (
        <div className="rounded-xl border border-red-400/35 bg-red-500/12 px-4 py-3 text-red-50">{err}</div>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-white">محفظتي</h2>
            <p className="mt-1 text-xs text-white/55">
              تظهر هنا المساعدات النقدية والمادية والوصفات الطبية المصروفة لك.
=======
    <div className="space-y-6 text-sm text-white/85">
      {err ? (
        <div className="rounded-xl border border-red-400/35 bg-red-500/15 px-4 py-3 text-red-50">{err}</div>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">محفظتي</h2>
            <p className="mt-1 text-xs text-white/55">
              تظهر هنا المساعدات النقدية والعينية (مثل السلة الغذائية) والوصفات المصروفة لك.
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
<<<<<<< HEAD
            disabled={loading}
            className="rounded-lg border border-white/15 px-3 py-1 text-xs disabled:opacity-50"
=======
            className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
          >
            تحديث
          </button>
        </div>
<<<<<<< HEAD
        <p className="mt-4 text-2xl font-bold text-emerald-200">{balance} $</p>
        <p className="text-[11px] text-white/45">الرصيد النقدي المتاح</p>
      </section>

=======
        <p className="mt-5 text-3xl font-bold tabular-nums text-emerald-300">$ {cashBalance}</p>
        <p className="mt-1 text-xs text-white/50">الرصيد النقدي المتاح (يشمل المحفظة الطبية)</p>
      </section>

      {receiptQr ? (
        <section className="rounded-2xl border border-sky-400/25 bg-sky-500/10 p-5">
          <h3 className="text-base font-semibold text-white">رمز تأكيد الاستلام</h3>
          <p className="mt-1 text-xs text-white/60">
            هذا رمز عائلتك من الجمعية. استخدمه من صفحة المساعدات بعد تنفيذ التوزيع.
            {pendingDeliveries > 0 ? ` (${pendingDeliveries} بانتظار التأكيد)` : ''}
          </p>
          <div className="mt-3 flex flex-wrap items-start gap-4">
            <img
              alt="QR الاستلام"
              className="h-36 w-36 rounded-xl border border-white/15 bg-white p-2"
              src={`data:${receiptQr.mime_type};base64,${receiptQr.png_base64}`}
            />
            <div className="min-w-0 flex-1">
              <p className="break-all font-mono text-[11px] text-sky-100">{receiptQr.payload}</p>
              <Link
                to="/app/beneficiary/aid"
                className="mt-3 inline-flex rounded-lg bg-sky-700 px-3 py-2 text-xs font-medium text-white"
              >
                الانتقال لتأكيد الاستلام
              </Link>
            </div>
          </div>
        </section>
      ) : null}

>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-base font-semibold text-white">سجل الحركات</h3>
        <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[640px] border-collapse text-xs">
            <thead>
<<<<<<< HEAD
              <tr className="border-b border-white/10 bg-black/30 text-[11px] uppercase text-white/45">
                <th className="px-3 py-2.5 text-start font-semibold">التاريخ</th>
                <th className="px-3 py-2.5 text-start font-semibold">النوع</th>
=======
              <tr className="border-b border-white/10 bg-black/30 text-[11px] text-white/45">
                <th className="px-3 py-2.5 text-start font-semibold">التاريخ</th>
                <th className="px-3 py-2.5 text-start font-semibold">النوع</th>
                <th className="px-3 py-2.5 text-start font-semibold">المادة / البند</th>
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
                <th className="px-3 py-2.5 text-start font-semibold">القيمة</th>
                <th className="px-3 py-2.5 text-start font-semibold">الوصف</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
<<<<<<< HEAD
                  <td colSpan={4} className="px-3 py-8 text-center text-white/45">
=======
                  <td colSpan={5} className="px-3 py-8 text-center text-white/45">
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
                    جاري التحميل...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
<<<<<<< HEAD
                  <td colSpan={4} className="px-3 py-8 text-center text-white/45">
                    لا توجد حركات بعد.
                  </td>
                </tr>
              ) : (
                entries.map((row) => (
                  <tr key={String(row.id)} className="border-b border-white/[0.06]">
                    <td className="px-3 py-2.5 whitespace-nowrap">{String(row.recorded_at ?? '—')}</td>
                    <td className="px-3 py-2.5">{CATEGORY_LABELS[String(row.category ?? '')] ?? String(row.category ?? '—')}</td>
                    <td className="px-3 py-2.5">{formatEntry(row)}</td>
                    <td className="px-3 py-2.5 text-white/70">{String(row.description ?? '—')}</td>
=======
                  <td colSpan={5} className="px-3 py-8 text-center text-white/45">
                    لا توجد حركات مساعدة بعد.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-white/[0.06]">
                    <td className="whitespace-nowrap px-3 py-2.5 text-white/75">
                      {String(entry.occurred_at ?? '').includes('T')
                        ? formatDateTimeAr(entry.occurred_at)
                        : formatDateAr(entry.occurred_at)}
                    </td>
                    <td className="px-3 py-2.5">{entry.type_label ?? '—'}</td>
                    <td className="px-3 py-2.5 font-medium text-emerald-100">{entry.item_label ?? '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-white/85">{entry.value_label ?? '—'}</td>
                    <td className="px-3 py-2.5 text-white/70">{entry.description ?? '—'}</td>
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
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
