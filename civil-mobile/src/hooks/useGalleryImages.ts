import { useCallback, useEffect, useState } from 'react'

import { useFilePick } from '@/hooks/useFilePick'
import type { PickedFile, PickSource } from '@/services/filePicker'
import {
  deleteGalleryImage,
  type GalleryImage,
  type GalleryKind,
  listGalleryImages,
  setMainGalleryImage,
  uploadGalleryImage,
} from '@/services/galleryImages'

type UseGalleryImagesOptions = {
  kind: GalleryKind
  /** Existing owner → uploads happen immediately; omitted → picks are queued. */
  ownerId?: string
  onQueueChange?: (queue: PickedFile[]) => void
}

/**
 * Gallery load / refresh / pick / upload / remove / set-main for one owner
 * (or a local queue while the owner does not exist yet).
 */
export function useGalleryImages({ kind, ownerId, onQueueChange }: UseGalleryImagesOptions) {
  const { sheetOpen, setSheetOpen, isBusy, setIsBusy, pickAndRun, toastApiError } = useFilePick()

  const [images, setImages] = useState<GalleryImage[]>([])
  const [queue, setQueue] = useState<PickedFile[]>([])
  const [isLoading, setIsLoading] = useState(Boolean(ownerId))

  const refresh = useCallback(async () => {
    if (!ownerId) return
    try {
      const result = await listGalleryImages(kind, ownerId)
      setImages(result.data)
    } catch (error) {
      toastApiError(error)
    } finally {
      setIsLoading(false)
    }
    // toastApiError is recreated every render; only owner/kind should retrigger a load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, ownerId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function runBusy(action: () => Promise<void>) {
    setIsBusy(true)
    try {
      await action()
    } catch (error) {
      toastApiError(error)
    } finally {
      setIsBusy(false)
    }
  }

  function setMain(image: GalleryImage) {
    return runBusy(async () => {
      await setMainGalleryImage(kind, image.id)
      await refresh()
    })
  }

  function removeImage(image: GalleryImage) {
    return runBusy(async () => {
      await deleteGalleryImage(kind, image.id)
      await refresh()
    })
  }

  function removeQueued(item: PickedFile) {
    const next = queue.filter((queued) => queued !== item)
    setQueue(next)
    onQueueChange?.(next)
  }

  function pick(source: PickSource) {
    return pickAndRun(source, async (picked) => {
      if (!ownerId) {
        const next = [...queue, picked]
        setQueue(next)
        onQueueChange?.(next)
        return
      }
      await uploadGalleryImage(kind, ownerId, picked, { isMain: images.length === 0 })
      await refresh()
    })
  }

  return {
    images,
    queue,
    isLoading,
    isBusy,
    sheetOpen,
    setSheetOpen,
    setMain,
    removeImage,
    removeQueued,
    pick,
  }
}
