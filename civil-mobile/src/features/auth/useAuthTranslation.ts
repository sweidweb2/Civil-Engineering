import { useMemo } from 'react'
import type { TFunction } from 'i18next'

import i18n from '@/i18n'

/**
 * Always returns English copy for auth screens (labels, placeholders, errors),
 * even when the app language is Arabic. Nested kit fields under `AuthLocaleGate`
 * also resolve English via a cloned i18n instance.
 */
export function useAuthTranslation(): { t: TFunction } {
  const t = useMemo(() => i18n.getFixedT('en', 'translation'), [])
  return { t }
}
