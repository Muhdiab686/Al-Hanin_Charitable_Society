import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { roleLabelAr } from '../auth/roleRoutes'
import type { UserRole } from '../types/models'

const navClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-xl px-3 py-2 text-sm font-medium transition',
    isActive ? 'bg-white/15 text-white shadow-inner' : 'text-white/80 hover:bg-white/10',
  ].join(' ')

const secretarySidebarLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center rounded-xl border px-3 py-2.5 text-sm transition',
    isActive
      ? 'border-violet-300/35 bg-white/[0.14] font-semibold text-white shadow-inner'
      : 'border-transparent text-white/78 hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white',
  ].join(' ')

const doctorSidebarLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center rounded-xl border px-3 py-2.5 text-sm transition',
    isActive
      ? 'border-cyan-300/35 bg-white/[0.14] font-semibold text-white shadow-inner'
      : 'border-transparent text-white/78 hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white',
  ].join(' ')

const storekeeperSidebarLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center rounded-xl border px-3 py-2.5 text-sm transition',
    isActive
      ? 'border-orange-300/35 bg-white/[0.14] font-semibold text-white shadow-inner'
      : 'border-transparent text-white/78 hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white',
  ].join(' ')

const donorSidebarLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center rounded-xl border px-3 py-2.5 text-sm transition',
    isActive
      ? 'border-rose-300/35 bg-white/[0.14] font-semibold text-white shadow-inner'
      : 'border-transparent text-white/78 hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white',
  ].join(' ')

export type ShellVariant =
  | 'secretary'
  | 'accountant'
  | 'doctor'
  | 'storekeeper'
  | 'donor'
  | 'volunteer'
  | 'beneficiary'

type ShellBlock = {
  homePath: string
  gradient: string
  ring: string
  title: string
  links: { to: string; label: string }[]
}

const shells: Record<ShellVariant, ShellBlock> = {
  secretary: {
    homePath: '/app/secretary',
    gradient: 'from-zinc-900 via-violet-950 to-slate-950',
    ring: 'ring-violet-400/25',
    title: 'مساحة السكرتير',
    links: [
      { to: '/app/secretary', label: 'الرئيسية' },
      { to: '/app/secretary/beneficiaries', label: 'المستفيدون والعائلات' },
      { to: '/app/secretary/clinic', label: 'العيادة والمواعيد' },
      { to: '/app/secretary/medical', label: 'السجل الطبي والمختبر' },
    ],
  },
  accountant: {
    homePath: '/app/accountant',
    gradient: 'from-slate-950 via-amber-950 to-zinc-950',
    ring: 'ring-amber-400/25',
    title: 'مساحة المحاسب',
    links: [
      { to: '/app/accountant', label: 'الرئيسية' },
      { to: '/app/accountant/donations', label: 'التبرعات' },
      { to: '/app/accountant/campaign-reporting', label: 'تقارير الحملات' },
      { to: '/app/accountant/payouts', label: 'صرف الأطباء' },
    ],
  },
  doctor: {
    homePath: '/app/doctor',
    gradient: 'from-slate-950 via-cyan-950 to-slate-900',
    ring: 'ring-cyan-400/25',
    title: 'مساحة الطبيب',
    links: [
      { to: '/app/doctor', label: 'الرئيسية' },
      { to: '/app/doctor/appointments', label: 'الفحص والمواعيد' },
      { to: '/app/doctor/medical', label: 'السجل الطبي والتحاليل' },
    ],
  },
  storekeeper: {
    homePath: '/app/storekeeper',
    gradient: 'from-stone-950 via-orange-950 to-slate-950',
    ring: 'ring-orange-400/25',
    title: 'مساحة أمين المستودع',
    links: [
      { to: '/app/storekeeper', label: 'الرئيسية' },
      { to: '/app/storekeeper/inventory', label: 'المستودع والمواد' },
    ],
  },
  donor: {
    homePath: '/app/donor',
    gradient: 'from-slate-950 via-rose-950 to-indigo-950',
    ring: 'ring-rose-400/25',
    title: 'مساحة المتبرع',
    links: [
      { to: '/app/donor', label: 'الرئيسية' },
      { to: '/app/donor/chat', label: 'الشات' },
      { to: '/app/donor/donations', label: 'تبرعاتي وإيصالاتي' },
    ],
  },
  volunteer: {
    homePath: '/app/volunteer',
    gradient: 'from-emerald-950 via-teal-900 to-slate-950',
    ring: 'ring-emerald-400/25',
    title: 'مساحة المتطوع',
    links: [
      { to: '/app/volunteer', label: 'الرئيسية' },
      { to: '/app/volunteer/aid', label: 'المساعدة' },
      { to: '/app/volunteer/opportunities', label: 'فرص التطوع' },
    ],
  },
  beneficiary: {
    homePath: '/app/beneficiary',
    gradient: 'from-sky-950 via-blue-950 to-slate-950',
    ring: 'ring-sky-400/25',
    title: 'مساحة المستفيد',
    links: [
      { to: '/app/beneficiary', label: 'الرئيسية' },
      { to: '/app/beneficiary/aid', label: 'طلبات المساعدة' },
      { to: '/app/beneficiary/appointments', label: 'المواعيد' },
      { to: '/app/beneficiary/medical', label: 'السجلات الطبية' },
    ],
  },
}

