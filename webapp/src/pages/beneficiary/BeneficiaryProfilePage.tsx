import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'

export function BeneficiaryProfilePage() {
  const navigate = useNavigate()
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const [fullFamilyName, setFullFamilyName] = useState('')
  const [headName, setHeadName] = useState('')
  const [phone, setPhone] = useState('')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [housingStatus, setHousingStatus] = useState('rented')
  const [totalIncome, setTotalIncome] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    try {
      await api.completeBeneficiaryProfile({
        family: {
          full_family_name: fullFamilyName,
          head_name: headName,
          phone,
          province,
          city,
          neighborhood,
          housing_status: housingStatus,
          total_monthly_income: Number(totalIncome),
        },
        members: [
          {
            name: headName,
            family_relationship: 'head',
            phone,
          },
        ],
      })
      setMsg('تم إرسال الملف للمراجعة.')
      setTimeout(() => navigate('/app/beneficiary'), 1200)
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'فشل حفظ الملف'))
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 text-sm text-white/85">
      {(msg || err) && (
        <div
          className={`fixed inset-x-4 top-4 z-50 mx-auto max-w-lg rounded-xl px-4 py-3 shadow-lg ${err ? 'bg-red-600/90 text-red-50' : 'bg-emerald-600/90 text-emerald-50'}`}
        >
          {err ?? msg}
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-bold text-white">إكمال الملف الشخصي للعائلة</h2>
        <p className="mt-1 text-xs text-white/55">بعد الإرسال ستصبح حالة الطلب «قيد المراجعة».</p>

        <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
          <input className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white" placeholder="اسم العائلة الكامل" value={fullFamilyName} onChange={(e) => setFullFamilyName(e.target.value)} required />
          <input className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white" placeholder="اسم رب الأسرة" value={headName} onChange={(e) => setHeadName(e.target.value)} required />
          <input className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white" placeholder="الهاتف" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <div className="grid gap-3 sm:grid-cols-3">
            <input className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white" placeholder="المحافظة" value={province} onChange={(e) => setProvince(e.target.value)} required />
            <input className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white" placeholder="المدينة" value={city} onChange={(e) => setCity(e.target.value)} required />
            <input className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white" placeholder="الحي" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} required />
          </div>
          <select className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white" value={housingStatus} onChange={(e) => setHousingStatus(e.target.value)}>
            <option value="owned">ملك</option>
            <option value="rented">إيجار</option>
            <option value="hosted">ضيافة</option>
            <option value="unstable">غير مستقر</option>
          </select>
          <input className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white" placeholder="إجمالي الدخل الشهري" value={totalIncome} onChange={(e) => setTotalIncome(e.target.value)} required />
          <button type="submit" className="rounded-lg bg-sky-700 py-2.5 font-semibold text-white transition active:scale-[0.98] hover:bg-sky-600">
            إرسال للمراجعة
          </button>
        </form>
      </section>
    </div>
  )
}
