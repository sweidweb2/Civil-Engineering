import { type ReactNode, useState } from 'react'
import { Image as ImageIcon, Loader2, Upload } from 'lucide-react'

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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  GALLERY_ACCEPT_ATTRIBUTE,
  GALLERY_MAX_IMAGES,
  type GalleryController,
} from '@/hooks/useGalleryImages'
import { cn } from '@/lib/utils'
import type { GalleryImageBase } from '@/services/galleryImages'

type UploadProgressProps = {
  value: number
  uploadingLabel: string
  finishingLabel: string
  ariaLabel: string
}

function UploadProgress({ value, uploadingLabel, finishingLabel, ariaLabel }: UploadProgressProps) {
  return (
    <div className="mb-4 flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          {value >= 100 ? finishingLabel : uploadingLabel}
        </span>
        <span>{value}%</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-label={ariaLabel}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

export type ImageGalleryLabels = {
  title: string
  description: string
  uploadImage: string
  uploading: string
  uploadProgress: { uploading: string; finishing: string; aria: string }
  emptyTitle: string
  emptyHint: string
  deleteTitle: string
  deleteDescription: (image: GalleryImageBase | null) => string
  cancel: string
  confirmDelete: string
}

type ImageGalleryProps<TImage extends GalleryImageBase> = {
  gallery: GalleryController<TImage>
  labels: ImageGalleryLabels
  loadingFallback: ReactNode
  /** Whether upload/delete controls are shown. */
  canManage?: boolean
  cardClassName?: string
  /** Drop-zone empty layout with placeholder tiles (project site gallery). */
  emptyVariant?: 'simple' | 'dropzone'
  /** Layout of the non-empty image collection (table, grid, …). */
  children: (images: TImage[]) => ReactNode
  /** Rendered after the card (e.g. lightbox); receives the loaded images. */
  overlay?: (images: TImage[]) => ReactNode
}

/**
 * Shared shell for owner-scoped image galleries: loading state, header with upload,
 * progress, empty state and delete confirmation. Image layout is supplied by the caller.
 */
export function ImageGallery<TImage extends GalleryImageBase>({
  gallery,
  labels,
  loadingFallback,
  canManage = true,
  cardClassName,
  emptyVariant = 'simple',
  children,
  overlay,
}: ImageGalleryProps<TImage>) {
  const {
    remote,
    images,
    fileInputRef,
    isUploading,
    uploadProgress,
    imageToDelete,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    handleFileSelect,
    uploadSelectedFile,
    confirmDelete,
  } = gallery
  const [isDragging, setIsDragging] = useState(false)

  const openPicker = () => fileInputRef.current?.click()

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
    if (!canManage || isUploading) return
    const file = event.dataTransfer.files?.[0]
    if (file) void uploadSelectedFile(file)
  }

  return (
    <>
      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={loadingFallback}
      >
        <Card className={cardClassName}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>{labels.title}</CardTitle>
                <CardDescription>{labels.description}</CardDescription>
              </div>
              {canManage && images.length < GALLERY_MAX_IMAGES ? (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={GALLERY_ACCEPT_ATTRIBUTE}
                    onChange={(event) => void handleFileSelect(event)}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    onClick={openPicker}
                    disabled={isUploading}
                    aria-busy={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    {isUploading ? labels.uploading : labels.uploadImage}
                  </Button>
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {isUploading ? (
              <UploadProgress
                value={uploadProgress}
                uploadingLabel={labels.uploadProgress.uploading}
                finishingLabel={labels.uploadProgress.finishing}
                ariaLabel={labels.uploadProgress.aria}
              />
            ) : null}
            {images.length === 0 ? (
              emptyVariant === 'dropzone' ? (
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_1fr]">
                  <button
                    type="button"
                    disabled={!canManage || isUploading}
                    onClick={openPicker}
                    onDragEnter={(event) => {
                      event.preventDefault()
                      setIsDragging(true)
                    }}
                    onDragOver={(event) => {
                      event.preventDefault()
                      setIsDragging(true)
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault()
                      setIsDragging(false)
                    }}
                    onDrop={onDrop}
                    className={cn(
                      'flex min-h-36 flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors',
                      isDragging
                        ? 'border-primary bg-primary/5'
                        : 'border-muted-foreground/30 bg-muted/20',
                      'hover:border-primary/50 hover:bg-muted/30',
                      'disabled:pointer-events-none disabled:opacity-60',
                    )}
                  >
                    <ImageIcon className="size-8 text-muted-foreground/70" aria-hidden />
                    <p className="text-sm font-medium text-foreground">{labels.emptyTitle}</p>
                    <p className="max-w-sm text-xs text-muted-foreground">{labels.emptyHint}</p>
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="min-h-36 rounded-xl bg-muted/50" aria-hidden />
                    <div className="min-h-36 rounded-xl bg-muted/40" aria-hidden />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ImageIcon className="size-12 text-muted-foreground/50" />
                  <p className="mt-4 text-sm font-medium text-muted-foreground">
                    {labels.emptyTitle}
                  </p>
                  <p className="text-sm text-muted-foreground">{labels.emptyHint}</p>
                </div>
              )
            ) : (
              children(images)
            )}
          </CardContent>
        </Card>
      </AsyncState>

      {overlay?.(images)}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{labels.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {labels.deleteDescription(imageToDelete)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{labels.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>
              {labels.confirmDelete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
