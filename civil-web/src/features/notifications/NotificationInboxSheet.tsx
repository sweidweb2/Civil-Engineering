import { Bell } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

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

import { NotificationRow } from './NotificationRow'
import { canFollowNotificationHref, portalNotificationsPath } from './notification-utils'
import { sortNotifications, unreadCount, useNotificationsStore } from './notificationsStore'
import type { AppNotification } from './notifications.types'

const SHEET_LIMIT = 8

export function NotificationInboxSheet() {
  const location = useLocation()
  const navigate = useNavigate()
  const items = useNotificationsStore((state) => state.items)
  const markRead = useNotificationsStore((state) => state.markRead)
  const markAllRead = useNotificationsStore((state) => state.markAllRead)
  const [open, setOpen] = useState(false)

  const unread = unreadCount(items)
  const latest = useMemo(() => sortNotifications(items).slice(0, SHEET_LIMIT), [items])
  const inboxPath = portalNotificationsPath(location.pathname)

  function openItem(item: AppNotification) {
    markRead(item.id)
    setOpen(false)
    if (canFollowNotificationHref(location.pathname, item.href) && item.href) {
      navigate(item.href)
      return
    }
    navigate(inboxPath)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
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
        <SheetHeader className="border-b border-border">
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>
            {unread === 0 ? 'You are up to date.' : `${unread} unread`}
          </SheetDescription>
        </SheetHeader>
        <div className="flex items-center justify-end px-4 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={unread === 0}
            onClick={() => {
              markAllRead()
              toast.message('All notifications marked as read (UI only)')
            }}
          >
            Mark all as read
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {latest.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {latest.map((item) => (
                <NotificationRow key={item.id} item={item} compact onOpen={openItem} />
              ))}
            </div>
          )}
        </div>
        <SheetFooter className="border-t border-border">
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
