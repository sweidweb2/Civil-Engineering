import { describe, expect, it } from 'vitest'

import { homePathForRole } from '@/lib/homePath'

describe('homePathForRole', () => {
  it('routes panel roles to their shells', () => {
    expect(homePathForRole('SUPER')).toBe('/super')
    expect(homePathForRole('ADMIN')).toBe('/admin')
    expect(homePathForRole('MANAGER')).toBe('/pm/projects')
    expect(homePathForRole('PROVIDER')).toBe('/provider/listings')
    expect(homePathForRole('CLIENT')).toBe('/')
  })
})
