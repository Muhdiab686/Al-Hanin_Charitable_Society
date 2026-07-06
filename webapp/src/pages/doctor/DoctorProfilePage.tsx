import { type FormEvent, useEffect, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import { MEDICAL_SPECIALTIES, WEEKDAY_OPTIONS } from '../../constants/medicalSpecialties'

export function DoctorProfilePage() {
  const [specialty, setSpecialty] = useState<string>(MEDICAL_SPECIALTIES[0].value)
  const [bio, setBio] = useState('')
  const [consultationFee, setConsultationFee] = useState('0')
  const [availableDays, setAvailableDays] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setErr(null)
      try {
        const profile = await api.fetchDoctorClinicProfile()
        if (!profile) {
          return
        }
        const profileSpecialty = String(profile.specialty ?? '')
        if (MEDICAL_SPECIALTIES.some((opt) => opt.value === profileSpecialty)) {
          setSpecialty(profileSpecialty)
        }
        setBio(String(profile.bio ?? ''))
        setConsultationFee(String(profile.consultation_fee ?? '0'))
        const days = Array.isArray(profile.available_days) ? (profile.available_days as string[]) : []
        setAvailableDays(days)
      } catch (e) {
        setErr(extractErrorMessage(e, 'تعذّر تحميل ملف الطبيب'))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    try {
      await api.updateDoctorClinicProfile({
        specialty,
        bio: bio.trim() || null,
        consultation_fee: Number(consultationFee),
        available_days: availableDays,
      })
      setMsg('تم حفظ الملف الطبي بنجاح.')
    } catch (e) {
      setErr(extractErrorMessage(e, 'فشل حفظ الملف الطبي'))
    }
  }

  return (
    <div className="space-y-6 text-sm text-white/82">
      {(msg || err) && (
        <div className={`rounded-xl px-4 py-3 ${err ? 'bg-red-500/15 text-red-100' : 'bg-emerald-500/15 text-emerald-50'}`}>
          {err ?? msg}
        </div>
      )}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white">ملفي الطبي</h2>
        <p className="mt-1 text-xs text-white/55">اختر الاختصاص من القائمة وحدّد أيام الدوام لتظهر للمستفيدين عند الحجز.</p>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-[11px] text-white/50">القسم / الاختصاص</label>
            <select
              className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              required
              disabled={loading}
            >
              {MEDICAL_SPECIALTIES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-white/50">أجرة المعاينة</label>
            <input
              className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
              placeholder="أجرة المعاينة"
              value={consultationFee}
              onChange={(e) => setConsultationFee(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <textarea
            className="sm:col-span-2 rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white"
            rows={3}
            placeholder="نبذة/سيرة ذاتية قصيرة"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            disabled={loading}
          />
          <label className="sm:col-span-2 flex flex-col gap-2">
            <span className="text-[11px] text-white/55">أيام الدوام المتاحة</span>
            <div className="flex flex-wrap gap-2 rounded-lg border border-white/15 bg-slate-900 px-3 py-2">
              {WEEKDAY_OPTIONS.map((day) => (
                <label key={day.value} className="flex items-center gap-1 text-[11px] text-white/85">
                  <input
                    type="checkbox"
                    checked={availableDays.includes(day.value)}
                    disabled={loading}
                    onChange={(e) => {
                      setAvailableDays((current) => {
                        if (e.target.checked) {
                          return [...current, day.value]
                        }
                        return current.filter((item) => item !== day.value)
                      })
                    }}
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </label>
          <button type="submit" className="sm:col-span-2 rounded-lg bg-cyan-600 py-2.5 font-medium text-white" disabled={loading}>
            حفظ الملف
          </button>
        </form>
      </section>
    </div>
  )
}
