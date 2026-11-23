import { Platform } from 'react-native'

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
 * Optimize (images) → API multipart → R2 (server-side).
 * Same path as civil-web and gallery uploads — avoids RN blob PUT to R2 (unreliable on Android).
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

  const body = new FormData()
  body.append('entityType', input.entityType)
  body.append('entityId', input.entityId)

  if (Platform.OS === 'web') {
    const blob = await fetch(optimized.uri).then((r) => r.blob())
    body.append('file', blob, optimized.originalName)
  } else {
    body.append('file', {
      uri: optimized.uri,
      name: optimized.originalName,
      type: optimized.mime,
    } as unknown as Blob)
  }

  return apiRequest<CompleteFileResponse>('/files/upload', {
    method: 'POST',
    body,
  })
}
