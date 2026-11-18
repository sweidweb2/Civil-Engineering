import { ltr, tracking } from '@/lib/rtl'

describe('rtl helpers', () => {
  it('wraps LTR tokens in directional isolates', () => {
    expect(ltr('a@b.com')).toBe('⁦a@b.com⁩')
  })

  it('returns an empty string for empty tokens', () => {
    expect(ltr(null)).toBe('')
    expect(ltr(undefined)).toBe('')
    expect(ltr('')).toBe('')
  })

  it('keeps letter-spacing in LTR layouts', () => {
    expect(tracking('widest')).toBe('tracking-widest')
  })
})
