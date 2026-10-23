import { useCallback, useState } from 'react'
import { AlertCircle, AlertTriangle, Bell, CheckCheck, Circle, Info, Megaphone, Settings } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { ListSkeleton } from '@/components/feedback/skeletons'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useRemoteData } from '@/hooks/useRemoteData'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'
import {
  getUnreadCount,
  listNotifications,
  markAllAsRead,
  markAsRead,
  type Notification,
  type NotificationType,
} from '@/services/notifications'

import { formatNotificationTime, portalNotificationsPath } from './notification-utils'

const SHEET_LIMIT = 8

function typeIcon(type: NotificationType) {
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

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError || error instanceof Error ? error.message : fallback
}

export function NotificationInboxSheet() {
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  const load = useCallback(async () => {
    const [page, unread] = await Promise.all([
      listNotifications(1, SHEET_LIMIT, false, true),
      getUnreadCount(),
    ])
    return { items: page.data, unread: unread.data.count }
  }, [])
  const remote = useRemoteData(load, { queryKey: ['notifications', 'inbox-sheet'] })

  const items = remote.status === 'success' ? remote.data.items : []
  const unread = remote.status === 'success' ? remote.data.unread : 0
  const inboxPath = portalNotificationsPath(location.pathname)

  async function openItem(item: Notification) {
    if (!item.isRead) {
      remote.mutate((current) => ({
        unread: Math.max(0, current.unread - 1),
        items: current.items.map((row) => (row.id === item.id ? { ...row, isRead: true } : row)),
      }))
      try {
        await markAsRead(item.id)
      } catch (error) {
        remote.mutate((current) => ({
          unread: current.unread + 1,
          items: current.items.map((row) => (row.id === item.id ? item : row)),
        }))
        toast.error(errorMessage(error, 'Could not mark notification as read'))
      }
    }
    setOpen(false)
    navigate(inboxPath)
  }

  async function handleMarkAll() {
    setIsMarkingAll(true)
    try {
      await markAllAsRead()
      toast.success('All notifications marked as read')
      await remote.refetch()
    } catch (error) {
      toast.error(errorMessage(error, 'Could not mark notifications as read'))
    } finally {
      setIsMarkingAll(false)
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) void remote.refetch()
      }}
    >
      <div className="relative">
        <SheetTrigger
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
          render={<Button variant="outline" size="icon" />}
        >
          <Bell />
        </SheetTrigger>
        {unread > 0 ? (
          <span className="pointer-events-none absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </div>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-6 py-5">
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>
            {unread === 0 ? 'You are up to date.' : `${unread} unread`}
          </SheetDescription>
        </SheetHeader>
        <div className="flex items-center justify-end px-6 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={unread === 0 || isMarkingAll}
            onClick={() => void handleMarkAll()}
          >
            Mark all as read
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <AsyncState
            isLoading={remote.isLoading && remote.status !== 'success'}
            error={remote.isError ? remote.error : undefined}
            onRetry={() => void remote.refetch()}
            loadingFallback={<ListSkeleton count={4} />}
          >
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No notifications yet.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {items.map((item) => {
                  const Icon = typeIcon(item.type)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={cn(
                        'flex w-full gap-3 px-4 py-3 text-left',
                        item.isRead ? 'bg-card' : 'bg-muted/50',
                      )}
                      onClick={() => void openItem(item)}
                    >
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start gap-2">
                          <span
                            className={cn(
                              'min-w-0 truncate text-sm text-foreground',
                              item.isRead ? 'font-medium' : 'font-semibold',
                            )}
                          >
                            {item.title}
                          </span>
                          {item.isRead ? null : (
                            <Circle className="mt-1 size-2 shrink-0 fill-primary text-primary" aria-label="Unread" />
                          )}
                        </span>
                        <span className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{item.message}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {formatNotificationTime(item.createdAt)}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </AsyncState>
        </div>
        <SheetFooter className="border-t border-border px-6 py-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setOpen(false)
              navigate(inboxPath)
            }}
          >
            View all notifications
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