export function AppShell({ variant }: { variant: ShellVariant }) {
  const { user, logout } = useAuth()
  const cfg = shells[variant]

  return (
    variant === 'secretary' ? (
      <div className={`min-h-dvh bg-gradient-to-br ${cfg.gradient} bg-fixed font-sans text-white`}>
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(139,92,246,0.35),transparent)]" />
        <div className="relative flex min-h-dvh min-w-0 flex-row md:h-dvh md:max-h-dvh md:overflow-hidden">
          <aside className="relative z-10 hidden h-full min-h-0 w-[clamp(17rem,22vw,20rem)] shrink-0 flex-col overflow-hidden bg-[linear-gradient(165deg,rgba(9,9,23,0.97)_0%,rgba(43,16,77,0.94)_48%,rgba(15,23,42,0.97)_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),inset_-1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-xl md:flex">
            <div className="px-5 pb-4 pt-7">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-indigo-600 text-lg font-black text-white shadow-lg shadow-violet-900/50">
                  س
                </div>
                <div className="min-w-0 flex-1 pt-0.5 text-start">
                  <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-violet-200/75">جمعية الحنين الخيرية</p>
                  <h1 className="mt-0.5 text-[15px] font-bold tracking-tight text-white">لوحة السكرتيرة</h1>
                  {user ? (
                    <p className="mt-2 truncate text-[11px] leading-relaxed text-white/58">
                      {user.name}
                      <span className="mx-1.5 text-white/35">•</span>
                      <span>{roleLabelAr(user.role as UserRole)}</span>
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <nav className="mt-1 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-y-contain px-4 pb-4">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-300/55">مهام السكرتيرة</p>
              {cfg.links.map((l) => (
                <NavLink key={l.to} to={l.to} className={secretarySidebarLinkClass} end={l.to === cfg.homePath}>
                  {l.label}
                </NavLink>
              ))}
            </nav>

            <div className="mt-auto shrink-0 border-t border-white/[0.06] p-4">
              <button
                type="button"
                onClick={() => void logout()}
                className="flex w-full items-center justify-center rounded-xl border border-red-500/30 bg-red-500/[0.14] px-3 py-3 text-sm font-medium text-red-100 transition hover:border-red-400/45 hover:bg-red-500/[0.22]"
              >
                تسجيل الخروج
              </button>
            </div>
          </aside>

          <header className="fixed inset-x-0 top-0 z-40 border-b border-white/15 bg-slate-950/92 px-3 py-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur-md md:hidden">
            <div className="flex items-center gap-2">
              <p className="shrink-0 text-[13px] font-bold text-white">لوحة السكرتيرة</p>
              <div className="min-w-0 flex-1 overflow-x-auto">
                <div className="flex w-max gap-1">
                  {cfg.links.map((l) => (
                    <NavLink key={l.to} to={l.to} className={navClass} end={l.to === cfg.homePath}>
                      {l.label}
                    </NavLink>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                className="shrink-0 rounded-lg bg-white/12 px-3 py-1.5 text-xs font-medium text-white"
              >
                خروج
              </button>
            </div>
          </header>

          <main className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col border-s border-white/10 md:overflow-hidden">
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-3 pb-12 pt-[4.2rem] [scrollbar-gutter:stable] md:min-h-0 md:overflow-y-auto md:overscroll-y-contain md:px-8 md:pb-10 md:pt-10">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    ) : variant === 'doctor' ? (
      <div className={`min-h-dvh bg-gradient-to-br ${cfg.gradient} bg-fixed font-sans text-white`}>
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(34,211,238,0.33),transparent)]" />
        <div className="relative flex min-h-dvh min-w-0 flex-row md:h-dvh md:max-h-dvh md:overflow-hidden">
          <aside className="relative z-10 hidden h-full min-h-0 w-[clamp(17rem,22vw,20rem)] shrink-0 flex-col overflow-hidden bg-[linear-gradient(165deg,rgba(2,26,39,0.97)_0%,rgba(12,74,110,0.92)_48%,rgba(2,6,23,0.97)_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),inset_-1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-xl md:flex">
            <div className="px-5 pb-4 pt-7">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-lg font-black text-white shadow-lg shadow-cyan-900/50">
                  ط
                </div>
                <div className="min-w-0 flex-1 pt-0.5 text-start">
                  <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-200/75">جمعية الحنين الخيرية</p>
                  <h1 className="mt-0.5 text-[15px] font-bold tracking-tight text-white">لوحة الطبيب</h1>
                  {user ? (
                    <p className="mt-2 truncate text-[11px] leading-relaxed text-white/58">
                      {user.name}
                      <span className="mx-1.5 text-white/35">•</span>
                      <span>{roleLabelAr(user.role as UserRole)}</span>
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <nav className="mt-1 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-y-contain px-4 pb-4">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-300/55">مهام الطبيب</p>
              {cfg.links.map((l) => (
                <NavLink key={l.to} to={l.to} className={doctorSidebarLinkClass} end={l.to === cfg.homePath}>
                  {l.label}
                </NavLink>
              ))}
            </nav>

            <div className="mt-auto shrink-0 border-t border-white/[0.06] p-4">
              <button
                type="button"
                onClick={() => void logout()}
                className="flex w-full items-center justify-center rounded-xl border border-red-500/30 bg-red-500/[0.14] px-3 py-3 text-sm font-medium text-red-100 transition hover:border-red-400/45 hover:bg-red-500/[0.22]"
              >
                تسجيل الخروج
              </button>
            </div>
          </aside>

          <header className="fixed inset-x-0 top-0 z-40 border-b border-white/15 bg-slate-950/92 px-3 py-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur-md md:hidden">
            <div className="flex items-center gap-2">
              <p className="shrink-0 text-[13px] font-bold text-white">لوحة الطبيب</p>
              <div className="min-w-0 flex-1 overflow-x-auto">
                <div className="flex w-max gap-1">
                  {cfg.links.map((l) => (
                    <NavLink key={l.to} to={l.to} className={navClass} end={l.to === cfg.homePath}>
                      {l.label}
                    </NavLink>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                className="shrink-0 rounded-lg bg-white/12 px-3 py-1.5 text-xs font-medium text-white"
              >
                خروج
              </button>
            </div>
          </header>

          <main className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col border-s border-white/10 md:overflow-hidden">
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-3 pb-12 pt-[4.2rem] [scrollbar-gutter:stable] md:min-h-0 md:overflow-y-auto md:overscroll-y-contain md:px-8 md:pb-10 md:pt-10">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    ) : variant === 'storekeeper' ? (
      <div className={`min-h-dvh bg-gradient-to-br ${cfg.gradient} bg-fixed font-sans text-white`}>
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(249,115,22,0.33),transparent)]" />
        <div className="relative flex min-h-dvh min-w-0 flex-row md:h-dvh md:max-h-dvh md:overflow-hidden">
          <aside className="relative z-10 hidden h-full min-h-0 w-[clamp(17rem,22vw,20rem)] shrink-0 flex-col overflow-hidden bg-[linear-gradient(165deg,rgba(41,20,4,0.97)_0%,rgba(124,45,18,0.92)_48%,rgba(15,23,42,0.97)_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),inset_-1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-xl md:flex">
            <div className="px-5 pb-4 pt-7">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-amber-600 text-lg font-black text-white shadow-lg shadow-orange-900/50">
                  م
                </div>
                <div className="min-w-0 flex-1 pt-0.5 text-start">
                  <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-orange-200/75">جمعية الحنين الخيرية</p>
                  <h1 className="mt-0.5 text-[15px] font-bold tracking-tight text-white">لوحة أمين المستودع</h1>
                  {user ? (
                    <p className="mt-2 truncate text-[11px] leading-relaxed text-white/58">
                      {user.name}
                      <span className="mx-1.5 text-white/35">•</span>
                      <span>{roleLabelAr(user.role as UserRole)}</span>
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <nav className="mt-1 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-y-contain px-4 pb-4">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-300/55">مهام المستودع</p>
              {cfg.links.map((l) => (
                <NavLink key={l.to} to={l.to} className={storekeeperSidebarLinkClass} end={l.to === cfg.homePath}>
                  {l.label}
                </NavLink>
              ))}
            </nav>

            <div className="mt-auto shrink-0 border-t border-white/[0.06] p-4">
              <button
                type="button"
                onClick={() => void logout()}
                className="flex w-full items-center justify-center rounded-xl border border-red-500/30 bg-red-500/[0.14] px-3 py-3 text-sm font-medium text-red-100 transition hover:border-red-400/45 hover:bg-red-500/[0.22]"
              >
                تسجيل الخروج
              </button>
            </div>
          </aside>

          <header className="fixed inset-x-0 top-0 z-40 border-b border-white/15 bg-slate-950/92 px-3 py-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur-md md:hidden">
            <div className="flex items-center gap-2">
              <p className="shrink-0 text-[13px] font-bold text-white">لوحة أمين المستودع</p>
              <div className="min-w-0 flex-1 overflow-x-auto">
                <div className="flex w-max gap-1">
                  {cfg.links.map((l) => (
                    <NavLink key={l.to} to={l.to} className={navClass} end={l.to === cfg.homePath}>
                      {l.label}
                    </NavLink>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                className="shrink-0 rounded-lg bg-white/12 px-3 py-1.5 text-xs font-medium text-white"
              >
                خروج
              </button>
            </div>
          </header>

          <main className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col border-s border-white/10 md:overflow-hidden">
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-3 pb-12 pt-[4.2rem] [scrollbar-gutter:stable] md:min-h-0 md:overflow-y-auto md:overscroll-y-contain md:px-8 md:pb-10 md:pt-10">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    ) : variant === 'donor' ? (
      <div className={`min-h-dvh bg-gradient-to-br ${cfg.gradient} bg-fixed font-sans text-white`}>
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(244,63,94,0.33),transparent)]" />
        <div className="relative flex min-h-dvh min-w-0 flex-row md:h-dvh md:max-h-dvh md:overflow-hidden">
          <aside className="relative z-10 hidden h-full min-h-0 w-[clamp(17rem,22vw,20rem)] shrink-0 flex-col overflow-hidden bg-[linear-gradient(165deg,rgba(76,5,25,0.97)_0%,rgba(131,24,67,0.92)_48%,rgba(15,23,42,0.97)_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),inset_-1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-xl md:flex">
            <div className="px-5 pb-4 pt-7">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-fuchsia-600 text-lg font-black text-white shadow-lg shadow-rose-900/50">
                  ت
                </div>
                <div className="min-w-0 flex-1 pt-0.5 text-start">
                  <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-rose-200/75">جمعية الحنين الخيرية</p>
                  <h1 className="mt-0.5 text-[15px] font-bold tracking-tight text-white">لوحة المتبرع</h1>
                  {user ? (
                    <p className="mt-2 truncate text-[11px] leading-relaxed text-white/58">
                      {user.name}
                      <span className="mx-1.5 text-white/35">•</span>
                      <span>{roleLabelAr(user.role as UserRole)}</span>
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <nav className="mt-1 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-y-contain px-4 pb-4">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-300/55">مهام المتبرع</p>
              {cfg.links.map((l) => (
                <NavLink key={l.to} to={l.to} className={donorSidebarLinkClass} end={l.to === cfg.homePath}>
                  {l.label}
                </NavLink>
              ))}
            </nav>

            <div className="mt-auto shrink-0 border-t border-white/[0.06] p-4">
              <button
                type="button"
                onClick={() => void logout()}
                className="flex w-full items-center justify-center rounded-xl border border-red-500/30 bg-red-500/[0.14] px-3 py-3 text-sm font-medium text-red-100 transition hover:border-red-400/45 hover:bg-red-500/[0.22]"
              >
                تسجيل الخروج
              </button>
            </div>
          </aside>

          <header className="fixed inset-x-0 top-0 z-40 border-b border-white/15 bg-slate-950/92 px-3 py-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur-md md:hidden">
            <div className="flex items-center gap-2">
              <p className="shrink-0 text-[13px] font-bold text-white">لوحة المتبرع</p>
              <div className="min-w-0 flex-1 overflow-x-auto">
                <div className="flex w-max gap-1">
                  {cfg.links.map((l) => (
                    <NavLink key={l.to} to={l.to} className={navClass} end={l.to === cfg.homePath}>
                      {l.label}
                    </NavLink>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                className="shrink-0 rounded-lg bg-white/12 px-3 py-1.5 text-xs font-medium text-white"
              >
                خروج
              </button>
            </div>
          </header>

          <main className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col border-s border-white/10 md:overflow-hidden">
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-3 pb-12 pt-[4.2rem] [scrollbar-gutter:stable] md:min-h-0 md:overflow-y-auto md:overscroll-y-contain md:px-8 md:pb-10 md:pt-10">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    ) : (
    <div
      className={`min-h-dvh bg-gradient-to-br ${cfg.gradient} bg-fixed font-sans text-white`}
    >
      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 pb-10 pt-6 sm:px-6">
        <header
          className={`mb-8 flex flex-col gap-4 rounded-2xl bg-white/5 p-4 shadow-xl ring-1 ${cfg.ring} backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:p-5`}
        >
          <div>
            <p className="text-xs font-medium tracking-wide text-white/60">جمعية الحنين الخيرية</p>
            <h1 className="text-xl font-bold sm:text-2xl">{cfg.title}</h1>
            {user ? (
              <p className="mt-1 text-sm text-white/75">
                {user.name} — <span className="text-white/90">{roleLabelAr(user.role as UserRole)}</span>
              </p>
            ) : null}
          </div>
          <nav className="flex max-h-48 flex-wrap items-center gap-2 overflow-y-auto sm:max-h-none">
            {cfg.links.map((l) => (
              <NavLink key={l.to} to={l.to} className={navClass} end={l.to === cfg.homePath}>
                {l.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
            >
              خروج
            </button>
          </nav>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
    )
  )
}
