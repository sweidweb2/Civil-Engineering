import { type ReactNode, useMemo } from 'react'
import { View } from 'react-native'
import type { i18n as I18n } from 'i18next'
import { I18nextProvider } from 'react-i18next'

import i18n from '@/i18n'
import { AuthLocaleContext } from '@/lib/authLocale'

export { useIsAuthLocale } from '@/lib/authLocale'

/**
 * Forces English strings + LTR layout for the entire auth tree
 * (including nested kit fields that call useTranslation).
 */
export function AuthLocaleGate({ children }: { children: ReactNode }) {
  const authI18n = useMemo(() => i18n.cloneInstance({ lng: 'en' }) as I18n, [])

  return (
    <AuthLocaleContext.Provider value={true}>
      <I18nextProvider i18n={authI18n}>
        <View style={{ flex: 1, direction: 'ltr' }} collapsable={false}>
          {children}
        </View>
      </I18nextProvider>
    </AuthLocaleContext.Provider>
  )
}
