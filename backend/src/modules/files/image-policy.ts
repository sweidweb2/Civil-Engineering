import { randomBytes } from 'node:crypto'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

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

/** Multer memory or disk upload — prefer disk to keep large originals off the heap. */
export type ImageUploadFile = {
  mimetype: string
  size: number
  originalname?: string
  buffer?: Buffer
  path?: string
}

export function isAllowedImageMime(mime: string): boolean {
  return ALLOWED_IMAGE_MIMES.includes(mime)
}

async function readFileHead(filePath: string, bytes = 64): Promise<Buffer> {
  const handle = await fs.open(filePath, 'r')
  try {
    const buf = Buffer.alloc(bytes)
    const { bytesRead } = await handle.read(buf, 0, bytes, 0)
    return buf.subarray(0, bytesRead)
  } finally {
    await handle.close()
  }
}

async function unlinkQuiet(filePath: string | undefined): Promise<void> {
  if (!filePath) return
  await fs.unlink(filePath).catch(() => undefined)
}

/** Validate declared mime, magic bytes, and size. Throws a 400 validation error. */
export async function assertAllowedImageUpload(
  file: ImageUploadFile,
  options: { maxBytes?: number } = {},
): Promise<void> {
  const maxBytes = options.maxBytes ?? MAX_IMAGE_BYTES

  if (!isAllowedImageMime(file.mimetype)) {
    throw validationError('Invalid file type. Allowed types: JPG, JPEG, PNG, WEBP')
  }

  if (file.size <= 0) {
    throw validationError('File is empty')
  }
  if (file.size > maxBytes) {
    throw validationError(`File size exceeds maximum of ${maxBytes / 1024 / 1024}MB`)
  }

  const head = file.buffer
    ? file.buffer.subarray(0, Math.min(64, file.buffer.length))
    : file.path
      ? await readFileHead(file.path)
      : null
  if (!head) {
    throw validationError('No image file provided')
  }

  try {
    assertMimeMatchesContent(file.mimetype, head, { imagesOnly: true })
  } catch {
    throw validationError('File content does not match the declared image type')
  }
}

/** Encode to WebP; deletes a disk upload path afterward. */
export async function encodeImageToWebp(file: ImageUploadFile): Promise<Buffer> {
  const input = file.buffer ?? file.path
  if (!input) {
    throw validationError('No image file provided')
  }
  try {
    // effort 2 keeps encode CPU off the worst hot path while still producing solid WebP.
    return await sharp(input).webp({ quality: 85, effort: 2 }).toBuffer()
  } finally {
    await unlinkQuiet(file.path)
  }
}

/** @deprecated Prefer encodeImageToWebp for uploads that may be on disk. */
export function toWebpBuffer(buffer: Buffer): Promise<Buffer> {
  return encodeImageToWebp({ buffer, mimetype: 'image/jpeg', size: buffer.length })
}

/** Read full upload bytes (memory or disk); deletes a disk path afterward. */
export async function readUploadBytes(file: ImageUploadFile): Promise<Buffer> {
  if (file.buffer) return file.buffer
  if (!file.path) {
    throw validationError('No file provided')
  }
  try {
    return await fs.readFile(file.path)
  } finally {
    await unlinkQuiet(file.path)
  }
}

/** Disk-backed multer — large uploads stay on disk until encode/read. */
export function createImageUpload(maxBytes: number = MAX_IMAGE_BYTES) {
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, os.tmpdir())
      },
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').slice(0, 16) || '.bin'
        cb(null, `civil-upload-${Date.now()}-${randomBytes(8).toString('hex')}${ext}`)
      },
    }),
    limits: { fileSize: maxBytes },
  })
}
