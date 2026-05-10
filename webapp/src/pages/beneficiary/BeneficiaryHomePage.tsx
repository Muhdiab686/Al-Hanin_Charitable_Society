import { RoleOverviewPanel } from '../../components/dashboard/RoleOverviewPanel'
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
  return (
    <div className="space-y-10">
      <RoleOverviewPanel />
      <ShortcutGrid heading="مركز المستفيد" accentClass="text-sky-100" items={cards} />
    </div>
  )
}
