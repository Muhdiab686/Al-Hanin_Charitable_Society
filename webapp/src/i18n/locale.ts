export type AppLocale = 'ar' | 'en'

export const LOCALE_STORAGE_KEY = 'hanin.locale'

export function isAppLocale(value: string | null): value is AppLocale {
  return value === 'ar' || value === 'en'
}

export function readStoredLocale(): AppLocale {
  if (typeof window === 'undefined') {
    return 'ar'
  }
  const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY)
  return isAppLocale(raw) ? raw : 'ar'
}
