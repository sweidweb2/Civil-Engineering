import { type ReactNode, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { applyDocumentLocale, useLocaleStore } from '@/stores/localeStore'

export function LocaleSync({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()
  const locale = useLocaleStore((state) => state.locale)

  useEffect(() => {
    applyDocumentLocale(locale)
    if (i18n.language !== locale) {
      void i18n.changeLanguage(locale)
    }
  }, [i18n, locale])

  return children
}
