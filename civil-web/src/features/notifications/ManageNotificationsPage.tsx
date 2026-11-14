import { useCallback, useEffect, useState } from 'react'
import {
  Bell,
  Edit,
  Mail,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  User as UserIcon,
  Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { StatGridSkeleton, TableSkeleton } from '@/components/feedback/skeletons'
import { PageHeader, STAT_GRID_CLASS, StatCard, TablePager } from '@/components/layout'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useLocaleFormat } from '@/hooks/useLocaleFormat'
import { useRemoteData } from '@/hooks/useRemoteData'
import { cn } from '@/lib/utils'
import {
  broadcastNotification,
  createNotification,
  hardDeleteNotification,
  listNotifications,
  type Notification,
  type NotificationType,
  restoreNotification,
  softDeleteNotification,
  updateNotification,
} from '@/services/notifications'
import { listUserLookups, type UserLookup } from '@/services/users'

type CreateMode = 'single' | 'broadcast'

const NOTIFICATION_TYPE_VALUES: NotificationType[] = [
  'INFO',
  'SUCCESS',
  'WARNING',
  'ERROR',
  'ANNOUNCEMENT',
  'SYSTEM',
]

function userLabel(user: UserLookup): string {
  return user.name ? `${user.name} · ${user.email}` : user.email
}

