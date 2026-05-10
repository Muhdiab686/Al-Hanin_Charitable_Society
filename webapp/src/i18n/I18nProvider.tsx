import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { I18nContext, type I18nContextValue } from './i18nReactContext'
import type { AppLocale } from './locale'
import { LOCALE_STORAGE_KEY, readStoredLocale } from './locale'

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(() => readStoredLocale())

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next)
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next)
  }, [])

  const value = useMemo(
    (): I18nContextValue => ({
      locale,
      setLocale,
      isRtl: locale === 'ar',
    }),
    [locale, setLocale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
