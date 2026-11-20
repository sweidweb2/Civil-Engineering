import { describe, expect, it } from 'vitest'

import {
  getRequestId,
  getRequestLogger,
  hashEmailHint,
  runWithRequestContext,
  sanitizeRequestId,
  setRequestUserId,
} from '../../src/logging/request-als.js'

describe('request ALS helpers', () => {
  it('accepts safe request ids and rejects forged ones', () => {
    expect(sanitizeRequestId('abc-123_XYZ.9')).toBe('abc-123_XYZ.9')
    expect(sanitizeRequestId('')).toBeUndefined()
    expect(sanitizeRequestId('has space')).toBeUndefined()
    expect(sanitizeRequestId('a'.repeat(200))).toBeUndefined()
    expect(sanitizeRequestId('<script>')).toBeUndefined()
  })

  it('binds requestId/userId on the child logger store', () => {
    runWithRequestContext({ requestId: 'req-1' }, () => {
      setRequestUserId('user-1')
      expect(getRequestId()).toBe('req-1')
      const logger = getRequestLogger()
      expect(logger.bindings()).toMatchObject({ requestId: 'req-1', userId: 'user-1' })
    })
  })

  it('hashes email hints without exposing the address', () => {
    const hint = hashEmailHint('Person@Example.com')
    expect(hint).toHaveLength(12)
    expect(hint).not.toContain('example')
    expect(hashEmailHint('person@example.com')).toBe(hint)
  })
})
