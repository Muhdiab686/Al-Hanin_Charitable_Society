import { RoleOverviewPanel } from '../../components/dashboard/RoleOverviewPanel'
import { ShortcutGrid } from '../../components/dashboard/ShortcutGrid'

const cards = [
  {
    to: '/app/storekeeper/inventory',
    title: 'تشغيل المستودع',
    desc: 'إدخال مواد جديدة بالباركود والانتهاء، إخراج بإيصال، تنبيهات النقص والصلاحية، وصرف الدواء بالوصفة.',
  },
]

export function StorekeeperHomePage() {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-orange-300/25 bg-gradient-to-br from-orange-500/18 via-amber-500/12 to-slate-900/30 p-6 shadow-[0_25px_60px_-30px_rgba(249,115,22,0.7)] backdrop-blur">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-100/80">Storekeeper Dashboard</p>
        <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">لوحة أمين المستودع - إدارة المواد</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/72">
          هذه المساحة تغطي إدارة المخزون اليومية: إدخال المواد، الإخراج بإيصال، تنبيهات النقص، متابعة الصلاحية وإزالة
          المنتهي، وصرف الدواء بوصفة إلكترونية. تسجيل الدخول والخروج متاح عبر نظام المصادقة وزر الخروج.
        </p>
      </section>
      <RoleOverviewPanel />
      <ShortcutGrid heading="المسارات المعتمدة لأمين المستودع" accentClass="text-orange-100" items={cards} />
    </div>
  )
}
