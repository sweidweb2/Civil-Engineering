import {
  Bell,
  Plus,
  Send,
  Trash2,
  RotateCcw,
  Edit,
  User as UserIcon,
  Users,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/layout/page-header'
import { STAT_GRID_CLASS, StatCard } from '@/components/layout/stat-card'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useRemoteData } from '@/hooks/useRemoteData'
import {
  type Notification,
  type NotificationType,
  listNotifications,
  createNotification,
  broadcastNotification,
  hardDeleteNotification,
  softDeleteNotification,
  restoreNotification,
  updateNotification,
} from '@/services/notifications'
import { listUsers, type User } from '@/services/users'
import { cn } from '@/lib/utils'

type CreateMode = 'single' | 'broadcast'

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function ManageNotificationsPage() {
  useDocumentTitle('Manage Notifications')
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

  const limit = 20

  const load = useCallback(() => listNotifications(page, limit, true), [page])
  const remote = useRemoteData(load)
  const loadUsers = useCallback(() => listUsers(1, 100), [])
  const usersRemote = useRemoteData(loadUsers)

  const notifications: Notification[] = remote.status === 'success' ? remote.data.data : []
  const total = remote.status === 'success' ? remote.data.meta.total : 0
  const totalPages = remote.status === 'success' ? remote.data.meta.totalPages : 1
  const users: User[] = usersRemote.status === 'success' ? usersRemote.data.data : []

  const [formData, setFormData] = useState({
    receiverId: '',
    receiverIds: [] as string[],
    type: 'INFO' as NotificationType,
    title: '',
    message: '',
  })

  const handleCreateOpen = () => {
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
      toast.error('Title and message are required')
      return
    }

    if (createMode === 'single' && !formData.receiverId) {
      toast.error('Please select a receiver')
      return
    }

    if (createMode === 'broadcast' && formData.receiverIds.length === 0) {
      toast.error('Please select at least one receiver')
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
        toast.success('Notification sent')
      } else {
        const result = await broadcastNotification({
          receiverIds: formData.receiverIds,
          type: formData.type,
          title: formData.title,
          message: formData.message,
        })
        toast.success(`Notification sent to ${result.data.count} users`)
      }
      setCreateOpen(false)
      void remote.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send notification')
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
      toast.error('Title and message are required')
      return
    }

    setIsUpdating(true)
    try {
      await updateNotification(editingNotification.id, {
        title: formData.title,
        message: formData.message,
        type: formData.type,
      })
      toast.success('Notification updated')
      setEditOpen(false)
      void remote.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update notification')
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
      toast.success('Notification soft deleted')
      setDeleteDialogOpen(false)
      setNotificationToDelete(null)
      void remote.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete notification')
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
      toast.success('Notification permanently deleted')
      setHardDeleteDialogOpen(false)
      setNotificationToDelete(null)
      void remote.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete notification')
    }
  }

  const handleRestore = async (id: string) => {
    try {
      await restoreNotification(id)
      toast.success('Notification restored')
      void remote.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to restore notification')
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
        title="Manage Notifications"
        description="Create and manage system notifications."
        actions={
          <Button onClick={handleCreateOpen}>
            <Plus className="size-4" />
            Send Notification
          </Button>
        }
      />

      <div className={STAT_GRID_CLASS}>
        <StatCard icon={Bell} label="Total Notifications" value={total} />
        <StatCard
          icon={Bell}
          label="Active"
          value={notifications.filter((n) => !n.deletedAt).length}
        />
        <StatCard
          icon={Trash2}
          label="Deleted"
          value={notifications.filter((n) => n.deletedAt).length}
        />
      </div>

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
      >
        <Card>
          <CardHeader>
            <CardTitle>All Notifications</CardTitle>
            <CardDescription>Manage all system notifications including deleted ones.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Receiver</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No notifications yet
                    </TableCell>
                  </TableRow>
                ) : (
                  notifications.map((notification) => (
                    <TableRow key={notification.id} className={cn(notification.deletedAt && 'opacity-50')}>
                      <TableCell>
                        <Badge variant="outline">{notification.type}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate font-medium">
                        {notification.title}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {users.find((u) => u.id === notification.receiverId)?.email || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {notification.deletedAt ? (
                          <Badge variant="destructive">Deleted</Badge>
                        ) : notification.isRead ? (
                          <Badge variant="secondary">Read</Badge>
                        ) : (
                          <Badge variant="default">Unread</Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(notification.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {notification.deletedAt ? (
                            <>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => void handleRestore(notification.id)}
                                title="Restore"
                              >
                                <RotateCcw className="size-4" />
                              </Button>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => handleHardDelete(notification.id)}
                                title="Permanently Delete"
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
                                title="Edit"
                              >
                                <Edit className="size-4" />
                              </Button>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => void handleSoftDelete(notification.id)}
                                title="Soft Delete"
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

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between gap-2">
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
          </CardContent>
        </Card>
      </AsyncState>

      {/* Create Notification Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Notification</DialogTitle>
            <DialogDescription>Create and send a notification to users.</DialogDescription>
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
                Single User
              </Button>
              <Button
                type="button"
                variant={createMode === 'broadcast' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCreateMode('broadcast')}
              >
                <Users className="size-4" />
                Broadcast
              </Button>
            </div>

            {createMode === 'single' ? (
              <Field>
                <Label htmlFor="receiverId">Receiver</Label>
                <Select
                  value={formData.receiverId}
                  onValueChange={(value) => {
                    if (value) setFormData({ ...formData, receiverId: value })
                  }}
                >
                  <SelectTrigger id="receiverId">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.email} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : (
              <Field>
                <Label>Recipients ({formData.receiverIds.length} selected)</Label>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                  {users.map((user) => (
                    <label key={user.id} className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-muted">
                      <input
                        type="checkbox"
                        checked={formData.receiverIds.includes(user.id)}
                        onChange={() => handleToggleRecipient(user.id)}
                        className="cursor-pointer"
                      />
                      <span className="text-sm">{user.email} ({user.role})</span>
                    </label>
                  ))}
                </div>
              </Field>
            )}

            <Field>
              <Label htmlFor="type">Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as NotificationType })}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INFO">Info</SelectItem>
                  <SelectItem value="SUCCESS">Success</SelectItem>
                  <SelectItem value="WARNING">Warning</SelectItem>
                  <SelectItem value="ERROR">Error</SelectItem>
                  <SelectItem value="ANNOUNCEMENT">Announcement</SelectItem>
                  <SelectItem value="SYSTEM">System</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Notification title"
                maxLength={200}
                required
              />
            </Field>

            <Field>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Notification message"
                maxLength={2000}
                rows={4}
                required
              />
            </Field>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={isSending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSending}>
                <Send className="size-4" />
                {isSending ? 'Sending...' : 'Send Notification'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Notification Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Notification</DialogTitle>
            <DialogDescription>Update notification details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <Field>
              <Label htmlFor="edit-type">Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as NotificationType })}>
                <SelectTrigger id="edit-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INFO">Info</SelectItem>
                  <SelectItem value="SUCCESS">Success</SelectItem>
                  <SelectItem value="WARNING">Warning</SelectItem>
                  <SelectItem value="ERROR">Error</SelectItem>
                  <SelectItem value="ANNOUNCEMENT">Announcement</SelectItem>
                  <SelectItem value="SYSTEM">System</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Notification title"
                maxLength={200}
                required
              />
            </Field>

            <Field>
              <Label htmlFor="edit-message">Message</Label>
              <Textarea
                id="edit-message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Notification message"
                maxLength={2000}
                rows={4}
                required
              />
            </Field>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={isUpdating}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? 'Updating...' : 'Update'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Soft Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Soft Delete Notification</AlertDialogTitle>
            <AlertDialogDescription>
              This notification will be hidden from the user but can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleSoftDeleteConfirm()}>
              Soft Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hard Delete Dialog */}
      <AlertDialog open={hardDeleteDialogOpen} onOpenChange={setHardDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Notification</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The notification will be permanently removed from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleHardDeleteConfirm()} className="bg-destructive text-destructive-foreground">
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
