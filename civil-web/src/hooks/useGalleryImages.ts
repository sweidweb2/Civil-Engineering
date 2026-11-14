import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'

import { useRemoteData } from '@/hooks/useRemoteData'
import type { GalleryImageBase, GalleryImagesApi } from '@/services/galleryImages'

export const GALLERY_MAX_IMAGES = 15
export const GALLERY_MAX_FILE_SIZE_MB = 10
export const GALLERY_ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
export const GALLERY_ACCEPT_ATTRIBUTE = 'image/jpeg,image/jpg,image/png,image/webp'

const MAX_FILE_SIZE_BYTES = GALLERY_MAX_FILE_SIZE_MB * 1024 * 1024

/** Already-translated toast copy; the hook stays i18n-agnostic. */
export type GalleryMessages = {
  maxImages: string
  invalidType: string
  fileTooLarge: string
  uploaded: string
  mainUpdated: string
  deleted: string
  couldNotUpload: string
  couldNotUpdateMain: string
  couldNotDelete: string
}

type UseGalleryImagesOptions<TImage extends GalleryImageBase> = {
  api: GalleryImagesApi<TImage>
  ownerId: string
  queryKey: readonly unknown[]
  messages: GalleryMessages
  onChanged?: () => void
  onDeleted?: () => void
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

/**
 * Shared list / upload / set-main / delete state for owner-scoped image galleries.
 * Layout (table, grid, carousel) stays in the caller.
 */
export function useGalleryImages<TImage extends GalleryImageBase>({
  api,
  ownerId,
  queryKey,
  messages,
  onChanged,
  onDeleted,
}: UseGalleryImagesOptions<TImage>) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [imageToDelete, setImageToDelete] = useState<TImage | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const load = useCallback(() => api.list(ownerId), [api, ownerId])
  const remote = useRemoteData(load, { queryKey })
  const images: TImage[] = remote.status === 'success' ? remote.data.data : []

  async function refresh() {
    await remote.refetch()
    onChanged?.()
  }

  /** Runs one mutation for an image with busy tracking + error toast. */
  async function runForImage(imageId: string, action: () => Promise<void>, failureMessage: string) {
    setBusyId(imageId)
    try {
      await action()
    } catch (error) {
      toast.error(errorMessage(error, failureMessage))
    } finally {
      setBusyId(null)
    }
  }

  async function uploadSelectedFile(file: File) {
    if (images.length >= GALLERY_MAX_IMAGES) {
      toast.error(messages.maxImages)
      return
    }
    if (!GALLERY_ALLOWED_TYPES.includes(file.type)) {
      toast.error(messages.invalidType)
      return
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(messages.fileTooLarge)
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    try {
      await api.upload(ownerId, {
        file,
        displayOrder: images.length,
        isMain: images.length === 0,
        onProgress: setUploadProgress,
      })
      toast.success(messages.uploaded)
      await refresh()
    } catch (error) {
      toast.error(errorMessage(error, messages.couldNotUpload))
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    await uploadSelectedFile(file)
  }

  function setMain(imageId: string) {
    return runForImage(
      imageId,
      async () => {
        await api.update(imageId, { isMain: true })
        toast.success(messages.mainUpdated)
        await refresh()
      },
      messages.couldNotUpdateMain,
    )
  }

  function requestDelete(image: TImage) {
    setImageToDelete(image)
    setIsDeleteDialogOpen(true)
  }

  async function confirmDelete() {
    if (!imageToDelete) return
    await runForImage(
      imageToDelete.id,
      async () => {
        await api.remove(imageToDelete.id)
        toast.success(messages.deleted)
        setIsDeleteDialogOpen(false)
        setImageToDelete(null)
        onDeleted?.()
        await refresh()
      },
      messages.couldNotDelete,
    )
  }

  return {
    remote,
    images,
    fileInputRef,
    isUploading,
    uploadProgress,
    busyId,
    imageToDelete,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    handleFileSelect,
    uploadSelectedFile,
    setMain,
    requestDelete,
    confirmDelete,
    runForImage,
    refresh,
  }
}

export type GalleryController<TImage extends GalleryImageBase> = ReturnType<
  typeof useGalleryImages<TImage>
>
