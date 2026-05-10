import type { AppLocale } from './locale'

export type AdminShellStrings = {
  orgLine: string
  shellTitle: string
  navAria: string
  logout: string
  mobileTitle: string
  mobileLogout: string
  langAr: string
  langEn: string
}

const ar: AdminShellStrings = {
  orgLine: 'جمعية الحنين الخيرية',
  shellTitle: 'لوحة تحكم الإدارة',
  navAria: 'قائمة التنقل الإدارية',
  logout: 'تسجيل الخروج',
  mobileTitle: 'لوحة الإدارة',
  mobileLogout: 'خروج',
  langAr: 'عربي',
  langEn: 'English',
}

const en: AdminShellStrings = {
  orgLine: 'Al-Hanin Charitable Society',
  shellTitle: 'Administration console',
  navAria: 'Admin navigation',
  logout: 'Sign out',
  mobileTitle: 'Admin dashboard',
  mobileLogout: 'Sign out',
  langAr: 'العربية',
  langEn: 'English',
}

export function getAdminShellCopy(locale: AppLocale): AdminShellStrings {
  return locale === 'en' ? en : ar
}
