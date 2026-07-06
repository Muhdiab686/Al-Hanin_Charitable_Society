import { useEffect, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import type { Paginated } from '../../types/models'

const CATEGORY_LABELS: Record<string, string> = {
  doctor_payout: 'صرف راتب/مستحقات',
}

export function DoctorWalletPage() {
  const [balance, setBalance] = useState('0.00')
  const [entries, setEntries] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setErr(null)
    try {
      const data = await api.fetchDoctorWallet()
      const wallet = data.wallet as Record<string, unknown> | undefined
      setBalance(String(wallet?.balance ?? '0.00'))
      const paginated = wallet?.entries as Paginated<Record<string, unknown>> | undefined
      setEntries((paginated?.data as Record<string, unknown>[]) ?? [])
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
    <div className="space-y-6 text-sm text-white/82">
      {err ? (
        <div className="rounded-xl border border-red-400/35 bg-red-500/12 px-4 py-3 text-red-50">{err}</div>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-white">محفظتي المهنية</h2>
            <p className="mt-1 text-xs text-white/55">
              تُضاف المبالغ عند اعتماد المحاسب لطلب الصرف، ويُخصم المبلغ من صندوق الجمعية.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-lg border border-white/15 px-3 py-1 text-xs disabled:opacity-50"
          >
            تحديث
          </button>
        </div>
        <p className="mt-4 text-2xl font-bold text-cyan-200">{balance} $</p>
        <p className="text-[11px] text-white/45">إجمالي المستحقات المصروفة</p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-base font-semibold text-white">سجل الصرف</h3>
        <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[620px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-black/30 text-[11px] uppercase text-white/45">
                <th className="px-3 py-2.5 text-start font-semibold">التاريخ</th>
                <th className="px-3 py-2.5 text-start font-semibold">النوع</th>
                <th className="px-3 py-2.5 text-start font-semibold">المبلغ</th>
                <th className="px-3 py-2.5 text-start font-semibold">الوصف</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-white/45">
                    جاري التحميل...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-white/45">
                    لا توجد حركات بعد — أنشئ طلب صرف من صفحة «طلبات المستحقات».
                  </td>
                </tr>
              ) : (
                entries.map((row) => (
                  <tr key={String(row.id)} className="border-b border-white/[0.06]">
                    <td className="px-3 py-2.5 whitespace-nowrap">{String(row.recorded_at ?? '—')}</td>
                    <td className="px-3 py-2.5">{CATEGORY_LABELS[String(row.category ?? '')] ?? String(row.category ?? '—')}</td>
                    <td className="px-3 py-2.5">{String(row.amount ?? '—')} $</td>
                    <td className="px-3 py-2.5 text-white/70">{String(row.description ?? '—')}</td>
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
