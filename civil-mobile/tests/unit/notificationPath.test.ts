import { isAllowedNotificationPath } from '@/lib/notificationPath'

describe('isAllowedNotificationPath', () => {
  it.each([
    '/pm',
    '/pm/projects/abc',
    '/admin/users',
    '/provider/listings/1',
    '/worker/cv',
    '/login',
    '/pending-approval',
    '/home',
  ])('allows %s', (path) => expect(isAllowedNotificationPath(path)).toBe(true))

  it.each([
    '',
    'pm/projects',
    '//evil.example',
    '/pm/../admin',
    'https://evil.example/phish',
    '/unknown-root',
    '/javascript:alert(1)',
  ])('blocks %s', (path) => expect(isAllowedNotificationPath(path)).toBe(false))
})
