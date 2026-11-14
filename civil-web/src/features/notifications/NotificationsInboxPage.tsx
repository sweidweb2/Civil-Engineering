import { useCallback, useState } from 'react'
import { type TFunction } from 'i18next'
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Info,
  Megaphone,
  Settings,
  Trash2,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { ListSkeleton } from '@/components/feedback/skeletons'
import { PageHeader, STAT_GRID_CLASS, StatCard } from '@/components/layout'
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
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useRemoteData } from '@/hooks/useRemoteData'
import { cn } from '@/lib/utils'
import {
  listNotifications,
  markAsRead,
  markAsUnread,
  type Notification,
  type NotificationType,
  softDeleteNotification,
} from '@/services/notifications'

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

function formatDate(iso: string, t: TFunction, locale: string): string {
  try {
    const date = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return t('notifications:time.justNow')
    if (diffMins < 60) return t('notifications:time.minutesAgo', { count: diffMins })
    if (diffHours < 24) return t('notifications:time.hoursAgo', { count: diffHours })
    if (diffDays < 7) return t('notifications:time.daysAgo', { count: diffDays })
    return date.toLocaleDateString(locale)
  } catch {
    return iso
  }
}

export function NotificationsInboxPage() {
  const { t, i18n } = useTranslation(['notifications', 'common'])
  useDocumentTitle(t('notifications:title'))
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null)
  const limit = 20

  const load = useCallback(() => listNotifications(page, limit), [page])
  const remote = useRemoteData(load, { queryKey: ['notifications', 'inbox', page] })

  const notifications: Notification[] = remote.status === 'success' ? remote.data.data : []
  const total = remote.status === 'success' ? remote.data.meta.total : 0
  const totalPages = remote.status === 'success' ? remote.data.meta.totalPages : 1

  const filteredNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id)
      toast.success(t('notifications:toast.markedRead'))
      void remote.refetch()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('notifications:toast.couldNotMarkRead'),
      )
    }
  }

  const handleMarkAsUnread = async (id: string) => {
    try {
      await markAsUnread(id)
      toast.success(t('notifications:toast.markedUnread'))
      void remote.refetch()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('notifications:toast.couldNotMarkUnread'),
      )
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
      toast.success(t('notifications:toast.deleted'))
      setDeleteDialogOpen(false)
      setNotificationToDelete(null)
      void remote.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('notifications:toast.couldNotDelete'))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        className="mb-0"
        title={t('notifications:title')}
        description={t('notifications:description')}
      />

      <div className={STAT_GRID_CLASS}>
        <StatCard icon={Bell} label={t('notifications:total')} value={total} />
        <StatCard icon={BellOff} label={t('notifications:unread')} value={unreadCount} />
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          {t('notifications:allWithCount', { count: notifications.length })}
        </Button>
        <Button
          variant={filter === 'unread' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('unread')}
        >
          {t('notifications:unreadWithCount', { count: unreadCount })}
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
                {filter === 'unread' ? t('notifications:emptyUnread') : t('notifications:emptyAll')}
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
                    !notification.isRead && 'border-s-4 border-s-primary bg-primary/5',
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
                          <p className="mt-1 text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                          {notification.sender && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {t('notifications:from', { email: notification.sender.email })}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="whitespace-nowrap text-xs">
                            {formatDate(notification.createdAt, t, i18n.language)}
                          </Badge>
                          {!notification.isRead ? (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => void handleMarkAsRead(notification.id)}
                              title={t('notifications:markAsRead')}
                              aria-label={t('notifications:markAsRead')}
                            >
                              <Check className="size-4" />
                            </Button>
                          ) : (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => void handleMarkAsUnread(notification.id)}
                              title={t('notifications:markAsUnread')}
                              aria-label={t('notifications:markAsUnread')}
                            >
                              <X className="size-4" />
                            </Button>
                          )}
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => handleDeleteClick(notification.id)}
                            title={t('common:delete')}
                            aria-label={t('common:delete')}
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
              {t('notifications:pagination', { page, totalPages, total })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t('common:previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('common:next')}
              </Button>
            </div>
          </div>
        )}
      </AsyncState>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('notifications:delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('notifications:delete.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDeleteConfirm()}>
              {t('common:delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
