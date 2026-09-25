export type NotificationKind = 'approval' | 'verification' | 'review' | 'project' | 'system'

export type AppNotification = {
  id: string
  kind: NotificationKind
  title: string
  body: string
  href: string | null
  createdAt: string
  readAt: string | null
}
