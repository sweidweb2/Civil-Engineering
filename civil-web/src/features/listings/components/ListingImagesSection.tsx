import { useCallback, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Image as ImageIcon, Loader2, Star, Trash2, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { TableSkeleton } from '@/components/feedback/skeletons'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useRemoteData } from '@/hooks/useRemoteData'
import {
  deleteListingImage,
  type ListingImage,
  listListingImages,
  reorderListingImages,
  updateListingImage,
  uploadListingImage,
} from '@/services/listingImages'

const MAX_IMAGES = 15
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

type Props = {
  listingId: string
  canManage?: boolean
  onChanged?: () => void
}

function UploadProgress({ value }: { value: number }) {
  const { t } = useTranslation('admin')
  const label =
    value >= 100 ? t('listings.images.finishingUpload') : t('listings.images.uploadingImage')
  return (
    <div className="mb-4 flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          {label}
        </span>
        <span>{value}%</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-label={t('listings.images.uploadProgressAria')}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

export function ListingImagesSection({ listingId, canManage = true, onChanged }: Props) {
  const { t } = useTranslation(['admin', 'common'])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<ListingImage | null>(null)

  const load = useCallback(() => listListingImages(listingId), [listingId])
  const remote = useRemoteData(load, { queryKey: ['listing-images', listingId] })
  const images: ListingImage[] = remote.status === 'success' ? remote.data.data : []

  async function refresh() {
    await remote.refetch()
    onChanged?.()
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (images.length >= MAX_IMAGES) {
      toast.error(t('admin:listings.images.maxImages', { max: MAX_IMAGES }))
      return
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(t('admin:listings.images.invalidType'))
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(t('admin:listings.images.fileTooLarge'))
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    try {
      await uploadListingImage(listingId, {
        file,
        displayOrder: images.length,
        isMain: images.length === 0,
        onProgress: setUploadProgress,
      })
      toast.success(t('admin:listings.images.uploadedToast'))
      await refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('admin:listings.images.couldNotUpload'),
      )
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSetMain(imageId: string) {
    setBusyId(imageId)
    try {
      await updateListingImage(imageId, { isMain: true })
      toast.success(t('admin:listings.images.mainUpdated'))
      await refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('admin:listings.images.couldNotUpdateMain'),
      )
    } finally {
      setBusyId(null)
    }
  }

  async function moveImage(imageId: string, direction: -1 | 1) {
    const index = images.findIndex((image) => image.id === imageId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= images.length) return

    const next = [...images]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)

    setBusyId(imageId)
    try {
      await reorderListingImages(listingId, { imageIds: next.map((image) => image.id) })
      await refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('admin:listings.images.couldNotReorder'),
      )
    } finally {
      setBusyId(null)
    }
  }

  async function confirmDelete() {
    if (!imageToDelete) return
    setBusyId(imageToDelete.id)
    try {
      await deleteListingImage(imageToDelete.id)
      toast.success(t('admin:listings.images.deleted'))
      setDeleteDialogOpen(false)
      setImageToDelete(null)
      await refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('admin:listings.images.couldNotDelete'),
      )
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<TableSkeleton rows={4} columns={5} />}
      >
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>{t('admin:listings.images.title')}</CardTitle>
                <CardDescription>
                  {t('admin:listings.images.description', {
                    count: images.length,
                    max: MAX_IMAGES,
                  })}
                </CardDescription>
              </div>
              {canManage && images.length < MAX_IMAGES ? (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={(event) => void handleFileSelect(event)}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    aria-busy={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    {isUploading
                      ? t('admin:listings.images.uploading')
                      : t('admin:listings.images.uploadImage')}
                  </Button>
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {isUploading ? <UploadProgress value={uploadProgress} /> : null}
            {images.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ImageIcon className="size-12 text-muted-foreground/50" />
                <p className="mt-4 text-sm font-medium text-muted-foreground">
                  {t('admin:listings.images.empty')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('admin:listings.images.emptyHint')}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">{t('admin:listings.images.preview')}</TableHead>
                    <TableHead className="w-24">{t('admin:listings.images.order')}</TableHead>
                    <TableHead>{t('admin:listings.images.main')}</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      {t('admin:listings.images.uploaded')}
                    </TableHead>
                    {canManage ? (
                      <TableHead className="text-right">
                        {t('admin:listings.images.actions')}
                      </TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {images.map((image, index) => {
                    const busy = busyId === image.id
                    return (
                      <TableRow key={image.id}>
                        <TableCell>
                          <div className="size-14 overflow-hidden rounded-md border border-border bg-muted">
                            <img
                              src={image.url}
                              alt=""
                              className="size-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="tabular-nums text-sm">{image.displayOrder + 1}</span>
                            {canManage ? (
                              <div className="flex flex-col">
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="ghost"
                                  disabled={busy || index === 0}
                                  aria-label={t('admin:listings.images.moveUp')}
                                  onClick={() => void moveImage(image.id, -1)}
                                >
                                  <ArrowUp className="size-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="ghost"
                                  disabled={busy || index === images.length - 1}
                                  aria-label={t('admin:listings.images.moveDown')}
                                  onClick={() => void moveImage(image.id, 1)}
                                >
                                  <ArrowDown className="size-3.5" />
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          {image.isMain ? (
                            <Badge>
                              <Star className="size-3" />
                              {t('admin:listings.images.main')}
                            </Badge>
                          ) : canManage ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => void handleSetMain(image.id)}
                            >
                              <Star className="size-3.5" />
                              {t('admin:listings.images.setMain')}
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                          {new Date(image.createdAt).toLocaleString()}
                        </TableCell>
                        {canManage ? (
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="destructive"
                              disabled={busy}
                              aria-label={t('admin:listings.images.deleteAria')}
                              onClick={() => {
                                setImageToDelete(image)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </AsyncState>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin:listings.images.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {imageToDelete?.isMain
                ? t('admin:listings.images.deleteDescriptionMain')
                : t('admin:listings.images.deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>
              {t('common:delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
