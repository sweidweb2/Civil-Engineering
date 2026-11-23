import { I18nManager, Platform } from 'react-native'

import { flipStyle, ltr, ltrInputStyle, tracking } from '@/lib/rtl'
import { useLanguageStore } from '@/stores/languageStore'

describe('rtl helpers', () => {
  const originalOs = Platform.OS
  const originalIsRtl = I18nManager.isRTL

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOs })
    Object.defineProperty(I18nManager, 'isRTL', { configurable: true, value: originalIsRtl })
    useLanguageStore.setState({ language: 'en' })
  })

  it('wraps LTR tokens in directional isolates', () => {
    expect(ltr('a@b.com')).toBe('⁦a@b.com⁩')
  })

  it('returns an empty string for empty tokens', () => {
    expect(ltr(null)).toBe('')
    expect(ltr(undefined)).toBe('')
    expect(ltr('')).toBe('')
  })

  it('keeps letter-spacing in LTR layouts', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' })
    useLanguageStore.setState({ language: 'en' })
    expect(tracking('widest')).toBe('tracking-widest')
  })

  it('drops letter-spacing in RTL layouts', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' })
    useLanguageStore.setState({ language: 'ar' })
    expect(tracking('widest')).toBe('')
  })

  it('aligns LTR inputs to the reading edge', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' })
    useLanguageStore.setState({ language: 'ar' })
    expect(ltrInputStyle()).toEqual({ writingDirection: 'ltr', textAlign: 'right' })

    useLanguageStore.setState({ language: 'en' })
    expect(ltrInputStyle()).toEqual({ writingDirection: 'ltr', textAlign: 'left' })
  })

  it('mirrors directional icons only in RTL', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' })
    useLanguageStore.setState({ language: 'ar' })
    expect(flipStyle()).toEqual({ transform: [{ scaleX: -1 }] })

    useLanguageStore.setState({ language: 'en' })
    expect(flipStyle()).toBeUndefined()
  })
})
