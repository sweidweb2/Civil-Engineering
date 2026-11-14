import { useEffect, useRef, useState } from 'react'
import { FileText, ImageIcon, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { fileIdFromStorageKey, isImageMime } from '@/features/projects/lib/stage-file-key'
import { cn } from '@/lib/utils'
import { getDownloadUrl, uploadFile } from '@/services/files'

type StageFileFieldProps = {
  projectId: string
  label: string
  placeholder: string
  value: string
  onChange: (path: string) => void
  disabled?: boolean
}

type PreviewState = {
  url: string
  mime: string
  name: string
  local?: boolean
}

export function StageFileField({
  projectId,
  label,
  placeholder,
  value,
  onChange,
  disabled,
}: StageFileFieldProps) {
  const { t } = useTranslation('projects')
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const localUrlRef = useRef<string | null>(null)
  const preferLocalPreviewRef = useRef(false)

  const clearLocalUrl = () => {
    if (localUrlRef.current) {
      URL.revokeObjectURL(localUrlRef.current)
      localUrlRef.current = null
    }
  }

  useEffect(() => {
    let cancelled = false

    if (!value) {
      preferLocalPreviewRef.current = false
      clearLocalUrl()
      setPreview(null)
      setIsLoadingPreview(false)
      return
    }

    if (preferLocalPreviewRef.current) {
      preferLocalPreviewRef.current = false
      return
    }

    const fileId = fileIdFromStorageKey(value)
    if (!fileId) {
      setPreview(null)
      return
    }

    setIsLoadingPreview(true)
    void getDownloadUrl(fileId)
      .then((result) => {
        if (cancelled) return
        clearLocalUrl()
        setPreview({
          url: result.downloadUrl,
          mime: result.mime,
          name: result.originalName,
        })
      })
      .catch(() => {
        if (cancelled) return
        setPreview(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPreview(false)
      })

    return () => {
      cancelled = true
    }
  }, [value])

  useEffect(() => () => clearLocalUrl(), [])

  const handleUpload = async (file: File | undefined) => {
    if (!file) return
    setIsUploading(true)
    try {
      clearLocalUrl()
      if (file.type.startsWith('image/')) {
        const localUrl = URL.createObjectURL(file)
        localUrlRef.current = localUrl
        setPreview({
          url: localUrl,
          mime: file.type,
          name: file.name,
          local: true,
        })
      } else {
        setPreview({
          url: '',
          mime: file.type || 'application/octet-stream',
          name: file.name,
          local: true,
        })
      }

      const uploaded = await uploadFile({
        file,
        entityType: 'PROJECT',
        entityId: projectId,
      })
      preferLocalPreviewRef.current = true
      onChange(uploaded.key)
      toast.success(t('stages.fileUploaded'))
    } catch (error) {
      clearLocalUrl()
      setPreview(null)
      toast.error(error instanceof Error ? error.message : t('stages.couldNotUploadFile'))
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleClear = () => {
    clearLocalUrl()
    setPreview(null)
    onChange('')
  }

  const showImage = preview && isImageMime(preview.mime) && preview.url

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-1 pb-3">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <p className="text-xs text-muted-foreground">{placeholder}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          className={cn(
            'relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg border bg-muted/40',
            !value && 'border-dashed',
          )}
        >
          {isLoadingPreview && !preview ? (
            <span className="text-xs text-muted-foreground">{t('stages.loadingPreview')}</span>
          ) : showImage ? (
            <img src={preview.url} alt={preview.name || label} className="size-full object-cover" />
          ) : value || preview ? (
            <div className="flex flex-col items-center gap-2 px-3 text-center">
              {isImageMime(preview?.mime) ? (
                <ImageIcon className="size-10 text-muted-foreground" aria-hidden />
              ) : (
                <FileText className="size-10 text-muted-foreground" aria-hidden />
              )}
              <span className="line-clamp-2 text-xs font-medium text-foreground">
                {preview?.name || value.split('/').pop() || t('stages.fileAttached')}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 px-3 text-center text-muted-foreground">
              <Upload className="size-8" aria-hidden />
              <span className="text-xs">{t('stages.noFileCover')}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="sr-only">{label}</Label>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,.xls,.xlsx"
            disabled={disabled || isUploading}
            onChange={(event) => void handleUpload(event.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={disabled || isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? t('stages.uploading') : t('stages.uploadFile')}
          </Button>
          {value ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={disabled}
              onClick={handleClear}
            >
              {t('stages.clearFile')}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
