import { describe, expect, it } from 'vitest'

import { buildObjectKey, sanitizeOriginalName } from '../../src/storage/object-key.js'

describe('object-key', () => {
  it('sanitizes original names', () => {
    expect(sanitizeOriginalName('Site Plan (final).PDF')).toBe('site-plan-final.pdf')
    expect(sanitizeOriginalName('../../etc/passwd')).toBe('passwd')
    expect(sanitizeOriginalName('!!!')).toBe('file')
  })

  it('builds the locked key convention', () => {
    const key = buildObjectKey({
      env: 'development',
      entityType: 'PROJECT',
      entityId: 'clxyz',
      fileId: 'cuid123',
      originalName: 'Site Plan.pdf',
      at: new Date(Date.UTC(2026, 8, 20)),
    })
    expect(key).toBe('dev/projects/clxyz/2026/09/cuid123-site-plan.pdf')
  })

  it('maps NODE_ENV segments', () => {
    expect(
      buildObjectKey({
        env: 'production',
        entityType: 'USER',
        entityId: 'u1',
        fileId: 'f1',
        originalName: 'a.png',
        at: new Date(Date.UTC(2026, 0, 1)),
      }),
    ).toBe('prod/users/u1/2026/01/f1-a.png')
  })
})
