import { isHttpUrl, remoteImage } from '@/lib/imageSource'

describe('remoteImage', () => {
  it('pins the cache to a stable key so re-signed URLs still hit', () => {
    const a = remoteImage('https://r2.example/x.webp?X-Amz-Signature=aaa', 'dev/listings/1/x.webp')
    const b = remoteImage('https://r2.example/x.webp?X-Amz-Signature=bbb', 'dev/listings/1/x.webp')
    expect(a).toEqual({ uri: expect.stringContaining('aaa'), cacheKey: 'dev/listings/1/x.webp' })
    expect(a.cacheKey).toBe(b.cacheKey)
  })

  it('falls back to URL caching without a key (local picks, unknown sources)', () => {
    expect(remoteImage('file:///tmp/pick.jpg')).toEqual({ uri: 'file:///tmp/pick.jpg' })
    expect(remoteImage('https://x/y.png', null)).toEqual({ uri: 'https://x/y.png' })
  })
})

describe('isHttpUrl', () => {
  it('accepts loadable URLs only', () => {
    expect(isHttpUrl('https://cdn.example/logo.webp')).toBe(true)
    expect(isHttpUrl('HTTP://cdn.example/logo.webp')).toBe(true)
  })

  it('rejects storage refs that must not reach <Image>', () => {
    expect(isHttpUrl('providers/p1/logo/abc.webp')).toBe(false) // R2 key
    expect(isHttpUrl('clx9fileid0001')).toBe(false) // avatar File id
    expect(isHttpUrl(null)).toBe(false)
    expect(isHttpUrl(undefined)).toBe(false)
  })
})