export function ManageNotificationsPage() {
  const { t } = useTranslation(['admin', 'common'])
  const { formatDateTime } = useLocaleFormat()
  useDocumentTitle(t('admin:notificationsAdmin.documentTitle'))
  const notificationTypeOptions = NOTIFICATION_TYPE_VALUES.map((value) => ({
    value,
    label: t(`admin:notificationType.${value}`),
  }))
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [hardDeleteDialogOpen, setHardDeleteDialogOpen] = useState(false)
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null)
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null)
  const [createMode, setCreateMode] = useState<CreateMode>('single')
  const [isSending, setIsSending] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const [lookupQuery, setLookupQuery] = useState('')
  const [debouncedLookup, setDebouncedLookup] = useState('')

  const limit = 20

  const load = useCallback(() => listNotifications(page, limit, true), [page])
  const remote = useRemoteData(load, { queryKey: ['notifications', 'admin', page] })
  const loadUsers = useCallback(
    () => listUserLookups(1, 20, debouncedLookup || undefined),
    [debouncedLookup],
  )
  const usersRemote = useRemoteData(loadUsers, {
    enabled: createOpen,
    queryKey: ['users', 'lookup', debouncedLookup],
  })

  const notifications: Notification[] = remote.status === 'success' ? remote.data.data : []
  const total = remote.status === 'success' ? remote.data.meta.total : 0
  const counts = remote.status === 'success' ? remote.data.meta.counts : null
  const totalPages = Math.max(1, remote.status === 'success' ? remote.data.meta.totalPages : 1)
  const users: UserLookup[] = usersRemote.status === 'success' ? usersRemote.data.data : []

  function receiverLabel(notification: Notification): string {
    const receiver = notification.receiver
    if (!receiver) return t('common:unknown')
    return receiver.name ? `${receiver.name} · ${receiver.email}` : receiver.email
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedLookup(lookupQuery.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [lookupQuery])

  const [formData, setFormData] = useState({
    receiverId: '',
    receiverIds: [] as string[],
    type: 'INFO' as NotificationType,
    title: '',
    message: '',
  })

  const handleCreateOpen = () => {
    setLookupQuery('')
    setDebouncedLookup('')
    setFormData({
      receiverId: '',
      receiverIds: [],
      type: 'INFO',
      title: '',
      message: '',
    })
    setCreateMode('single')
    setCreateOpen(true)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error(t('admin:notificationsAdmin.titleMessageRequired'))
      return
    }

    if (createMode === 'single' && !formData.receiverId) {
      toast.error(t('admin:notificationsAdmin.selectReceiver'))
      return
    }

    if (createMode === 'broadcast' && formData.receiverIds.length === 0) {
      toast.error(t('admin:notificationsAdmin.selectReceivers'))
      return
    }

    setIsSending(true)
    try {
      if (createMode === 'single') {
        await createNotification({
          receiverId: formData.receiverId,
          type: formData.type,
          title: formData.title,
          message: formData.message,
        })
        toast.success(t('admin:notificationsAdmin.sentToast'))
      } else {
        const result = await broadcastNotification({
          receiverIds: formData.receiverIds,
          type: formData.type,
          title: formData.title,
          message: formData.message,
        })
        toast.success(
          t('admin:notificationsAdmin.sentBroadcastToast', { count: result.data.count }),
        )
      }
      setCreateOpen(false)
      void remote.refetch()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('admin:notificationsAdmin.couldNotSend'),
      )
    } finally {
      setIsSending(false)
    }
  }

  const handleEditOpen = (notification: Notification) => {
    setEditingNotification(notification)
    setFormData({
      receiverId: notification.receiverId,
      receiverIds: [],
      type: notification.type,
      title: notification.title,
      message: notification.message,
    })
    setEditOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingNotification) return

    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error(t('admin:notificationsAdmin.titleMessageRequired'))
      return
    }

    setIsUpdating(true)
    try {
      await updateNotification(editingNotification.id, {
        title: formData.title,
        message: formData.message,
        type: formData.type,
      })
      toast.success(t('admin:notificationsAdmin.updated'))
      setEditOpen(false)
      void remote.refetch()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('admin:notificationsAdmin.couldNotUpdate'),
      )
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSoftDelete = async (id: string) => {
    setNotificationToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleSoftDeleteConfirm = async () => {
    if (!notificationToDelete) return
    try {
      await softDeleteNotification(notificationToDelete)
      toast.success(t('admin:notificationsAdmin.softDeletedToast'))
      setDeleteDialogOpen(false)
      setNotificationToDelete(null)
      void remote.refetch()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('admin:notificationsAdmin.couldNotDelete'),
      )
    }
  }

  const handleHardDelete = async (id: string) => {
    setNotificationToDelete(id)
    setHardDeleteDialogOpen(true)
  }

  const handleHardDeleteConfirm = async () => {
    if (!notificationToDelete) return
    try {
      await hardDeleteNotification(notificationToDelete)
      toast.success(t('admin:notificationsAdmin.hardDeletedToast'))
      setHardDeleteDialogOpen(false)
      setNotificationToDelete(null)
      void remote.refetch()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('admin:notificationsAdmin.couldNotDelete'),
      )
    }
  }

  const handleRestore = async (id: string) => {
    try {
      await restoreNotification(id)
      toast.success(t('admin:notificationsAdmin.restored'))
      void remote.refetch()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('admin:notificationsAdmin.couldNotRestore'),
      )
    }
  }

  const handleToggleRecipient = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      receiverIds: prev.receiverIds.includes(userId)
        ? prev.receiverIds.filter((id) => id !== userId)
        : [...prev.receiverIds, userId],
    }))
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        className="mb-0"
        title={t('admin:notificationsAdmin.title')}
        description={t('admin:notificationsAdmin.description')}
        actions={
          <Button onClick={handleCreateOpen}>
            <Plus className="size-4" />
            {t('admin:notificationsAdmin.sendNotification')}
          </Button>
        }
      />

      {counts ? (
        <div className={STAT_GRID_CLASS}>
          <StatCard icon={Bell} label={t('admin:notificationsAdmin.metricTotal')} value={total} />
          <StatCard
            icon={Send}
            label={t('admin:notificationsAdmin.metricActive')}
            value={counts.active}
          />
          <StatCard
            icon={Mail}
            label={t('admin:notificationsAdmin.metricUnread')}
            value={counts.unread}
          />
          <StatCard
            icon={Trash2}
            label={t('admin:notificationsAdmin.metricDeleted')}
            value={counts.deleted}
          />
        </div>
      ) : remote.isLoading ? (
        <StatGridSkeleton count={4} />
      ) : null}

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<TableSkeleton columns={6} />}
      >
        <Card>
          <CardHeader>
            <CardTitle>{t('admin:notificationsAdmin.listTitle')}</CardTitle>
            <CardDescription>{t('admin:notificationsAdmin.listDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin:notificationsAdmin.headers.type')}</TableHead>
                  <TableHead>{t('admin:notificationsAdmin.headers.title')}</TableHead>
                  <TableHead>{t('admin:notificationsAdmin.headers.receiver')}</TableHead>
                  <TableHead>{t('admin:notificationsAdmin.headers.status')}</TableHead>
                  <TableHead>{t('admin:notificationsAdmin.headers.created')}</TableHead>
                  <TableHead className="text-right">{t('common:actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      {t('admin:notificationsAdmin.noMatch')}
                    </TableCell>
                  </TableRow>
                ) : (
                  notifications.map((notification) => (
                    <TableRow
                      key={notification.id}
                      className={cn(notification.deletedAt && 'opacity-50')}
                    >
                      <TableCell>
                        <Badge variant="outline">
                          {t(`admin:notificationType.${notification.type}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate font-medium">
                        {notification.title}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {receiverLabel(notification)}
                      </TableCell>
                      <TableCell>
                        {notification.deletedAt ? (
                          <Badge variant="destructive">{t('common:deleted')}</Badge>
                        ) : notification.isRead ? (
                          <Badge variant="secondary">{t('common:read')}</Badge>
                        ) : (
                          <Badge variant="default">{t('common:unread')}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDateTime(notification.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {notification.deletedAt ? (
                            <>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => void handleRestore(notification.id)}
                                title={t('admin:notificationsAdmin.restoreAction')}
                              >
                                <RotateCcw className="size-4" />
                              </Button>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => handleHardDelete(notification.id)}
                                title={t('admin:notificationsAdmin.hardDelete')}
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => handleEditOpen(notification)}
                                title={t('admin:notificationsAdmin.editAction')}
                              >
                                <Edit className="size-4" />
                              </Button>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => void handleSoftDelete(notification.id)}
                                title={t('admin:notificationsAdmin.softDeleteAction')}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="mt-4">
              <TablePager
                page={page}
                totalPages={totalPages}
                total={total}
                onPageChange={setPage}
              />
            </div>
          </CardContent>
        </Card>
      </AsyncState>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('admin:notificationsAdmin.createTitle')}</DialogTitle>
            <DialogDescription>{t('admin:notificationsAdmin.createDescription')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={createMode === 'single' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCreateMode('single')}
              >
                <UserIcon className="size-4" />
                {t('admin:notificationsAdmin.single')}
              </Button>
              <Button
                type="button"
                variant={createMode === 'broadcast' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCreateMode('broadcast')}
              >
                <Users className="size-4" />
                {t('admin:notificationsAdmin.broadcastMode')}
              </Button>
            </div>

            <Field>
              <Label htmlFor="user-search">{t('admin:notificationsAdmin.findUser')}</Label>
              <Input
                id="user-search"
                value={lookupQuery}
                onChange={(event) => setLookupQuery(event.target.value)}
                placeholder={t('admin:notificationsAdmin.userSearchPlaceholder')}
              />
            </Field>

            {usersRemote.isError ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 px-3 py-2">
                <p className="text-sm text-destructive">
                  {t('admin:notificationsAdmin.couldNotLoadUsers')}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void usersRemote.refetch()}
                >
                  {t('common:retry')}
                </Button>
              </div>
            ) : usersRemote.isLoading ? (
              <p className="text-sm text-muted-foreground">
                {t('admin:notificationsAdmin.loadingUsers')}
              </p>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('admin:notificationsAdmin.noUsersMatch')}
              </p>
            ) : createMode === 'single' ? (
              <Field>
                <Label htmlFor="receiverId">{t('admin:notificationsAdmin.receiver')}</Label>
                <Select
                  items={users.map((user) => ({ value: user.id, label: userLabel(user) }))}
                  value={formData.receiverId}
                  onValueChange={(value) => {
                    if (value) setFormData({ ...formData, receiverId: value })
                  }}
                >
                  <SelectTrigger id="receiverId">
                    <SelectValue placeholder={t('admin:notificationsAdmin.selectUser')} />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {userLabel(user)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : (
              <Field>
                <Label>
                  {t('admin:notificationsAdmin.recipientsSelected', {
                    count: formData.receiverIds.length,
                  })}
                </Label>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                  {users.map((user) => (
                    <label
                      key={user.id}
                      className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-muted"
                    >
                      <Checkbox
                        checked={formData.receiverIds.includes(user.id)}
                        onCheckedChange={() => handleToggleRecipient(user.id)}
                      />
                      <span className="text-sm">{userLabel(user)}</span>
                    </label>
                  ))}
                </div>
                {usersRemote.status === 'success' && usersRemote.data.meta.total > users.length ? (
                  <p className="text-xs text-muted-foreground">
                    {t('admin:notificationsAdmin.showingUsers', {
                      shown: users.length,
                      total: usersRemote.data.meta.total,
                    })}
                  </p>
                ) : null}
              </Field>
            )}

            <Field>
              <Label htmlFor="type">{t('common:type')}</Label>
              <Select
                items={notificationTypeOptions}
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value as NotificationType })
                }
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {notificationTypeOptions.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <Label htmlFor="title">{t('admin:notificationsAdmin.titleLabel')}</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t('admin:notificationsAdmin.titlePlaceholder')}
                maxLength={200}
                required
              />
            </Field>

            <Field>
              <Label htmlFor="message">{t('admin:notificationsAdmin.messageLabel')}</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder={t('admin:notificationsAdmin.messagePlaceholder')}
                maxLength={2000}
                rows={4}
                required
              />
            </Field>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={isSending}
              >
                {t('common:cancel')}
              </Button>
              <Button type="submit" disabled={isSending}>
                <Send className="size-4" />
                {isSending ? t('common:sending') : t('admin:notificationsAdmin.sendNotification')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin:notificationsAdmin.editTitle')}</DialogTitle>
            <DialogDescription>{t('admin:notificationsAdmin.editDescription')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <Field>
              <Label htmlFor="edit-type">{t('common:type')}</Label>
              <Select
                items={notificationTypeOptions}
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value as NotificationType })
                }
              >
                <SelectTrigger id="edit-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {notificationTypeOptions.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <Label htmlFor="edit-title">{t('admin:notificationsAdmin.titleLabel')}</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t('admin:notificationsAdmin.titlePlaceholder')}
                maxLength={200}
                required
              />
            </Field>

            <Field>
              <Label htmlFor="edit-message">{t('admin:notificationsAdmin.messageLabel')}</Label>
              <Textarea
                id="edit-message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder={t('admin:notificationsAdmin.messagePlaceholder')}
                maxLength={2000}
                rows={4}
                required
              />
            </Field>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={isUpdating}
              >
                {t('common:cancel')}
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? t('common:updating') : t('common:update')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin:notificationsAdmin.softDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin:notificationsAdmin.softDeleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleSoftDeleteConfirm()}>
              {t('admin:notificationsAdmin.softDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={hardDeleteDialogOpen} onOpenChange={setHardDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin:notificationsAdmin.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin:notificationsAdmin.deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleHardDeleteConfirm()}
              className="bg-destructive text-destructive-foreground"
            >
              {t('admin:notificationsAdmin.hardDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
