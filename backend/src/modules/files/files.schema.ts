import { z } from 'zod'

export const fileEntityTypeSchema = z.enum([
  'PROJECT',
  'USER',
  'EXPENSE',
  'MATERIAL',
  'WORKER',
  'LISTING',
  'DESIGN_REQUEST',
  'DESIGN_OFFER',
  'CATEGORY',
])

export const ALLOWED_FILE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const

export const allowedMimeSchema = z.enum(ALLOWED_FILE_MIMES)

export const fileIdParamsSchema = z.object({
  id: z.string().min(1),
})

export const presignFileBodySchema = z.object({
  entityType: fileEntityTypeSchema,
  entityId: z.string().min(1).max(64),
  mime: allowedMimeSchema,
  size: z.number().int().positive(),
  originalName: z.string().trim().min(1).max(255),
})

/** Multipart field body for POST /files/upload (file bytes in `file`). */
export const uploadFileFieldsSchema = z.object({
  entityType: fileEntityTypeSchema,
  entityId: z.string().min(1).max(64),
})

export type FileEntityTypeName = z.infer<typeof fileEntityTypeSchema>
export type PresignFileBody = z.infer<typeof presignFileBodySchema>
export type UploadFileFields = z.infer<typeof uploadFileFieldsSchema>
export type AllowedFileMime = z.infer<typeof allowedMimeSchema>
