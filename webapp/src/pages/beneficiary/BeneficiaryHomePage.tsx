import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import { ShortcutGrid } from '../../components/dashboard/ShortcutGrid'

const cards = [
  {
    to: '/app/beneficiary/aid',
    title: 'طلب الدعم',
    desc: 'تقديم طلب مساعدة ومتابعة حالته خطوة بخطوة.',
  },
  {
    to: '/app/beneficiary/appointments',
    title: 'المواعيد الصحية',
    desc: 'معرفة مواعيد المراجعة ونتائج الزيارات المكتملة.',
  },
  {
    to: '/app/beneficiary/medical',
    title: 'الملف الطبي',
    desc: 'قراءة التقارير والتشخيصات المتاحة لك وفق سياسات الخصوصية.',
  },
]

export function BeneficiaryHomePage() {
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const status = await api.fetchBeneficiaryProfileStatus()
        if (status.needs_completion) {
          window.location.href = '/app/beneficiary/profile'
          return
        }
        const data = await api.fetchBeneficiaryDashboard()
        setDashboard(data)
      } catch (e) {
        setErr(extractErrorMessage(e, 'تعذّر تحميل لوحة المستفيد'))
      }
    })()
  }, [])

  const status = dashboard?.status as Record<string, unknown> | undefined
  const appointments = (dashboard?.upcoming_appointments as Record<string, unknown>[]) ?? []
  const materials = (dashboard?.requested_materials as Record<string, unknown>[]) ?? []

  return (
    <div className="space-y-10">
      {err ? (
        <div className="fixed inset-x-4 top-4 z-50 mx-auto max-w-lg rounded-xl border border-red-400/35 bg-red-600/90 px-4 py-3 text-red-50 shadow-lg">
          {err}
        </div>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-bold text-white">لوحة المستفيد</h2>
        <p className="mt-1 text-sm text-white/60">
          حالة الطلب: {String(status?.follow_up_status ?? '—')} — التسجيل: {String(status?.enrollment_status ?? '—')}
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <h3 className="font-semibold text-sky-100">المواعيد القادمة</h3>
            {appointments.length === 0 ? (
              <p className="mt-2 text-sm text-white/55">لا توجد مواعيد قادمة.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {appointments.map((a) => (
                  <li key={String(a.id)} className="rounded-lg bg-white/5 px-3 py-2">
                    {String(a.scheduled_at ?? '—')} — {String(a.requested_specialty ?? 'عيادة')}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <h3 className="font-semibold text-sky-100">المواد المطلوبة</h3>
            {materials.length === 0 ? (
              <p className="mt-2 text-sm text-white/55">لا توجد طلبات مواد حالياً.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {materials.map((m) => (
                  <li key={String(m.id)} className="rounded-lg bg-white/5 px-3 py-2">
                    {String(m.aid_type ?? 'مساعدة')} — {String(m.status ?? '—')}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <Link
          to="/app/beneficiary/profile"
          className="mt-4 inline-block rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition active:scale-[0.98] hover:bg-sky-600"
        >
          تحديث الملف الشخصي
        </Link>
      </section>

      <ShortcutGrid heading="مركز المستفيد" accentClass="text-sky-100" items={cards} />
    </div>
  )
}
