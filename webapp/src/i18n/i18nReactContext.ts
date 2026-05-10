import { createContext } from 'react'
import type { AppLocale } from './locale'

export type I18nContextValue = {
  locale: AppLocale
  setLocale: (next: AppLocale) => void
  isRtl: boolean
}

export const I18nContext = createContext<I18nContextValue | null>(null)
