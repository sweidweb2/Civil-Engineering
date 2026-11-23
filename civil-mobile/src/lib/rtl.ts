import { I18nManager, Platform, type TextStyle } from 'react-native'

import { useLanguageStore } from '@/stores/languageStore'

/**
 * True when the app language is Arabic (or web document is rtl).
 * Prefer the language store over I18nManager — forceRTL often lags until a full
 * native process restart, while the store updates immediately.
 */
export function isRtlLayout(): boolean {
  if (Platform.OS === 'web') {
    return typeof document !== 'undefined' && document.documentElement.dir === 'rtl'
  }
  try {
    if (useLanguageStore.getState().language === 'ar') return true
  } catch {
    // Store unavailable (rare); fall through.
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

/**
 * TextInput style for LTR tokens (email, phone, URL, password, numbers).
 * Keeps writing direction LTR while aligning the caret to the reading edge.
 */
export function ltrInputStyle(): TextStyle {
  return {
    writingDirection: 'ltr',
    textAlign: isRtlLayout() ? 'right' : 'left',
  }
}

/** Mirrors a directional icon (chevrons, arrows) in RTL. Do not use on universal icons. */
export function flipStyle(): { transform: [{ scaleX: -1 }] } | undefined {
  return isRtlLayout() ? { transform: [{ scaleX: -1 }] } : undefined
}
