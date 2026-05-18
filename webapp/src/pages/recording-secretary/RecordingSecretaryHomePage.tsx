import { RoleOverviewPanel } from '../../components/dashboard/RoleOverviewPanel'
import { ShortcutGrid } from '../../components/dashboard/ShortcutGrid'

const cards = [
  {
    to: '/app/recording-secretary/beneficiaries',
    title: 'المستفيدون والعائلات',
    desc: 'تسجيل العائلات، أفراد الأسرة، واعتماد التسجيل أمام اللجنة.',
  },
  {
    to: '/app/recording-secretary/aid-requests',
    title: 'طلبات المساعدة',
    desc: 'مراجعة الطلبات، النشر للمتبرعين، ومتابعة التوزيع.',
  },
  {
    to: '/app/recording-secretary/volunteers',
    title: 'المتطوعون والأنشطة',
    desc: 'تنسيق فرص التطوع والأنشطة المرتبطة بالمستفيدين.',
  },
  {
    to: '/app/recording-secretary/qr',
    title: 'رمز QR للعائلة',
    desc: 'إصدار والتحقق من رموز العائلات المعتمدة.',
  },
]

export function RecordingSecretaryHomePage() {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-indigo-300/25 bg-gradient-to-br from-indigo-500/18 via-violet-500/12 to-slate-900/30 p-6 shadow-[0_25px_60px_-30px_rgba(99,102,241,0.55)] backdrop-blur">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-100/80">Recording Secretary</p>
        <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">لوحة أمين السر</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/72">
          دور أمين السر يركّز على شؤون المستفيدين، اعتماد العائلات، طلبات المساعدة، والتنسيق الإداري — دون إدارة
          العيادة أو السجل الطبي (وهي مسؤولية السكرتير).
        </p>
      </section>
      <RoleOverviewPanel />
      <ShortcutGrid heading="مسارات عمل أمين السر" accentClass="text-indigo-100" items={cards} />
    </div>
  )
}
