import { homePathForRole, isPathInRolePortal, portalIdForRole } from '@/navigation/homePath'

describe('homePathForRole', () => {
  it('routes each role to its portal home', () => {
    expect(homePathForRole('SUPER')).toBe('/super')
    expect(homePathForRole('ADMIN')).toBe('/admin')
    expect(homePathForRole('MANAGER')).toBe('/pm')
    expect(homePathForRole('PROVIDER')).toBe('/provider')
    expect(homePathForRole('WORKER')).toBe('/worker')
    expect(homePathForRole('CLIENT')).toBe('/client')
    expect(homePathForRole(null)).toBe('/client')
  })
})

describe('portalIdForRole', () => {
  it('maps roles to portal ids', () => {
    expect(portalIdForRole('SUPER')).toBe('super')
    expect(portalIdForRole('ADMIN')).toBe('admin')
    expect(portalIdForRole('MANAGER')).toBe('pm')
    expect(portalIdForRole('PROVIDER')).toBe('provider')
    expect(portalIdForRole('WORKER')).toBe('worker')
    expect(portalIdForRole(undefined)).toBe('client')
  })
})

describe('isPathInRolePortal', () => {
  it('accepts the portal root and nested paths', () => {
    expect(isPathInRolePortal('/provider', 'PROVIDER')).toBe(true)
    expect(isPathInRolePortal('/provider/listings', 'PROVIDER')).toBe(true)
    expect(isPathInRolePortal('/admin/users', 'ADMIN')).toBe(true)
  })

  it('rejects paths outside the role portal', () => {
    expect(isPathInRolePortal('/admin', 'PROVIDER')).toBe(false)
    expect(isPathInRolePortal('/client', 'MANAGER')).toBe(false)
  })
})
