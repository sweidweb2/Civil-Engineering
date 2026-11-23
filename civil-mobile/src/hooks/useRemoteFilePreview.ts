import { useCallback, useRef, useState } from 'react'
import { Platform } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { File, Paths } from 'expo-file-system'

import type { FilePreviewOverlayState } from '@/components/files/ImagePreviewModal'

function isImageFile(mime?: string | null, name?: string | null, url?: string | null): boolean {
  if (mime?.startsWith('image/')) return true
  const source = `${name ?? ''} ${url ?? ''}`.toLowerCase()
  return /\.(jpe?g|png|webp|gif|heic|bmp)(\?|#|$)/i.test(source)
}

function safeFileName(name?: string | null): string {
  const raw = (name ?? 'preview').trim() || 'preview'
  return raw.replace(/[^\w.\-]+/g, '_').slice(0, 80)
}

/**
 * In-app preview for remote files (presigned URLs).
 * Opens the overlay immediately (spinner) so the UI never freezes waiting.
 * Images stay in a framed modal; other types use native preview after a
 * short-lived cache download. Browser only as last resort.
 */
export function useRemoteFilePreview() {
  const [previewState, setPreviewState] = useState<FilePreviewOverlayState>(null)
  const sessionRef = useRef(0)

  const closePreview = useCallback(() => {
    sessionRef.current += 1
    setPreviewState(null)
  }, [])

  /** Show overlay spinner right away (e.g. while resolving a download URL). */
  const beginPreview = useCallback(() => {
    setPreviewState({ kind: 'image', uri: null })
  }, [])

  const openRemoteFile = useCallback(
    async (input: { url: string; mime?: string | null; name?: string | null }) => {
      const url = input.url.trim()
      if (!url) {
        setPreviewState(null)
        return
      }

      if (isImageFile(input.mime, input.name, url)) {
        setPreviewState({ kind: 'image', uri: url })
        return
      }

      if (Platform.OS === 'web') {
        setPreviewState(null)
        await WebBrowser.openBrowserAsync(url)
        return
      }

      const openSession = sessionRef.current
      setPreviewState({ kind: 'opening' })
      let temp: File | null = null
      try {
        temp = new File(Paths.cache, `preview-${Date.now()}-${safeFileName(input.name)}`)
        const downloaded = await File.downloadFileAsync(url, temp, { idempotent: true })
        if (sessionRef.current !== openSession) return
        const mimeType = input.mime?.trim() || undefined
        if (await downloaded.canPreview(mimeType ? { mimeType } : undefined)) {
          setPreviewState(null)
          await downloaded.preview(
            mimeType ? { mimeType, title: input.name ?? undefined } : undefined,
          )
          return
        }
        setPreviewState(null)
        await WebBrowser.openBrowserAsync(url)
      } catch {
        if (sessionRef.current !== openSession) return
        setPreviewState(null)
        await WebBrowser.openBrowserAsync(url)
      } finally {
        try {
          temp?.delete()
        } catch {
          // ignore cleanup failures
        }
      }
    },
    [],
  )

  return {
    openRemoteFile,
    beginPreview,
    closePreview,
    previewState,
    closeImagePreview: closePreview,
    isOpeningPreview: previewState != null,
  }
}
