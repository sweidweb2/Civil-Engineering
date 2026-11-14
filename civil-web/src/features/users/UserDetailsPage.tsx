import { useTranslation } from 'react-i18next'
import { useCallback, useMemo, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
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
import { useRemoteData } from '@/hooks/useRemoteData'
import { portalBaseFromPath } from '@/lib/homePath'
import { ApiError } from '@/services/api'
import { toastApiError } from '@/services/toast'
import { deactivateUser, getUser, updateUser } from '@/services/users'

import { UserFormDialog } from './components/UserFormDialog'
import { formatWhen } from './lib/text'
import { formFromUser, toAdminUserRow, type UserFormValues } from './users.rows'

export function UserDetailsPage() {
  const { t } = useTranslation(['admin', 'common'])
  const { userId } = useParams<{ userId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const usersPath = `${portalBaseFromPath(location.pathname)}/users`
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const load = useCallback(async () => {
    if (!userId) throw new Error(t('admin:users.userNotFound'))
    const result = await getUser(userId)
    return toAdminUserRow(result.data)
  }, [userId, t])
  const remote = useRemoteData(load, {
    enabled: Boolean(userId),
    queryKey: ['users', 'detail', userId ?? ''],
  })
  const user = remote.status === 'success' ? remote.data : undefined

  useDocumentTitle(user ? user.email : t('admin:users.detailsTitle'))

  const breadcrumbs = [
    { label: t('admin:users.documentTitle'), to: usersPath },
    { label: user?.email ?? t('admin:users.detailsTitle') },
  ]

  const fields = useMemo(() => {
    if (!user) return null
    return [
      { label: t('admin:users.fields.email'), value: user.email },
      { label: t('admin:users.fields.role'), value: t(`admin:roles.${user.role}`) },
      { label: t('admin:users.fields.status'), value: t(`admin:userStatus.${user.status}`) },
      {
        label: t('admin:users.fields.verified'),
        value: user.isVerified ? t('common:yes') : t('common:no'),
      },
      { label: t('admin:users.fields.userCreated'), value: formatWhen(user.createdAt) },
      { label: t('admin:users.fields.userUpdated'), value: formatWhen(user.updatedAt) },
      { label: t('admin:users.fields.firstName'), value: user.profile.firstName ?? '—' },
      { label: t('admin:users.fields.lastName'), value: user.profile.lastName ?? '—' },
      { label: t('admin:users.fields.displayName'), value: user.profile.displayName ?? '—' },
      { label: t('admin:users.fields.phone'), value: user.profile.phone ?? '—' },
      { label: t('admin:users.fields.avatar'), value: user.profile.avatarUrl ?? '—' },
      { label: t('admin:users.fields.profileCreated'), value: formatWhen(user.profile.createdAt) },
      { label: t('admin:users.fields.profileUpdated'), value: formatWhen(user.profile.updatedAt) },
    ]
  }, [user, t])

  async function onSave(values: UserFormValues): Promise<string | null> {
    if (!user) return t('admin:users.userNotFound')
    try {
      await updateUser(user.id, {
        role: values.role,
        status: values.status,
        firstName: values.firstName.trim() || undefined,
        lastName: values.lastName.trim() || undefined,
        displayName: values.displayName.trim() || undefined,
        phone: values.phone.trim() || undefined,
      })
      await remote.refetch()
      return null
    } catch (error) {
      if (error instanceof ApiError) return error.message
      return t('admin:users.couldNotUpdate')
    }
  }

  async function onDeactivate() {
    if (!user) return
    try {
      await deactivateUser(user.id)
      toast.success(t('admin:users.userDeactivated'))
      navigate(usersPath, { replace: true })
    } catch (error) {
      toastApiError(error, t('admin:users.couldNotDeactivate'))
    }
  }

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
                aria-label={t('admin:users.editUser', { email: user.email })}
                onClick={() => setEditOpen(true)}
              >
                <Pencil />
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="icon-sm"
                aria-label={t('admin:users.deactivateUser', { email: user.email })}
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
              <p className="text-sm text-muted-foreground">{t('admin:users.userNotFoundBody')}</p>
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
                      <dd className="break-all px-3 py-2.5 text-sm text-foreground">
                        {field.value}
                      </dd>
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
              onSave={onSave}
            />

            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('admin:users.deactivateThisTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('admin:users.deactivateThisDescription', { email: user.email })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={() => void onDeactivate()}>
                    {t('common:deactivate')}
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
