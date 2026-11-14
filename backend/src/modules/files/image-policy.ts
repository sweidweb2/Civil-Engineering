import multer from 'multer'
import sharp from 'sharp'

import { validationError } from '../../errors/app-error.js'
import { assertMimeMatchesContent } from './mime-sniff.js'

export const ALLOWED_IMAGE_MIMES: readonly string[] = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]

/** Gallery images (listings / projects). */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
/** Single-image slots (provider brand image, user avatar). */
export const MAX_BRAND_IMAGE_BYTES = 8 * 1024 * 1024
export const MAX_GALLERY_IMAGES = 15

export type ImageUploadFile = { buffer: Buffer; mimetype: string; size: number }

export function isAllowedImageMime(mime: string): boolean {
  return ALLOWED_IMAGE_MIMES.includes(mime)
}

/** Validate declared mime, magic bytes, and size. Throws a 400 validation error. */
export function assertAllowedImageUpload(
  file: ImageUploadFile,
  options: { maxBytes?: number } = {},
): void {
  const maxBytes = options.maxBytes ?? MAX_IMAGE_BYTES

  if (!isAllowedImageMime(file.mimetype)) {
    throw validationError('Invalid file type. Allowed types: JPG, JPEG, PNG, WEBP')
  }

  try {
    assertMimeMatchesContent(file.mimetype, file.buffer, { imagesOnly: true })
  } catch {
    throw validationError('File content does not match the declared image type')
  }

  if (file.size <= 0) {
    throw validationError('File is empty')
  }
  if (file.size > maxBytes) {
    throw validationError(`File size exceeds maximum of ${maxBytes / 1024 / 1024}MB`)
  }
}

export function toWebpBuffer(buffer: Buffer): Promise<Buffer> {
  // effort 2 keeps encode CPU off the worst hot path while still producing solid WebP.
  return sharp(buffer).webp({ quality: 85, effort: 2 }).toBuffer()
}

/** In-memory multer instance for single-image uploads. */
export function createImageUpload(maxBytes: number = MAX_IMAGE_BYTES) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes },
  })
}
