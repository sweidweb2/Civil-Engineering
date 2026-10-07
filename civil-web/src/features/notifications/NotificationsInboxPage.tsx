import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Info,
  AlertTriangle,
  AlertCircle,
  Megaphone,
  Settings,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { ListSkeleton } from '@/components/feedback/skeletons'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/page-header'
import { STAT_GRID_CLASS, StatCard } from '@/components/layout/stat-card'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useRemoteData } from '@/hooks/useRemoteData'
import {
  type Notification,
  type NotificationType,
  listNotifications,
  markAsRead,
  markAsUnread,
  softDeleteNotification,
} from '@/services/notifications'
import { cn } from '@/lib/utils'

function getTypeIcon(type: NotificationType) {
  switch (type) {
    case 'SUCCESS':
      return CheckCheck
    case 'WARNING':
      return AlertTriangle
    case 'ERROR':
      return AlertCircle
    case 'ANNOUNCEMENT':
      return Megaphone
    case 'SYSTEM':
      return Settings
    default:
      return Info
  }
}

function getTypeColor(type: NotificationType): string {
  switch (type) {
    case 'SUCCESS':
      return 'bg-success/10 text-success'
    case 'WARNING':
      return 'bg-warning/10 text-warning'
    case 'ERROR':
      return 'bg-destructive/10 text-destructive'
    case 'ANNOUNCEMENT':
      return 'bg-info/10 text-info'
    case 'SYSTEM':
      return 'bg-muted text-muted-foreground'
    default:
      return 'bg-primary/10 text-primary'
  }
}

function formatDate(iso: string): string {
  try {
    const date = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  } catch {
    return iso
  }
}

export function NotificationsInboxPage() {
  useDocumentTitle('Notifications')
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null)
  const limit = 20

  const load = useCallback(() => listNotifications(page, limit), [page])
  const remote = useRemoteData(load)

  const notifications: Notification[] = remote.status === 'success' ? remote.data.data : []
  const total = remote.status === 'success' ? remote.data.meta.total : 0
  const totalPages = remote.status === 'success' ? remote.data.meta.totalPages : 1

  const filteredNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id)
      toast.success('Marked as read')
      void remote.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to mark as read')
    }
  }

  const handleMarkAsUnread = async (id: string) => {
    try {
      await markAsUnread(id)
      toast.success('Marked as unread')
      void remote.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to mark as unread')
    }
  }

  const handleDeleteClick = (id: string) => {
    setNotificationToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!notificationToDelete) return
    try {
      await softDeleteNotification(notificationToDelete)
      toast.success('Notification deleted')
      setDeleteDialogOpen(false)
      setNotificationToDelete(null)
      void remote.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete notification')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Notifications"
        description="Your notifications and alerts."
      />

      <div className={STAT_GRID_CLASS}>
        <StatCard icon={Bell} label="Total" value={total} />
        <StatCard icon={BellOff} label="Unread" value={unreadCount} />
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All ({notifications.length})
        </Button>
        <Button
          variant={filter === 'unread' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('unread')}
        >
          Unread ({unreadCount})
        </Button>
      </div>

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<ListSkeleton />}
      >
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="size-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notification) => {
              const Icon = getTypeIcon(notification.type)
              return (
                <Card
                  key={notification.id}
                  className={cn(
                    'transition-all hover:shadow-md',
                    !notification.isRead && 'border-l-4 border-l-primary bg-primary/5'
                  )}
                >
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className={cn('rounded-lg p-2', getTypeColor(notification.type))}>
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold">{notification.title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                          {notification.sender && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              From: {notification.sender.email}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="whitespace-nowrap text-xs">
                            {formatDate(notification.createdAt)}
                          </Badge>
                          {!notification.isRead ? (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => void handleMarkAsRead(notification.id)}
                              title="Mark as read"
                            >
                              <Check className="size-4" />
                            </Button>
                          ) : (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => void handleMarkAsUnread(notification.id)}
                              title="Mark as unread"
                            >
                              <X className="size-4" />
                            </Button>
                          )}
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => handleDeleteClick(notification.id)}
                            title="Delete"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} ({total} total)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </AsyncState>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notification</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this notification? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDeleteConfirm()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
