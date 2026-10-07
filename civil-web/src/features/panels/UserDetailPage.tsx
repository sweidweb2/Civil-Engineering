import { ArrowLeft, Mail, Phone, User as UserIcon, Calendar, Shield, Ban, Save } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useRemoteData } from '@/hooks/useRemoteData'
import {
  type User,
  type UserRole,
  type UserStatus,
  type UpdateUserInput,
  getUserById,
  updateUser,
  deactivateUser,
} from '@/services/users'

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

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

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const load = useCallback(() => {
    if (!id) throw new Error('User ID is required')
    return getUserById(id)
  }, [id])

  const remote = useRemoteData(load)
  const user: User | null = remote.status === 'success' ? remote.data.data : null

  useDocumentTitle(user ? `User: ${user.email}` : 'User Details')

  const [formData, setFormData] = useState<UpdateUserInput>({})

  const handleEdit = () => {
    if (!user) return
    setFormData({
      role: user.role,
      status: user.status,
      firstName: user.profile?.firstName || undefined,
      lastName: user.profile?.lastName || undefined,
      displayName: user.profile?.displayName || undefined,
      phone: user.profile?.phone || undefined,
    })
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFormData({})
  }

  const handleSave = async () => {
    if (!id || !user) return
    setIsSaving(true)
    try {
      await updateUser(id, formData)
      toast.success('User updated successfully')
      setIsEditing(false)
      void remote.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update user')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeactivate = async () => {
    if (!id) return
    try {
      await deactivateUser(id)
      toast.success('User deactivated successfully')
      void remote.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to deactivate user')
    }
  }

  if (!id) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground">User ID is required</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">User Details</h1>
            <p className="text-sm text-muted-foreground">View and manage user information.</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing && (
            <Button onClick={handleEdit}>Edit User</Button>
          )}
        </div>
      </div>

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
      >
        {user && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Basic account details and status.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Role</p>
                    {isEditing ? (
                      <Select
                        value={formData.role}
                        onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
                      >
                        <SelectTrigger className="mt-1 w-[200px]">
                          <SelectValue />
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
                    ) : (
                      <Badge variant={getRoleColor(user.role)}>{user.role}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <UserIcon className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    {isEditing ? (
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value as UserStatus })}
                      >
                        <SelectTrigger className="mt-1 w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                          <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={getStatusColor(user.status)}>{user.status}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-sm text-muted-foreground">{formatDateTime(user.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Updated</p>
                    <p className="text-sm text-muted-foreground">{formatDateTime(user.updatedAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Personal details and contact information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <Field>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName || ''}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        placeholder="First name"
                      />
                    </Field>
                    <Field>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName || ''}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        placeholder="Last name"
                      />
                    </Field>
                    <Field>
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        value={formData.displayName || ''}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        placeholder="Display name"
                      />
                    </Field>
                    <Field>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="Phone number"
                      />
                    </Field>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <UserIcon className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">First Name</p>
                        <p className="text-sm text-muted-foreground">
                          {user.profile?.firstName || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <UserIcon className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Last Name</p>
                        <p className="text-sm text-muted-foreground">
                          {user.profile?.lastName || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <UserIcon className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Display Name</p>
                        <p className="text-sm text-muted-foreground">
                          {user.profile?.displayName || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Phone</p>
                        <p className="text-sm text-muted-foreground">{user.profile?.phone || '—'}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {isEditing && (
              <Card className="md:col-span-2">
                <CardContent className="flex items-center justify-end gap-3 pt-6">
                  <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button onClick={() => void handleSave()} disabled={isSaving}>
                    <Save className="size-4" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {!isEditing && user.status === 'ACTIVE' && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Danger Zone</CardTitle>
                  <CardDescription>Irreversible and destructive actions.</CardDescription>
                </CardHeader>
                <CardContent>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Ban className="size-4" />
                        Deactivate User
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will deactivate the user account. The user will no longer be able to log in.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void handleDeactivate()}>
                          Deactivate
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </AsyncState>
    </div>
  )
}
