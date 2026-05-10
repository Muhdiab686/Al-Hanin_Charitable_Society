import { RoleOverviewPanel } from '../../components/dashboard/RoleOverviewPanel'
import { ShortcutGrid } from '../../components/dashboard/ShortcutGrid'

const cards = [
  { to: '/app/doctor/appointments', title: 'الفحص والمواعيد', desc: 'إجراء الفحص، تسجيل التشخيص، إصدار وصفة، وطلب تحليل عبر نوافذ Dialog.' },
  { to: '/app/doctor/medical', title: 'السجل الطبي الكامل', desc: 'عرض السجل الطبي الكامل للمريض واستعراض نتائج المختبر المرتبطة به.' },
]

export function DoctorHomePage() {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-cyan-300/25 bg-gradient-to-br from-cyan-500/18 via-blue-500/12 to-slate-900/30 p-6 shadow-[0_25px_60px_-30px_rgba(14,165,233,0.7)] backdrop-blur">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100/80">Doctor Dashboard</p>
        <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">لوحة الطبيب - مهام الرعاية الطبية</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/72">
          هذه المساحة مخصصة للفحص والتشخيص، استعراض السجلات الطبية، طلب التحاليل، والوصفات الإلكترونية. تسجيل الدخول والخروج
          متاح عبر نظام المصادقة وزر الخروج.
        </p>
      </section>
      <RoleOverviewPanel />
      <ShortcutGrid heading="المسارات المعتمدة للطبيب" accentClass="text-cyan-100" items={cards} />
    </div>
  )
}
