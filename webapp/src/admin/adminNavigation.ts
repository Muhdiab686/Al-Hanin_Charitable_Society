import type { AppLocale } from '../i18n/locale'
import { getAdminNavForLocale } from './adminNavI18n'
import type { AdminNavGroup, AdminNavLink } from './navTypes'

export type { AdminNavGroup, AdminNavLink }

/** عناصر التنقل لمساحة مدير النظام حسب لغة الواجهة. */
export function getAdminSidebarNav(locale: AppLocale): AdminNavGroup[] {
  return getAdminNavForLocale(locale)
}
