import { useRef, useState } from 'react'
import { Download, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { DetailSkeleton } from '@/components/feedback/skeletons'
import { PageHeader } from '@/components/layout'
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
import { Button, buttonVariants } from '@/components/ui/button'
import { fileIdFromStorageKey } from '@/features/projects/lib/stage-file-key'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { usePermissions } from '@/hooks/usePermissions'
import { useRemoteData } from '@/hooks/useRemoteData'
import { portalBaseFromPath } from '@/lib/homePath'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'
import {
  canCancelDesignRequest,
  canDeleteDesignRequest,
  deleteDesignRequest,
  designCategoryLabel,
  type DesignRequestStatus,
  designRequestStatusLabel,
  getDesignRequest,
  updateDesignRequestStatus,
  uploadDesignResponseFile,
} from '@/services/design-requests'
import { getDownloadUrl } from '@/services/files'

export function DesignRequestDetailPage() {
  const { t } = useTranslation(['designRequests', 'common'])
  useDocumentTitle(t('designRequests:documentTitleDetail'))
  const { id = '' } = useParams()
  const { isAdmin } = usePermissions()
  const location = useLocation()
  const navigate = useNavigate()
  const portal = portalBaseFromPath(location.pathname)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<'cancel' | 'delete' | null>(null)

  const remote = useRemoteData(() => getDesignRequest(id), {
    queryKey: ['design-requests', 'detail', id],
    enabled: Boolean(id),
  })

  const request = remote.status === 'success' ? remote.data : null

  const openDownload = async (path: string | null, fallbackUrl: string | null) => {
    if (fallbackUrl) {
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer')
      return
    }
    const fileId = path ? fileIdFromStorageKey(path) : null
    if (!fileId) return
    try {
      const result = await getDownloadUrl(fileId)
      window.open(result.downloadUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common:errorGeneric'))
    }
  }

  const setStatus = async (status: DesignRequestStatus) => {
    if (!request) return
    setBusy(true)
    try {
      await updateDesignRequestStatus(request.id, status)
      toast.success(t('designRequests:statusUpdated'))
      await remote.refetch({ fresh: true })
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : t('designRequests:couldNotUpdateStatus'),
      )
    } finally {
      setBusy(false)
    }
  }

  const onUploadResponse = async (file: File | undefined) => {
    if (!file || !request) return
    setBusy(true)
    try {
      await uploadDesignResponseFile(request.id, file)
      toast.success(t('designRequests:responseUploaded'))
      await remote.refetch({ fresh: true })
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('designRequests:couldNotUpload'))
    } finally {
      setBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const onConfirmAction = async () => {
    if (!request || !confirm) return
    setBusy(true)
    try {
      if (confirm === 'cancel') {
        await updateDesignRequestStatus(request.id, 'CANCELLED')
        toast.success(t('designRequests:statusUpdated'))
        await remote.refetch({ fresh: true })
      } else {
        await deleteDesignRequest(request.id)
        toast.success(t('designRequests:deleted'))
        navigate(`${portal}/design-requests`)
      }
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : confirm === 'delete'
            ? t('designRequests:couldNotDelete')
            : t('designRequests:couldNotUpdateStatus'),
      )
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  const canUploadResponse =
    isAdmin && request && (request.status === 'PENDING' || request.status === 'IN_PROGRESS')

  return (
    <div className="space-y-6">
      <PageHeader
        title={request?.subject ?? t('designRequests:documentTitleDetail')}
        actions={
          <Link
            to={`${portal}/design-requests`}
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            {t('designRequests:backToList')}
          </Link>
        }
      />

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<DetailSkeleton />}
      >
        {request ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <div className="space-y-6">
              <div className="rounded-lg border p-4">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{designRequestStatusLabel(request.status)}</Badge>
                  <Badge variant="secondary">{designCategoryLabel(request.category)}</Badge>
                </div>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <dt className="text-sm text-muted-foreground">
                      {t('designRequests:fields.description')}
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap">{request.description}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">
                      {t('designRequests:fields.neededBy')}
                    </dt>
                    <dd className="mt-1">{new Date(request.neededBy).toLocaleDateString()}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">
                      {t('designRequests:fields.project')}
                    </dt>
                    <dd className="mt-1">{request.projectName ?? '—'}</dd>
                  </div>
                  {isAdmin ? (
                    <div className="sm:col-span-2">
                      <dt className="text-sm text-muted-foreground">
                        {t('designRequests:headers.requester')}
                      </dt>
                      <dd className="mt-1">
                        {request.requestedByName} ({request.requestedByEmail})
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="font-medium">{t('designRequests:fields.requirementFile')}</h3>
                {request.requirementFilePath || request.requirementFileUrl ? (
                  <Button
                    className="mt-3"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void openDownload(request.requirementFilePath, request.requirementFileUrl)
                    }
                  >
                    <Download className="size-4" />
                    {t('designRequests:download')}
                  </Button>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t('designRequests:noRequirementFile')}
                  </p>
                )}
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="font-medium">{t('designRequests:responseSection')}</h3>
                {request.responseFilePath || request.responseFileUrl ? (
                  <Button
                    className="mt-3"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void openDownload(request.responseFilePath, request.responseFileUrl)
                    }
                  >
                    <Download className="size-4" />
                    {t('designRequests:download')}
                  </Button>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t('designRequests:noResponseFile')}
                  </p>
                )}
                {canUploadResponse ? (
                  <div className="mt-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => void onUploadResponse(e.target.files?.[0])}
                    />
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {busy ? t('designRequests:uploading') : t('designRequests:uploadResponse')}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>

            <aside className="space-y-3 rounded-lg border p-4 h-fit">
              <h3 className="font-medium">{t('designRequests:actions')}</h3>
              {isAdmin && request.status === 'PENDING' ? (
                <Button
                  className="w-full"
                  disabled={busy}
                  onClick={() => void setStatus('IN_PROGRESS')}
                >
                  {t('designRequests:markInProgress')}
                </Button>
              ) : null}
              {isAdmin && (request.status === 'PENDING' || request.status === 'IN_PROGRESS') ? (
                <>
                  <Button
                    className="w-full"
                    disabled={busy}
                    onClick={() => void setStatus('COMPLETED')}
                  >
                    {t('designRequests:markCompleted')}
                  </Button>
                  <Button
                    className="w-full"
                    variant="destructive"
                    disabled={busy}
                    onClick={() => void setStatus('REJECTED')}
                  >
                    {t('designRequests:markRejected')}
                  </Button>
                </>
              ) : null}
              {!isAdmin && canCancelDesignRequest(request.status) ? (
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setConfirm('cancel')}
                >
                  {t('designRequests:cancelRequest')}
                </Button>
              ) : null}
              {canDeleteDesignRequest(request.status) ? (
                <Button
                  className="w-full"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => setConfirm('delete')}
                >
                  <Trash2 className="size-4" />
                  {t('designRequests:deleteRequest')}
                </Button>
              ) : null}
            </aside>
          </div>
        ) : null}
      </AsyncState>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === 'delete'
                ? t('designRequests:confirmDeleteTitle')
                : t('designRequests:confirmCancelTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === 'delete'
                ? t('designRequests:confirmDeleteBody')
                : t('designRequests:confirmCancelBody')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void onConfirmAction()}>
              {t('common:confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
