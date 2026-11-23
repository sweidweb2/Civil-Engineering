import { I18nManager, Platform } from 'react-native'

import { directionNeedsRestart } from '@/i18n/direction'

describe('directionNeedsRestart', () => {
  const originalOs = Platform.OS
  const originalIsRtl = I18nManager.isRTL

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOs })
    Object.defineProperty(I18nManager, 'isRTL', { configurable: true, value: originalIsRtl })
  })

  it('is false on web', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' })
    Object.defineProperty(I18nManager, 'isRTL', { configurable: true, value: false })
    expect(directionNeedsRestart('ar')).toBe(false)
  })

  it('is true on native when layout direction must flip', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' })
    Object.defineProperty(I18nManager, 'isRTL', { configurable: true, value: false })
    expect(directionNeedsRestart('ar')).toBe(true)
    expect(directionNeedsRestart('en')).toBe(false)
  })
})
