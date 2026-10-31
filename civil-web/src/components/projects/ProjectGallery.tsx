import { useCallback, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { GallerySkeleton } from '@/components/feedback/skeletons'
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
import { useRemoteData } from '@/hooks/useRemoteData'
import {
  deleteProjectImage,
  listProjectImages,
  type ProjectImage,
  updateProjectImage,
  uploadProjectImage,
} from '@/services/projectImages'

const MAX_IMAGES = 15
const MAX_FILE_SIZE_MB = 10
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

type Props = {
  projectId: string
}

function UploadProgress({ value }: { value: number }) {
  const { t } = useTranslation('projects')
  const label = value >= 100 ? t('uploadFinishing') : t('uploadingImage')

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
        aria-label={t('uploadProgressAria')}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

export function ProjectGallery({ projectId }: Props) {
  const { t } = useTranslation(['projects', 'common'])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)

  const load = useCallback(() => listProjectImages(projectId), [projectId])
  const remote = useRemoteData(load, { queryKey: ['project-images', projectId] })
  const images: ProjectImage[] = remote.status === 'success' ? remote.data.data : []

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (images.length >= MAX_IMAGES) {
      toast.error(t('projects:maxImages', { max: MAX_IMAGES }))
      return
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(t('projects:invalidFileType'))
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error(t('projects:fileTooLarge', { max: MAX_FILE_SIZE_MB }))
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    try {
      await uploadProjectImage(projectId, {
        file,
        displayOrder: images.length,
        isMain: images.length === 0,
        onProgress: setUploadProgress,
      })
      toast.success(t('projects:imageUploaded'))
      void remote.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('projects:couldNotUploadImage'))
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSetMain = async (imageId: string) => {
    try {
      await updateProjectImage(imageId, { isMain: true })
      toast.success(t('projects:mainImageUpdated'))
      void remote.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('projects:couldNotUpdateMainImage'))
    }
  }

  const handleDeleteClick = (imageId: string) => {
    setImageToDelete(imageId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!imageToDelete) return
    try {
      await deleteProjectImage(imageToDelete)
      toast.success(t('projects:imageDeleted'))
      setDeleteDialogOpen(false)
      setImageToDelete(null)
      setSelectedImageIndex(null)
      void remote.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('projects:couldNotDeleteImage'))
    }
  }

  const openCarousel = (index: number) => {
    setSelectedImageIndex(index)
  }

  const closeCarousel = () => {
    setSelectedImageIndex(null)
  }

  const nextImage = () => {
    if (selectedImageIndex === null) return
    setSelectedImageIndex((selectedImageIndex + 1) % images.length)
  }

  const prevImage = () => {
    if (selectedImageIndex === null) return
    setSelectedImageIndex((selectedImageIndex - 1 + images.length) % images.length)
  }

  return (
    <>
      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<GallerySkeleton />}
      >
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('projects:galleryTitle')}</CardTitle>
                <CardDescription>
                  {t('projects:galleryStats', {
                    current: images.length,
                    max: MAX_IMAGES,
                    maxSize: MAX_FILE_SIZE_MB,
                  })}
                </CardDescription>
              </div>
              {images.length < MAX_IMAGES && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={(e) => void handleFileSelect(e)}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    aria-busy={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    {isUploading ? t('common:uploading') : t('projects:uploadImage')}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isUploading ? <UploadProgress value={uploadProgress} /> : null}
            {images.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ImageIcon className="size-12 text-muted-foreground/50" />
                <p className="mt-4 text-sm font-medium text-muted-foreground">
                  {t('projects:noImages')}
                </p>
                <p className="text-sm text-muted-foreground">{t('projects:noImagesHint')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border bg-muted"
                    onClick={() => openCarousel(index)}
                  >
                    <img
                      src={image.url}
                      alt={t('projects:imageAlt', { index: index + 1 })}
                      className="size-full object-cover transition-transform group-hover:scale-105"
                    />
                    {image.isMain && (
                      <Badge className="absolute start-2 top-2">
                        <Star className="size-3" />
                        {t('projects:mainImage')}
                      </Badge>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                      {!image.isMain && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation()
                            void handleSetMain(image.id)
                          }}
                        >
                          <Star className="size-3" />
                          {t('projects:setMain')}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        className="bg-white text-destructive hover:bg-white"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteClick(image.id)
                        }}
                      >
                        <Trash2 className="size-3" />
                        {t('common:delete')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </AsyncState>

      {selectedImageIndex !== null && images[selectedImageIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={closeCarousel}
        >
          <Button
            size="icon"
            variant="ghost"
            className="absolute end-4 top-4 text-white hover:bg-white/20"
            onClick={closeCarousel}
          >
            <X className="size-6" />
          </Button>

          {images.length > 1 && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="absolute start-4 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation()
                  prevImage()
                }}
              >
                <ChevronLeft className="size-8 rtl:rotate-180" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="absolute end-4 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation()
                  nextImage()
                }}
              >
                <ChevronRight className="size-8 rtl:rotate-180" />
              </Button>
            </>
          )}

          <div
            className="max-h-[90vh] max-w-[90vw]"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <img
              src={images[selectedImageIndex].url}
              alt={t('projects:imageAlt', { index: selectedImageIndex + 1 })}
              className="max-h-[90vh] max-w-[90vw] object-contain"
            />
            <div className="mt-4 flex items-center justify-center gap-2">
              {images[selectedImageIndex].isMain && (
                <Badge>
                  <Star className="size-3" />
                  {t('projects:mainImageBadge')}
                </Badge>
              )}
              <p className="text-sm text-white">
                {t('projects:imageOf', { current: selectedImageIndex + 1, total: images.length })}
              </p>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('projects:deleteImageTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('projects:deleteImageDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDeleteConfirm()}>
              {t('common:delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
