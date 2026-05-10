import { RoleOverviewPanel } from '../../components/dashboard/RoleOverviewPanel'
import { ShortcutGrid } from '../../components/dashboard/ShortcutGrid'

const cards = [
  {
    to: '/app/volunteer/opportunities',
    title: 'فرص التطوع',
    desc: 'اعثر على النشاط المناسب، مع إغلاق التسجيل تلقائياً حين تكتمل المقاعد.',
  },
  { to: '/app/volunteer/aid', title: 'المساهمة الميدانية', desc: 'متابعة التوزيع وطلبات الدعم المرتبطة بمهام الميدان.' },
]

export function VolunteerHomePage() {
  return (
    <div className="space-y-10">
      <RoleOverviewPanel />
      <ShortcutGrid heading="اختصارات المتطوع" accentClass="text-emerald-100" items={cards} />
    </div>
  )
}
