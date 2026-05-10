import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { roleLabel } from '../auth/roleRoutes'
import { getAdminSidebarNav } from '../admin/adminNavigation'
import { getAdminShellCopy } from '../i18n/adminShellCopy'
import type { AppLocale } from '../i18n/locale'
import { useI18n } from '../i18n/useI18n'
import { AdminShellMobileJump } from './AdminShellMobileJump'
import type { UserRole } from '../types/models'

function sidebarLangTabClass(active: boolean) {
  return [
    'min-w-[3.25rem] flex-1 rounded-lg px-2 py-2 text-[11px] font-semibold transition',
    active ? 'bg-white/20 text-white shadow-inner' : 'text-white/65 hover:bg-white/10 hover:text-white',
  ].join(' ')
}

function compactLangTabClass(active: boolean) {
  return [
    'rounded-md px-2 py-1 text-[10px] font-bold uppercase transition',
    active ? 'bg-white/25 text-white' : 'text-white/58 hover:bg-white/12 hover:text-white',
  ].join(' ')
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center rounded-xl px-3 py-2.5 text-[13px] leading-snug transition-colors duration-200',
    'border border-transparent text-start',
    isActive
      ? 'border-indigo-400/35 bg-white/[0.12] font-semibold text-white shadow-inner shadow-black/25'
      : 'text-white/76 hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white',
  ].join(' ')

export function AdminShell() {
  const { locale, setLocale, isRtl } = useI18n()
  const { user, logout } = useAuth()
  const sections = getAdminSidebarNav(locale)
  const shell = getAdminShellCopy(locale)

  function pickLocale(next: AppLocale) {
    setLocale(next)
  }

  return (
    <div
      lang={locale === 'en' ? 'en' : 'ar'}
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-dvh bg-[#070b14] font-sans text-white"
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(79,70,229,0.35),transparent)]" />

      <div className="relative flex min-h-dvh min-w-0 flex-row md:h-dvh md:max-h-dvh md:overflow-hidden">
        <aside className="relative z-10 hidden h-full min-h-0 w-[clamp(17rem,22vw,20rem)] shrink-0 flex-col overflow-hidden bg-[linear-gradient(165deg,rgba(15,23,42,0.97)_0%,rgba(30,27,75,0.94)_48%,rgba(15,23,42,0.97)_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),inset_-1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-xl md:flex">
          <div className="px-5 pb-4 pt-7">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-600 text-lg font-black text-white shadow-lg shadow-indigo-900/50">
                ح
              </div>
              <div className="min-w-0 flex-1 pt-0.5 text-start">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-indigo-200/75">{shell.orgLine}</p>
                <h1 className="mt-0.5 text-[15px] font-bold tracking-tight text-white">{shell.shellTitle}</h1>
                {user ? (
                  <p className="mt-2 truncate text-[11px] leading-relaxed text-white/58">
                    {user.name}
                    <span className="mx-1.5 text-white/35">•</span>
                    <span>{roleLabel(user.role as UserRole, locale)}</span>
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-black/30 p-1 ring-1 ring-white/[0.07]" role="group" aria-label="Language">
              <div className="flex gap-1">
                <button type="button" className={sidebarLangTabClass(locale === 'ar')} onClick={() => pickLocale('ar')}>
                  {shell.langAr}
                </button>
                <button type="button" className={sidebarLangTabClass(locale === 'en')} onClick={() => pickLocale('en')}>
                  {shell.langEn}
                </button>
              </div>
            </div>
          </div>

          <nav
            aria-label={shell.navAria}
            className="custom-scrollbar mt-1 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-y-contain px-4 pb-4"
          >
            {sections.map((section, si) => (
              <div key={`${section.title}-${si}`} className={si > 0 ? 'mt-4 border-t border-white/[0.06] pt-5' : ''}>
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-300/55">
                  {section.title}
                </p>
                <ul className="space-y-0.5">
                  {section.links.map((link) => (
                    <li key={link.to}>
                      <NavLink to={link.to} end={link.to === '/app/admin'} className={linkClass}>
                        {link.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="mt-auto shrink-0 border-t border-white/[0.06] p-4">
            <button
              type="button"
              onClick={() => void logout()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.14] px-3 py-3 text-sm font-medium text-red-100 transition hover:border-red-400/45 hover:bg-red-500/[0.22]"
            >
              {shell.logout}
            </button>
          </div>

          <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 5px; }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(99, 102, 241, 0.35);
              border-radius: 9999px;
            }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          `}</style>
        </aside>

        <header className="fixed inset-x-0 top-0 z-40 flex items-center gap-2 border-b border-white/15 bg-[#070b14]/95 px-3 py-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur-md md:hidden">
          <p className="shrink-0 text-[13px] font-bold text-white">{shell.mobileTitle}</p>
          <div className="flex shrink-0 gap-0.5 rounded-lg bg-white/10 p-0.5 ring-1 ring-white/10">
            <button type="button" className={compactLangTabClass(locale === 'ar')} onClick={() => pickLocale('ar')}>
              ع
            </button>
            <button type="button" className={compactLangTabClass(locale === 'en')} onClick={() => pickLocale('en')}>
              En
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <AdminShellMobileJump placeholder={locale === 'en' ? 'Quick navigation…' : 'قائمة الوصول السريع…'} />
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="shrink-0 rounded-lg bg-white/12 px-3 py-1.5 text-xs font-medium text-white"
          >
            {shell.mobileLogout}
          </button>
        </header>

        <main className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col border-s border-white/10 md:overflow-hidden">
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-3 pb-12 pt-[3.65rem] [scrollbar-gutter:stable] md:min-h-0 md:overflow-y-auto md:overscroll-y-contain md:px-8 md:pb-10 md:pt-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
