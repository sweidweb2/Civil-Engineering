import { describe, expect, it } from 'vitest'

import { portalNotificationsPath } from '@/features/notifications/notification-utils'

describe('portalNotificationsPath', () => {
  it('routes inbox by portal prefix', () => {
    expect(portalNotificationsPath('/super/users')).toBe('/super/notifications')
    expect(portalNotificationsPath('/pm/projects')).toBe('/pm/notifications')
    expect(portalNotificationsPath('/provider/listings')).toBe('/provider/notifications')
    expect(portalNotificationsPath('/admin/queue')).toBe('/admin/notifications')
    expect(portalNotificationsPath('/login')).toBe('/admin/notifications')
  })
})
