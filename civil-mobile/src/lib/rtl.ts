import { I18nManager, Platform } from 'react-native'

/** True when the layout is right-to-left (native layout direction, or document dir on web). */
export function isRtlLayout(): boolean {
  if (Platform.OS === 'web') {
    return typeof document !== 'undefined' && document.documentElement.dir === 'rtl'
  }
  return I18nManager.isRTL
}

/**
 * Letter-spacing class for Latin-only styling. Arabic letters join, so any
 * letter-spacing breaks the word into disconnected glyphs: drop it in RTL.
 */
export function tracking(value: 'tight' | 'wide' | 'wider' | 'widest'): string {
  return isRtlLayout() ? '' : `tracking-${value}`
}

const LRI = '⁦'
const PDI = '⁩'

/**
 * Isolates an LTR token (email, phone, URL, ID, code) so it keeps its own
 * reading order inside an Arabic sentence. React Native has no `<bdi>`.
 */
export function ltr(value: string | null | undefined): string {
  return value ? `${LRI}${value}${PDI}` : ''
}
