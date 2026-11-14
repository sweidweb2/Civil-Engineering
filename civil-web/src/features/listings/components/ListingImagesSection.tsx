import { ArrowDown, ArrowUp, Star, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { TableSkeleton } from '@/components/feedback/skeletons'
import { ImageGallery, type ImageGalleryLabels } from '@/components/images/ImageGallery'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  GALLERY_MAX_FILE_SIZE_MB,
  GALLERY_MAX_IMAGES,
  type GalleryMessages,
  useGalleryImages,
} from '@/hooks/useGalleryImages'
import { type ListingImage, listingImagesApi } from '@/services/listingImages'

type Props = {
  listingId: string
  canManage?: boolean
  onChanged?: () => void
}

export function ListingImagesSection({ listingId, canManage = true, onChanged }: Props) {
  const { t } = useTranslation(['admin', 'common'])

  const messages: GalleryMessages = {
    maxImages: t('admin:listings.images.maxImages', { max: GALLERY_MAX_IMAGES }),
    invalidType: t('admin:listings.images.invalidType'),
    fileTooLarge: t('admin:listings.images.fileTooLarge', { max: GALLERY_MAX_FILE_SIZE_MB }),
    uploaded: t('admin:listings.images.uploadedToast'),
    mainUpdated: t('admin:listings.images.mainUpdated'),
    deleted: t('admin:listings.images.deleted'),
    couldNotUpload: t('admin:listings.images.couldNotUpload'),
    couldNotUpdateMain: t('admin:listings.images.couldNotUpdateMain'),
    couldNotDelete: t('admin:listings.images.couldNotDelete'),
  }

  const gallery = useGalleryImages<ListingImage>({
    api: listingImagesApi,
    ownerId: listingId,
    queryKey: ['listing-images', listingId],
    messages,
    onChanged,
  })
  const { images, busyId, runForImage, refresh, setMain, requestDelete } = gallery

  function moveImage(imageId: string, direction: -1 | 1) {
    const index = images.findIndex((image) => image.id === imageId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= images.length) return

    const next = [...images]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)

    return runForImage(
      imageId,
      async () => {
        await listingImagesApi.reorder(listingId, { imageIds: next.map((image) => image.id) })
        await refresh()
      },
      t('admin:listings.images.couldNotReorder'),
    )
  }

  const labels: ImageGalleryLabels = {
    title: t('admin:listings.images.title'),
    description: t('admin:listings.images.description', {
      count: images.length,
      max: GALLERY_MAX_IMAGES,
    }),
    uploadImage: t('admin:listings.images.uploadImage'),
    uploading: t('admin:listings.images.uploading'),
    uploadProgress: {
      uploading: t('admin:listings.images.uploadingImage'),
      finishing: t('admin:listings.images.finishingUpload'),
      aria: t('admin:listings.images.uploadProgressAria'),
    },
    emptyTitle: t('admin:listings.images.empty'),
    emptyHint: t('admin:listings.images.emptyHint'),
    deleteTitle: t('admin:listings.images.deleteTitle'),
    deleteDescription: (image) =>
      image?.isMain
        ? t('admin:listings.images.deleteDescriptionMain')
        : t('admin:listings.images.deleteDescription'),
    cancel: t('common:cancel'),
    confirmDelete: t('common:delete'),
  }

  return (
    <ImageGallery
      gallery={gallery}
      labels={labels}
      canManage={canManage}
      loadingFallback={<TableSkeleton rows={4} columns={5} />}
    >
      {(rows) => (
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
                <TableHead className="text-end">{t('admin:listings.images.actions')}</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((image, index) => {
              const busy = busyId === image.id
              return (
                <TableRow key={image.id}>
                  <TableCell>
                    <div className="size-14 overflow-hidden rounded-md border border-border bg-muted">
                      {image.url ? (
                        <img
                          src={image.url}
                          alt=""
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
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
                            disabled={busy || index === rows.length - 1}
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
                        onClick={() => void setMain(image.id)}
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
                    <TableCell className="text-end">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="destructive"
                        disabled={busy}
                        aria-label={t('admin:listings.images.deleteAria')}
                        onClick={() => requestDelete(image)}
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
    </ImageGallery>
  )
}
