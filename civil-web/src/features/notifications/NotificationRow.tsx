import { Circle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { formatNotificationTime, notificationIcon } from './notification-utils'
import type { AppNotification } from './notifications.types'

type NotificationRowProps = {
  item: AppNotification
  compact?: boolean
  onOpen: (item: AppNotification) => void
  onToggleRead?: (item: AppNotification) => void
}

export function NotificationRow({ item, compact = false, onOpen, onToggleRead }: NotificationRowProps) {
  const Icon = notificationIcon(item.kind)
  const isUnread = !item.readAt

  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-3',
        compact ? 'items-start' : 'items-start sm:items-center',
        isUnread ? 'bg-muted/50' : 'bg-card',
      )}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 gap-3 text-left"
        onClick={() => onOpen(item)}
      >
        <span
          className={cn(
            'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-primary',
            compact && 'size-8',
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start gap-2">
            <span
              className={cn(
                'min-w-0 truncate text-sm',
                isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground',
              )}
            >
              {item.title}
            </span>
            {isUnread ? (
              <Circle className="mt-1 size-2 shrink-0 fill-primary text-primary" aria-label="Unread" />
            ) : null}
          </span>
          <span className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{item.body}</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {formatNotificationTime(item.createdAt)}
          </span>
        </span>
      </button>
      {onToggleRead ? (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="shrink-0 self-start"
          onClick={() => onToggleRead(item)}
        >
          {isUnread ? 'Mark read' : 'Mark unread'}
        </Button>
      ) : null}
    </div>
  )
}
