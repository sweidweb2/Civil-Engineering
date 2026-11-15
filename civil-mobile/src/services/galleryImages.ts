import { Platform } from 'react-native'

import { optimizeIfImage } from '../lib/optimizeImage'
import { apiRequest } from './api'
import type { PickedFile } from './filePicker'

/** Backend reorder cap (`reorder*ImagesBodySchema`); also the practical gallery limit. */
export const MAX_GALLERY_IMAGES = 15

export type GalleryImage = {
  id: string
  storagePath: string
  /** Null when storage URL resolution fails (list/get still succeed). */
  url: string | null
  isMain: boolean
  displayOrder: number
}

export type GalleryKind = 'listing' | 'project'

const CONFIG: Record<GalleryKind, { basePath: string; ownerSegment: string }> = {
  listing: { basePath: '/listing-images', ownerSegment: 'listings' },
  project: { basePath: '/project-images', ownerSegment: 'projects' },
}

function ownerImagesPath(kind: GalleryKind, ownerId: string) {
  const { basePath, ownerSegment } = CONFIG[kind]
  return `${basePath}/${ownerSegment}/${ownerId}/images`
}

function imagePath(kind: GalleryKind, imageId: string) {
  return `${CONFIG[kind].basePath}/images/${imageId}`
}

/**
 * Appends a picked image to a multipart body.
 * React Native accepts `{ uri, name, type }` as a file part; web needs a real Blob.
 */
export async function appendImagePart(
  form: FormData,
  field: string,
  file: { uri: string; mime: string; originalName: string },
) {
  if (Platform.OS === 'web') {
    const blob = await fetch(file.uri).then((r) => r.blob())
    form.append(field, blob, file.originalName)
    return
  }
  form.append(field, {
    uri: file.uri,
    name: file.originalName,
    type: file.mime,
  } as unknown as Blob)
}

/** Re-encodes (max edge 1920, JPEG) like every other image upload, then builds the form. */
async function imageForm(picked: PickedFile, extra: Record<string, string> = {}) {
  const optimized = await optimizeIfImage(picked)
  const form = new FormData()
  await appendImagePart(form, 'image', optimized)
  for (const [key, value] of Object.entries(extra)) form.append(key, value)
  return form
}

export function listGalleryImages(kind: GalleryKind, ownerId: string) {
  return apiRequest<{ data: GalleryImage[] }>(ownerImagesPath(kind, ownerId))
}

export async function uploadGalleryImage(
  kind: GalleryKind,
  ownerId: string,
  picked: PickedFile,
  options: { isMain?: boolean } = {},
) {
  const form = await imageForm(
    picked,
    options.isMain === undefined ? {} : { isMain: String(options.isMain) },
  )
  return apiRequest<{ data: GalleryImage }>(ownerImagesPath(kind, ownerId), {
    method: 'POST',
    body: form,
  })
}

export function setMainGalleryImage(kind: GalleryKind, imageId: string) {
  return apiRequest<{ data: GalleryImage }>(imagePath(kind, imageId), {
    method: 'PATCH',
    body: JSON.stringify({ isMain: true }),
  })
}

export function deleteGalleryImage(kind: GalleryKind, imageId: string) {
  return apiRequest<void>(imagePath(kind, imageId), { method: 'DELETE' })
}

/**
 * Uploads images picked before the owner existed (create forms).
 * The first one becomes the main image. Returns how many failed so the caller
 * can tell the user instead of silently dropping photos.
 */
export async function uploadQueuedImages(
  kind: GalleryKind,
  ownerId: string,
  queue: PickedFile[],
): Promise<number> {
  let failed = 0
  for (const [index, picked] of queue.entries()) {
    try {
      await uploadGalleryImage(kind, ownerId, picked, { isMain: index === 0 })
    } catch {
      failed += 1
    }
  }
  return failed
}
