import { Bell, BellOff, CheckCheck, Inbox } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { DataPanel, ToolbarCard } from '@/components/layout/data-panel'
import { PageHeader } from '@/components/layout/page-header'
import { STAT_GRID_CLASS, StatCard } from '@/components/layout/stat-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

import { NotificationRow } from './NotificationRow'
import { canFollowNotificationHref, groupNotifications } from './notification-utils'
import { sortNotifications, unreadCount, useNotificationsStore } from './notificationsStore'
import type { AppNotification } from './notifications.types'

type InboxTab = 'all' | 'unread'

function matchesNotification(item: AppNotification, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [item.title, item.body, item.kind].join(' ').toLowerCase().includes(q)
}

export function NotificationsPage() {
  useDocumentTitle('Notifications')
  const location = useLocation()
  const navigate = useNavigate()
  const items = useNotificationsStore((state) => state.items)
  const markRead = useNotificationsStore((state) => state.markRead)
  const markUnread = useNotificationsStore((state) => state.markUnread)
  const markAllRead = useNotificationsStore((state) => state.markAllRead)
  const [tab, setTab] = useState<InboxTab>('all')
  const [query, setQuery] = useState('')

  const unread = unreadCount(items)
  const filtered = useMemo(() => {
    const scoped = sortNotifications(items).filter((item) =>
      tab === 'unread' ? !item.readAt : true,
    )
    return scoped.filter((item) => matchesNotification(item, query))
  }, [items, query, tab])
  const groups = useMemo(() => groupNotifications(filtered), [filtered])

  function openItem(item: AppNotification) {
    markRead(item.id)
    if (canFollowNotificationHref(location.pathname, item.href) && item.href) {
      navigate(item.href)
    }
  }

  function toggleRead(item: AppNotification) {
    if (item.readAt) {
      markUnread(item.id)
      toast.message('Marked unread (UI only)')
      return
    }
    markRead(item.id)
    toast.message('Marked read (UI only)')
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Notifications"
        description="Inbox of platform alerts. Mark as read or open the related page."
        actions={
          <Button
            type="button"
            variant="outline"
            disabled={unread === 0}
            onClick={() => {
              markAllRead()
              toast.message('All notifications marked as read (UI only)')
            }}
          >
            <CheckCheck />
            Mark all as read
          </Button>
        }
      />

      <div className={STAT_GRID_CLASS}>
        <StatCard icon={Inbox} label="All" value={items.length} />
        <StatCard icon={Bell} label="Unread" value={unread} />
        <StatCard icon={BellOff} label="Read" value={items.length - unread} />
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (value === 'all' || value === 'unread') setTab(value)
        }}
        className="min-w-0 gap-3"
      >
        <ToolbarCard>
          <TabsList>
            <TabsTrigger value="all">All ({items.length})</TabsTrigger>
            <TabsTrigger value="unread">Unread ({unread})</TabsTrigger>
          </TabsList>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter notifications…"
            aria-label="Filter notifications"
            className="max-w-sm"
          />
        </ToolbarCard>

        <TabsContent value={tab}>
          <DataPanel>
            {groups.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                {tab === 'unread' ? 'You are all caught up.' : 'No notifications match.'}
              </p>
            ) : (
              groups.map((group) => (
                <section key={group.label}>
                  <h2 className="border-b border-border bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
                    {group.label}
                  </h2>
                  <div className="divide-y divide-border">
                    {group.items.map((item) => (
                      <NotificationRow
                        key={item.id}
                        item={item}
                        onOpen={openItem}
                        onToggleRead={toggleRead}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </DataPanel>
        </TabsContent>
      </Tabs>
    </div>
  )
}
