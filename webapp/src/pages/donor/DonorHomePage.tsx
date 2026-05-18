import { RoleOverviewPanel } from '../../components/dashboard/RoleOverviewPanel'
import { ShortcutGrid } from '../../components/dashboard/ShortcutGrid'

const cards = [
  {
    to: '/app/donor/chat',
    title: 'الشات مع الإدارة',
    desc: 'استفسار مباشر عن التبرعات، الإيصالات، وحالة الحملات.',
  },
  {
    to: '/app/donor/donations',
    title: 'التبرع والحملات',
    desc: 'تبرع إلكتروني، دوري، مخصص، التبرع المباشر للحملات، والإيصالات الرسمية.',
  },
  {
    to: '/app/donor/urgent-aid',
    title: 'مساعدة طارئة',
    desc: 'حالات معتمدة ومنشورة من الجمعية — تبرع موجّه دون بيانات حساسة.',
  },
]

export function DonorHomePage() {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-rose-300/25 bg-gradient-to-br from-rose-500/18 via-fuchsia-500/12 to-slate-900/30 p-6 shadow-[0_25px_60px_-30px_rgba(244,63,94,0.7)] backdrop-blur">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-100/80">Donor Dashboard</p>
        <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">لوحة المتبرع - إدارة أثر العطاء</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/72">
          من هنا يمكنك التبرع الإلكتروني، جدولة تبرعات دورية، تخصيص التبرع لمشروع محدد، متابعة الحملات النشطة، والحصول على
          إيصال رسمي لكل عملية مع سجل أثر تبرعاتك.
        </p>
      </section>
      <RoleOverviewPanel />
      <ShortcutGrid heading="خطوتك القادمة" accentClass="text-rose-100" items={cards} />
    </div>
  )
}
