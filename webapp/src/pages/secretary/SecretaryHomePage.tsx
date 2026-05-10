import { RoleOverviewPanel } from '../../components/dashboard/RoleOverviewPanel'
import { ShortcutGrid } from '../../components/dashboard/ShortcutGrid'

const cards = [
  {
    to: '/app/secretary/beneficiaries',
    title: 'إدارة المستفيدين والعائلات',
    desc: 'تسجيل مستفيد جديد وإدخال بياناته، ثم تحديث بيانات الأسرة المستفيدة.',
  },
  {
    to: '/app/secretary/clinic',
    title: 'العيادة والمواعيد',
    desc: 'حجز وإلغاء المواعيد، ومتابعة حالة الأطباء وتعديل بياناتهم.',
  },
  {
    to: '/app/secretary/medical',
    title: 'السجل الطبي والمختبر',
    desc: 'عرض السجل الطبي، تسجيل نتيجة الموعد والوصفة، ورفع التحاليل وربطها بالمريض.',
  },
]

export function SecretaryHomePage() {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-violet-300/25 bg-gradient-to-br from-violet-500/18 via-indigo-500/12 to-slate-900/30 p-6 shadow-[0_25px_60px_-30px_rgba(124,58,237,0.7)] backdrop-blur">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-100/80">Secretary Dashboard</p>
        <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">لوحة السكرتيرة - نطاق مهام محدد</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/72">
          تم ضبط هذه المساحة لتخدم فقط حالات الاستخدام الخاصة بالسكرتيرة: إدارة بيانات المستفيدين، تنظيم المواعيد
          الطبية، والسجل الطبي والمختبر. تسجيل الدخول والخروج متاح عبر نظام المصادقة وزر الخروج.
        </p>
      </section>

      <RoleOverviewPanel />
      <ShortcutGrid heading="مسارات العمل المعتمدة للسكرتيرة" accentClass="text-violet-100" items={cards} />
    </div>
  )
}
