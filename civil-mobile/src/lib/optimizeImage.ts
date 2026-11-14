import * as ImageManipulator from 'expo-image-manipulator'

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp'])

export type OptimizedUpload = {
  uri: string
  mime: string
  size: number
  originalName: string
}

function extOf(name: string): string {
  const parts = name.toLowerCase().split('.')
  return parts.length > 1 ? parts[parts.length - 1]! : ''
}

/**
 * Client image pipeline before upload — max edge 1920, JPEG quality ~0.8.
 * Non-images pass through unchanged (caller supplies size).
 */
export async function optimizeIfImage(input: {
  uri: string
  mime: string
  originalName: string
  size: number
}): Promise<OptimizedUpload> {
  const ext = extOf(input.originalName)
  const isImage = input.mime.startsWith('image/') || IMAGE_EXTS.has(ext)

  if (!isImage) {
    return {
      uri: input.uri,
      mime: input.mime,
      size: input.size,
      originalName: input.originalName,
    }
  }

  const result = await ImageManipulator.manipulateAsync(input.uri, [{ resize: { width: 1920 } }], {
    compress: 0.8,
    format: ImageManipulator.SaveFormat.JPEG,
  })

  const response = await fetch(result.uri)
  const blob = await response.blob()
  const base = input.originalName.replace(/\.[^.]+$/, '') || 'image'

  return {
    uri: result.uri,
    mime: 'image/jpeg',
    size: blob.size,
    originalName: `${base}.jpg`,
  }
}
