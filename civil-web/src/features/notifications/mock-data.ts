import type { AppNotification } from './notifications.types'

const now = Date.now()

function minutesAgo(minutes: number): string {
  return new Date(now - minutes * 60_000).toISOString()
}

/** UI mock inbox. Not an API cache. */
export const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    kind: 'verification',
    title: 'Worker verification requested',
    body: 'Omar Haddad submitted documents for review.',
    href: '/admin/verification',
    createdAt: minutesAgo(12),
    readAt: null,
  },
  {
    id: 'n2',
    kind: 'approval',
    title: 'Registration pending',
    body: 'A new provider account is waiting for approval.',
    href: '/admin/approvals',
    createdAt: minutesAgo(48),
    readAt: null,
  },
  {
    id: 'n3',
    kind: 'review',
    title: 'New directory review',
    body: 'A 2-star review was submitted for Cedar Supplies.',
    href: '/admin/reviews',
    createdAt: minutesAgo(110),
    readAt: null,
  },
  {
    id: 'n4',
    kind: 'project',
    title: 'Project marked active',
    body: 'Beirut Waterfront Phase 2 moved from planning to active.',
    href: '/admin/projects',
    createdAt: minutesAgo(260),
    readAt: minutesAgo(200),
  },
  {
    id: 'n5',
    kind: 'system',
    title: 'Maintenance window scheduled',
    body: 'Platform maintenance is listed in settings. UI only for now.',
    href: '/admin/settings',
    createdAt: minutesAgo(400),
    readAt: minutesAgo(380),
  },
  {
    id: 'n6',
    kind: 'approval',
    title: 'PM registration approved',
    body: 'Lina Mansour can now sign in as a project manager.',
    href: '/admin/users',
    createdAt: minutesAgo(900),
    readAt: minutesAgo(880),
  },
  {
    id: 'n7',
    kind: 'verification',
    title: 'Verification completed',
    body: 'Karim Nassar is now marked verified.',
    href: '/admin/verification',
    createdAt: minutesAgo(1500),
    readAt: null,
  },
  {
    id: 'n8',
    kind: 'review',
    title: 'Review accepted',
    body: 'The review for SteelWorks Hub is now public.',
    href: '/admin/reviews',
    createdAt: minutesAgo(1800),
    readAt: minutesAgo(1700),
  },
  {
    id: 'n9',
    kind: 'project',
    title: 'New project created',
    body: 'Tripoli Clinic Fit-out was added to manage projects.',
    href: '/admin/projects',
    createdAt: minutesAgo(2600),
    readAt: minutesAgo(2500),
  },
  {
    id: 'n10',
    kind: 'system',
    title: 'Categories updated',
    body: 'Two material categories were added to the directory.',
    href: '/admin/categories',
    createdAt: minutesAgo(4200),
    readAt: minutesAgo(4100),
  },
]
