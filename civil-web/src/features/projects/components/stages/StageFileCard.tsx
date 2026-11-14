import { useEffect, useRef, useState } from 'react'
import { FileText, ImageIcon, Loader2, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fileIdFromStorageKey, isImageMime } from '@/features/projects/lib/stage-file-key'
import { getDownloadUrl, uploadFile } from '@/services/files'
import { cn } from '@/lib/utils'

type StageFileCardProps = {
  projectId: string
  title: string
  hint: string
  value: string | null | undefined
  onChange: (path: string) => void
  disabled?: boolean
}

type PreviewState = {
  url: string
  mime: string
  name: string
}

export function StageFileCard({
  projectId,
  title,
  hint,
  value,
  onChange,
  disabled,
}: StageFileCardProps) {
  const { t } = useTranslation('projects')
  const inputRef = useRef<HTMLInputElement>(null)
  const localUrlRef = useRef<string | null>(null)
  const preferLocalRef = useRef(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadPercent, setUploadPercent] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<PreviewState | null>(null)

  const clearLocal = () => {
    if (localUrlRef.current) {
      URL.revokeObjectURL(localUrlRef.current)
      localUrlRef.current = null
    }
  }

  useEffect(() => {
    let cancelled = false
    if (!value) {
      preferLocalRef.current = false
      clearLocal()
      setPreview(null)
      return
    }
    if (preferLocalRef.current) {
      preferLocalRef.current = false
      return
    }
    const fileId = fileIdFromStorageKey(value)
    if (!fileId) {
      setPreview(null)
      return
    }
    void getDownloadUrl(fileId)
      .then((result) => {
        if (cancelled) return
        clearLocal()
        setPreview({
          url: result.downloadUrl,
          mime: result.mime,
          name: result.originalName,
        })
      })
      .catch(() => {
        if (!cancelled) setPreview(null)
      })
    return () => {
      cancelled = true
    }
  }, [value])

  useEffect(() => () => clearLocal(), [])

  const upload = async (file: File | undefined) => {
    if (!file || disabled || isUploading) return
    setIsUploading(true)
    setUploadPercent(0)
    try {
      clearLocal()
      if (file.type.startsWith('image/')) {
        const localUrl = URL.createObjectURL(file)
        localUrlRef.current = localUrl
        setPreview({ url: localUrl, mime: file.type, name: file.name })
      } else {
        setPreview({
          url: '',
          mime: file.type || 'application/octet-stream',
          name: file.name,
        })
      }

      const uploaded = await uploadFile({
        file,
        entityType: 'PROJECT',
        entityId: projectId,
        onProgress: (percent) => setUploadPercent(percent),
      })

      if (!uploaded?.key) {
        throw new Error(t('stages.couldNotUploadFile'))
      }

      preferLocalRef.current = true
      onChange(uploaded.key)
      toast.success(t('stages.fileUploaded'))
    } catch (error) {
      clearLocal()
      setPreview(null)
      toast.error(error instanceof Error ? error.message : t('stages.couldNotUploadFile'))
    } finally {
      setIsUploading(false)
      setUploadPercent(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const path = value ?? ''
  const hasFile = Boolean(path)
  const showAttached = hasFile || isUploading
  const showImage = preview && isImageMime(preview.mime) && preview.url

  const handleView = async () => {
    const fileId = fileIdFromStorageKey(path)
    if (!fileId) return
    try {
      const result = await getDownloadUrl(fileId)
      window.open(result.downloadUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('stages.couldNotOpenFile'))
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,.xls,.xlsx"
          disabled={disabled || isUploading}
          onChange={(event) => void upload(event.target.files?.[0])}
        />

        {showAttached ? (
          <>
            <div className="relative flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-background">
                {showImage ? (
                  <img src={preview.url} alt="" className="size-full object-cover" />
                ) : isImageMime(preview?.mime) ? (
                  <ImageIcon className="size-6 text-muted-foreground" />
                ) : (
                  <FileText className="size-6 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {preview?.name || path.split('/').pop() || t('stages.fileAttached')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isUploading
                    ? uploadPercent != null
                      ? t('stages.uploadingPercent', { percent: uploadPercent })
                      : t('stages.uploading')
                    : t('stages.fileReady')}
                </p>
              </div>
              {isUploading ? (
                <Loader2 className="size-5 shrink-0 animate-spin text-primary" aria-hidden />
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={disabled || isUploading || !hasFile}
                onClick={() => void handleView()}
              >
                {t('stages.viewFile')}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={disabled || isUploading}
                onClick={() => inputRef.current?.click()}
              >
                {isUploading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  t('stages.replaceFile')
                )}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={disabled || isUploading || !hasFile}
                onClick={() => {
                  clearLocal()
                  setPreview(null)
                  onChange('')
                }}
              >
                {t('stages.removeFile')}
              </Button>
            </div>
          </>
        ) : (
          <button
            type="button"
            disabled={disabled || isUploading}
            onClick={() => inputRef.current?.click()}
            onDragEnter={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragOver={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={(event) => {
              event.preventDefault()
              setIsDragging(false)
            }}
            onDrop={(event) => {
              event.preventDefault()
              setIsDragging(false)
              void upload(event.dataTransfer.files?.[0])
            }}
            className={cn(
              'flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors',
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 bg-muted/20',
              'hover:border-primary/60 hover:bg-muted/40',
              'disabled:pointer-events-none disabled:opacity-60',
            )}
          >
            <Upload className="size-8 text-muted-foreground" />
            <span className="text-sm font-medium">{t('stages.dropFile')}</span>
            <span className="text-xs text-muted-foreground">{t('stages.dropFileHint')}</span>
          </button>
        )}
      </CardContent>
    </Card>
  )
}
