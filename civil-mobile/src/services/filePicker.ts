import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import type { TFunction } from 'i18next'

import { ensureMediaPermission } from './permissions'

export type PickSource = 'camera' | 'library' | 'file'

export type PickedFile = {
  uri: string
  mime: string
  originalName: string
  size: number
}

/** Mirrors backend `ALLOWED_FILE_MIMES`. */
export const ALLOWED_DOCUMENT_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const

/** Matches the backend STORAGE_MAX_BYTES default (25 MB). */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

export class FilePickError extends Error {
  constructor(readonly code: 'tooLarge' | 'unsupported') {
    super(code)
  }
}

const EXT_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
}

function mimeFromName(name: string): string | null {
  const ext = name.toLowerCase().split('.').pop() ?? ''
  return EXT_MIME[ext] ?? null
}

function fromImageAsset(asset: ImagePicker.ImagePickerAsset): PickedFile {
  const name = asset.fileName ?? `photo-${Date.now()}.jpg`
  return {
    uri: asset.uri,
    // Images are re-encoded to JPEG by `uploadFile`, so any image/* is fine here.
    mime: asset.mimeType ?? mimeFromName(name) ?? 'image/jpeg',
    originalName: name,
    size: asset.fileSize ?? 0,
  }
}

function fromDocumentAsset(asset: DocumentPicker.DocumentPickerAsset): PickedFile {
  const mime = asset.mimeType ?? mimeFromName(asset.name) ?? 'application/octet-stream'
  const allowed =
    mime.startsWith('image/') || (ALLOWED_DOCUMENT_MIMES as readonly string[]).includes(mime)
  if (!allowed) throw new FilePickError('unsupported')
  if (!mime.startsWith('image/') && (asset.size ?? 0) > MAX_UPLOAD_BYTES) {
    throw new FilePickError('tooLarge')
  }
  return { uri: asset.uri, mime, originalName: asset.name, size: asset.size ?? 0 }
}

/**
 * Opens the camera, photo library or document picker.
 * Returns null when the user cancels or the OS permission is not granted.
 * Throws `FilePickError` for files the backend would reject anyway.
 */
export async function pickFile(source: PickSource, t: TFunction): Promise<PickedFile | null> {
  if (source === 'file') {
    const result = await DocumentPicker.getDocumentAsync({
      type: [...ALLOWED_DOCUMENT_MIMES, 'image/*'],
      copyToCacheDirectory: true,
      multiple: false,
    })
    const asset = result.canceled ? null : result.assets[0]
    return asset ? fromDocumentAsset(asset) : null
  }

  if (!(await ensureMediaPermission(source, t))) return null

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 })
  const asset = result.canceled ? null : result.assets[0]
  return asset ? fromImageAsset(asset) : null
}
