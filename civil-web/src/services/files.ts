import { optimizeIfImage } from '@/lib/optimizeImage'

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
 * Optimize (images) → API multipart upload → R2 (server-side).
 * Same path as avatar / project gallery — avoids browser→R2 CORS.
 */
export async function uploadFile(input: {
  file: File
  entityType: FileEntityType
  entityId: string
  onProgress?: (percent: number) => void
}): Promise<CompleteFileResponse> {
  const optimized = await optimizeIfImage(input.file)
  const body = new FormData()
  body.append(
    'file',
    new File([optimized.blob], optimized.originalName, { type: optimized.mime }),
  )
  body.append('entityType', input.entityType)
  body.append('entityId', input.entityId)

  return apiRequest<CompleteFileResponse>('/files/upload', {
    method: 'POST',
    body,
    onUploadProgress: input.onProgress,
  })
}
