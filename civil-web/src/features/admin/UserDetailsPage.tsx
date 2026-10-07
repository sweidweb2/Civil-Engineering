import { Pencil, Trash2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { DetailCardSkeleton } from '@/components/feedback/skeletons'
import { PageHeader } from '@/components/layout/page-header'
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
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { loadMock } from '@/hooks/loadMock'
import { useRemoteData } from '@/hooks/useRemoteData'
import { portalBaseFromPath } from '@/lib/homePath'

import { UserFormDialog } from './components/UserFormDialog'
import { formatWhen } from './lib/text'
import { formFromUser, useUsersStore } from './usersStore'

export function UserDetailsPage() {
  const { userId } = useParams<{ userId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const usersPath = `${portalBaseFromPath(location.pathname)}/users`
  const user = useUsersStore((state) => state.items.find((row) => row.id === userId))
  const updateUser = useUsersStore((state) => state.updateUser)
  const removeUser = useUsersStore((state) => state.removeUser)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const load = useCallback(() => loadMock(userId ?? ''), [userId])
  const remote = useRemoteData(load, { enabled: Boolean(userId) })

  useDocumentTitle(user ? user.email : 'User details')

  const breadcrumbs = [
    { label: 'Users', to: usersPath },
    { label: user?.email ?? 'User details' },
  ]

  const fields: Array<{ label: string; value: string }> | null = user
    ? [
        { label: 'Id', value: user.id },
        { label: 'Email', value: user.email },
        { label: 'Role', value: user.role },
        { label: 'Status', value: user.status },
        { label: 'Verified', value: user.isVerified ? 'Yes' : 'No' },
        { label: 'User created', value: formatWhen(user.createdAt) },
        { label: 'User updated', value: formatWhen(user.updatedAt) },
        { label: 'First name', value: user.profile.firstName ?? '—' },
        { label: 'Last name', value: user.profile.lastName ?? '—' },
        { label: 'Display name', value: user.profile.displayName ?? '—' },
        { label: 'Phone', value: user.profile.phone ?? '—' },
        { label: 'Avatar', value: user.profile.avatarUrl ?? '—' },
        { label: 'Profile created', value: formatWhen(user.profile.createdAt) },
        { label: 'Profile updated', value: formatWhen(user.profile.updatedAt) },
      ]
    : null

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        breadcrumbs={breadcrumbs}
        actions={
          user ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label={`Edit ${user.email}`}
                onClick={() => setEditOpen(true)}
              >
                <Pencil />
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="icon-sm"
                aria-label={`Delete ${user.email}`}
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 />
              </Button>
            </div>
          ) : null
        }
      />

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<DetailCardSkeleton />}
      >
        {!user ? (
          <Card size="sm" className="min-w-0">
            <CardContent>
              <p className="text-sm text-muted-foreground">No mock user matches this id.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card size="sm" className="min-w-0 gap-0 overflow-hidden py-0">
              <CardContent className="p-0">
                <dl className="grid min-w-0 sm:grid-cols-2">
                  {fields!.map((field) => (
                    <div
                      key={field.label}
                      className="grid min-w-0 grid-cols-[minmax(0,8rem)_minmax(0,1fr)] border-b border-border sm:odd:border-r"
                    >
                      <dt className="bg-muted/50 px-3 py-2.5 text-xs font-medium text-muted-foreground">
                        {field.label}
                      </dt>
                      <dd className="break-all px-3 py-2.5 text-sm text-foreground">{field.value}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>

            <UserFormDialog
              open={editOpen}
              mode="edit"
              initial={formFromUser(user)}
              onOpenChange={setEditOpen}
              onSave={(values) => updateUser(user.id, values)}
            />

            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this user?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {user.email} will be removed from this UI list. Not persisted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => {
                      removeUser(user.id)
                      toast.message('User removed (UI only)')
                      navigate(usersPath, { replace: true })
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </AsyncState>
    </div>
  )
}
