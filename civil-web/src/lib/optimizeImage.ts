import imageCompression from 'browser-image-compression'

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg'])

export type OptimizedFile = {
  blob: Blob
  mime: string
  size: number
  originalName: string
}

/**
 * Client image pipeline before upload — max edge 1920, quality ~0.8.
 * Non-images pass through unchanged.
 */
export async function optimizeIfImage(file: File): Promise<OptimizedFile> {
  if (!IMAGE_MIMES.has(file.type)) {
    return {
      blob: file,
      mime: file.type,
      size: file.size,
      originalName: file.name,
    }
  }

  const compressed = await imageCompression(file, {
    maxWidthOrHeight: 1920,
    maxSizeMB: 4,
    initialQuality: 0.8,
    useWebWorker: true,
    fileType: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
  })

  const mime = compressed.type || (file.type === 'image/png' ? 'image/png' : 'image/jpeg')
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'
  const base = file.name.replace(/\.[^.]+$/, '') || 'image'

  return {
    blob: compressed,
    mime,
    size: compressed.size,
    originalName: `${base}.${ext}`,
  }
}
