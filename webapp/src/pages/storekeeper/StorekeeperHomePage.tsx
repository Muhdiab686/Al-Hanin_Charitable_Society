import { RoleOverviewPanel } from '../../components/dashboard/RoleOverviewPanel'
import { ShortcutGrid } from '../../components/dashboard/ShortcutGrid'

const cards = [
  {
    to: '/app/storekeeper/aid',
    title: 'الدعم المعيشي والعينية',
    desc: 'مراجعة طلبات الدعم المعيشي العاجل والمواد العينية، والنشر للمتبرعين، والتوزيع من المخزون.',
  },
  {
    to: '/app/storekeeper/inventory',
    title: 'تشغيل المستودع',
    desc: 'إدخال مواد جديدة، الإخراج بإيصال، تنبيهات النقص والصلاحية.',
  },
]

export function StorekeeperHomePage() {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-orange-300/25 bg-gradient-to-br from-orange-500/18 via-amber-500/12 to-slate-900/30 p-6 shadow-[0_25px_60px_-30px_rgba(249,115,22,0.7)] backdrop-blur">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-100/80">Storekeeper Dashboard</p>
        <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">لوحة أمين المستودع</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/72">
          إدارة المخزون اليومي، ومراجعة طلبات الدعم المعيشي والعينية. الطلبات الطبية تُراجع من السكرتيرة.
        </p>
      </section>
      <RoleOverviewPanel />
      <ShortcutGrid heading="المسارات المعتمدة لأمين المستودع" accentClass="text-orange-100" items={cards} />
    </div>
  )
}
