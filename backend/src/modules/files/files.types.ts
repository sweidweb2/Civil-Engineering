import type { FileEntityTypeName } from './files.schema.js'

export type FileStatusName = 'PENDING' | 'READY' | 'DELETED'

export type FileRecord = {
  id: string
  key: string
  bucket: string
  mime: string
  size: number | null
  originalName: string
  status: FileStatusName
  uploadedById: string
  entityType: FileEntityTypeName
  entityId: string
  createdAt: Date
  updatedAt: Date
}

export type PresignFileResult = {
  fileId: string
  key: string
  uploadUrl: string
  headers: { 'Content-Type': string }
}

export type DownloadUrlResult = {
  downloadUrl: string
  mime: string
  originalName: string
}
