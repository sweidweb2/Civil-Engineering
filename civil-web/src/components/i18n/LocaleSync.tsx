import { type ReactNode, useEffect } from 'react'
import { DirectionProvider } from '@base-ui/react/direction-provider'
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

  // Base UI components (tabs, menus, sliders, radios…) read direction from this
  // provider for arrow-key behaviour; the document `dir` alone is not enough.
  return (
    <DirectionProvider direction={locale === 'ar' ? 'rtl' : 'ltr'}>{children}</DirectionProvider>
  )
}
