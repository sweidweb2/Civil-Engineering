import { optimizeIfImage } from '../lib/optimizeImage'
import { apiRequest } from './api'

export type FileEntityType = 'PROJECT' | 'USER' | 'EXPENSE' | 'MATERIAL' | 'WORKER' | 'LISTING'

export type PresignFileResponse = {
  fileId: string
  key: string
  uploadUrl: string
  headers: { 'Content-Type': string }
}

export type CompleteFileResponse = {
  id: string
  key: string
  mime: string
  size: number | null
  status: string
  originalName: string
}

export type DownloadUrlResponse = {
  downloadUrl: string
  mime: string
  originalName: string
}

export function presignFile(input: {
  entityType: FileEntityType
  entityId: string
  mime: string
  size: number
  originalName: string
}) {
  return apiRequest<PresignFileResponse>('/files/presign', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function completeFile(fileId: string) {
  return apiRequest<CompleteFileResponse>(`/files/${fileId}/complete`, {
    method: 'POST',
  })
}

export function getDownloadUrl(fileId: string) {
  return apiRequest<DownloadUrlResponse>(`/files/${fileId}/download-url`, {
    method: 'GET',
  })
}

export function deleteFile(fileId: string) {
  return apiRequest<void>(`/files/${fileId}`, {
    method: 'DELETE',
  })
}

/**
 * Optimize (images) → presign → PUT to R2 → complete.
 * Bytes never go through Express.
 */
export async function uploadFile(input: {
  uri: string
  mime: string
  originalName: string
  size: number
  entityType: FileEntityType
  entityId: string
}): Promise<CompleteFileResponse> {
  const optimized = await optimizeIfImage({
    uri: input.uri,
    mime: input.mime,
    originalName: input.originalName,
    size: input.size,
  })

  const presign = await presignFile({
    entityType: input.entityType,
    entityId: input.entityId,
    mime: optimized.mime,
    size: optimized.size,
    originalName: optimized.originalName,
  })

  const body = await fetch(optimized.uri).then((r) => r.blob())
  const put = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': optimized.mime,
    },
    body,
  })

  if (!put.ok) {
    throw new Error(`Upload to storage failed (${put.status})`)
  }

  return completeFile(presign.fileId)
}
