import i18n from '@/i18n'
import { type AppLocale, applyDocumentLocale, useLocaleStore } from '@/stores/localeStore'

export function setAppLocale(locale: AppLocale) {
  applyDocumentLocale(locale)
  void i18n.changeLanguage(locale)
  useLocaleStore.getState().setLocale(locale)
}
