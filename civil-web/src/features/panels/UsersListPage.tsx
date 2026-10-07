import { Plus, Users as UsersIcon, UserCheck, UserX, Shield, Pencil, Trash2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useRemoteData } from '@/hooks/useRemoteData'
import {
  type User,
  type UserRole,
  type UserStatus,
  type CreateUserInput,
  type UpdateUserInput,
  listUsers,
  createUser,
  updateUser,
  deactivateUser,
} from '@/services/users'

function getRoleColor(role: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (role) {
    case 'SUPER':
      return 'destructive'
    case 'ADMIN':
      return 'default'
    case 'PROVIDER':
      return 'secondary'
    default:
      return 'outline'
  }
}

function getStatusColor(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  return status === 'ACTIVE' ? 'default' : 'outline'
}

function getUserDisplayName(user: User): string {
  if (user.profile?.displayName) return user.profile.displayName
  if (user.profile?.firstName || user.profile?.lastName) {
    return [user.profile.firstName, user.profile.lastName].filter(Boolean).join(' ')
  }
  return user.email
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString()
  } catch {
    return iso
  }
}

export function UsersListPage() {
  useDocumentTitle('Users')
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const limit = 20

  const load = useCallback(() => listUsers(page, limit), [page])
  const remote = useRemoteData(load)

  const users: User[] = remote.status === 'success' ? remote.data.data : []
  const total = remote.status === 'success' ? remote.data.meta.total : 0
  const totalPages = remote.status === 'success' ? remote.data.meta.totalPages : 1

  const activeCount = users.filter((u) => u.status === 'ACTIVE').length
  const inactiveCount = users.filter((u) => u.status === 'INACTIVE').length
  const adminCount = users.filter((u) => u.role === 'ADMIN' || u.role === 'SUPER').length

  // Create user dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [createData, setCreateData] = useState<CreateUserInput>({
    email: '',
    password: '',
    role: 'CLIENT',
  })
  const [isCreating, setIsCreating] = useState(false)

  // Edit user dialog state
  const [editOpen, setEditOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editData, setEditData] = useState<UpdateUserInput>({})
  const [isEditing, setIsEditing] = useState(false)

  // Delete confirmation state
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleCreateOpen = () => {
    setCreateData({
      email: '',
      password: '',
      role: 'CLIENT',
    })
    setCreateOpen(true)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!createData.email || !createData.password) {
      toast.error('Email and password are required')
      return
    }

    if (createData.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setIsCreating(true)
    try {
      await createUser(createData)
      toast.success('User created successfully')
      setCreateOpen(false)
      void remote.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create user')
    } finally {
      setIsCreating(false)
    }
  }

  const handleEditOpen = (user: User) => {
    setEditingUser(user)
    setEditData({
      role: user.role,
      status: user.status,
      firstName: user.profile?.firstName || undefined,
      lastName: user.profile?.lastName || undefined,
      displayName: user.profile?.displayName || undefined,
      phone: user.profile?.phone || undefined,
    })
    setEditOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setIsEditing(true)
    try {
      await updateUser(editingUser.id, editData)
      toast.success('User updated successfully')
      setEditOpen(false)
      void remote.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update user')
    } finally {
      setIsEditing(false)
    }
  }

  const handleDeleteOpen = (user: User) => {
    setDeletingUser(user)
    setDeleteOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return

    setIsDeleting(true)
    try {
      await deactivateUser(deletingUser.id)
      toast.success('User deactivated successfully')
      setDeleteOpen(false)
      void remote.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to deactivate user')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">Manage user accounts and permissions.</p>
        </div>
        <Button onClick={handleCreateOpen}>
          <Plus className="size-4" />
          Add User
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-3xl">{total}</CardTitle>
          </CardHeader>
          <CardContent>
            <UsersIcon className="size-4 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-3xl">{activeCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <UserCheck className="size-4 text-green-600" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Inactive</CardDescription>
            <CardTitle className="text-3xl">{inactiveCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <UserX className="size-4 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Admins</CardDescription>
            <CardTitle className="text-3xl">{adminCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <Shield className="size-4 text-blue-600" />
          </CardContent>
        </Card>
      </div>

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
      >
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow
                    key={user.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/admin/users/${user.id}`)}
                  >
                    <TableCell className="font-medium">{getUserDisplayName(user)}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleColor(user.role)}>{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(user.status)}>{user.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditOpen(user)
                          }}
                        >
                          <Pencil className="size-3" />
                          Edit
                        </Button>
                        {user.status === 'ACTIVE' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteOpen(user)
                            }}
                          >
                            <Trash2 className="size-3" />
                            Deactivate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </AsyncState>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>Add a new user to the system with their account details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field required>
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={createData.email}
                  onChange={(e) => setCreateData({ ...createData, email: e.target.value })}
                  placeholder="user@example.com"
                  maxLength={255}
                  required
                />
              </Field>
              <Field required>
                <Label htmlFor="create-password">Password</Label>
                <Input
                  id="create-password"
                  type="password"
                  value={createData.password}
                  onChange={(e) => setCreateData({ ...createData, password: e.target.value })}
                  placeholder="Min. 8 characters"
                  minLength={8}
                  maxLength={100}
                  required
                />
              </Field>
              <Field>
                <Label htmlFor="create-role">Role</Label>
                <Select
                  value={createData.role}
                  onValueChange={(value) => setCreateData({ ...createData, role: value as UserRole })}
                >
                  <SelectTrigger id="create-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLIENT">CLIENT</SelectItem>
                    <SelectItem value="WORKER">WORKER</SelectItem>
                    <SelectItem value="MANAGER">MANAGER</SelectItem>
                    <SelectItem value="PROVIDER">PROVIDER</SelectItem>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                    <SelectItem value="SUPER">SUPER</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <Label htmlFor="create-firstName">First Name</Label>
                <Input
                  id="create-firstName"
                  value={createData.firstName || ''}
                  onChange={(e) => setCreateData({ ...createData, firstName: e.target.value })}
                  placeholder="John"
                  maxLength={100}
                />
              </Field>
              <Field>
                <Label htmlFor="create-lastName">Last Name</Label>
                <Input
                  id="create-lastName"
                  value={createData.lastName || ''}
                  onChange={(e) => setCreateData({ ...createData, lastName: e.target.value })}
                  placeholder="Doe"
                  maxLength={100}
                />
              </Field>
              <Field>
                <Label htmlFor="create-displayName">Display Name</Label>
                <Input
                  id="create-displayName"
                  value={createData.displayName || ''}
                  onChange={(e) => setCreateData({ ...createData, displayName: e.target.value })}
                  placeholder="John D."
                  maxLength={120}
                />
              </Field>
              <Field>
                <Label htmlFor="create-phone">Phone</Label>
                <Input
                  id="create-phone"
                  type="tel"
                  value={createData.phone || ''}
                  onChange={(e) => setCreateData({ ...createData, phone: e.target.value })}
                  placeholder="+1 234 567 8900"
                  maxLength={20}
                />
              </Field>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user account and profile information.</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <Label>Email</Label>
                  <Input value={editingUser.email} disabled />
                </Field>
                <Field>
                  <Label htmlFor="edit-role">Role</Label>
                  <Select
                    value={editData.role}
                    onValueChange={(value) => setEditData({ ...editData, role: value as UserRole })}
                  >
                    <SelectTrigger id="edit-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CLIENT">CLIENT</SelectItem>
                      <SelectItem value="WORKER">WORKER</SelectItem>
                      <SelectItem value="MANAGER">MANAGER</SelectItem>
                      <SelectItem value="PROVIDER">PROVIDER</SelectItem>
                      <SelectItem value="ADMIN">ADMIN</SelectItem>
                      <SelectItem value="SUPER">SUPER</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={editData.status}
                    onValueChange={(value) => setEditData({ ...editData, status: value as UserStatus })}
                  >
                    <SelectTrigger id="edit-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <Label htmlFor="edit-firstName">First Name</Label>
                  <Input
                    id="edit-firstName"
                    value={editData.firstName || ''}
                    onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                    placeholder="John"
                    maxLength={100}
                  />
                </Field>
                <Field>
                  <Label htmlFor="edit-lastName">Last Name</Label>
                  <Input
                    id="edit-lastName"
                    value={editData.lastName || ''}
                    onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                    placeholder="Doe"
                    maxLength={100}
                  />
                </Field>
                <Field>
                  <Label htmlFor="edit-displayName">Display Name</Label>
                  <Input
                    id="edit-displayName"
                    value={editData.displayName || ''}
                    onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                    placeholder="John D."
                    maxLength={120}
                  />
                </Field>
                <Field>
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    type="tel"
                    value={editData.phone || ''}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    placeholder="+1 234 567 8900"
                    maxLength={20}
                  />
                </Field>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                  disabled={isEditing}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isEditing}>
                  {isEditing ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <strong>{deletingUser?.email}</strong>? The user will no
              longer be able to log in to the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDeleteConfirm()} disabled={isDeleting}>
              {isDeleting ? 'Deactivating...' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
