import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { uploadFile } from '@/services/files'

type StageFileFieldProps = {
  projectId: string
  label: string
  value: string
  onChange: (path: string) => void
  disabled?: boolean
}

export function StageFileField({
  projectId,
  label,
  value,
  onChange,
  disabled,
}: StageFileFieldProps) {
  const { t } = useTranslation('projects')
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleUpload = async (file: File | undefined) => {
    if (!file) return
    setIsUploading(true)
    try {
      const uploaded = await uploadFile({
        file,
        entityType: 'PROJECT',
        entityId: projectId,
      })
      onChange(uploaded.key)
      toast.success(t('stages.fileUploaded'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('stages.couldNotUploadFile'))
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <Field>
      <Label>{label}</Label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          readOnly
          value={value}
          placeholder={t('stages.filePathPlaceholder')}
          className="min-w-0 flex-1 font-mono text-xs"
        />
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          disabled={disabled || isUploading}
          onChange={(event) => void handleUpload(event.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? t('stages.uploading') : t('stages.uploadFile')}
        </Button>
        {value ? (
          <Button type="button" variant="ghost" disabled={disabled} onClick={() => onChange('')}>
            {t('stages.clearFile')}
          </Button>
        ) : null}
      </div>
    </Field>
  )
}
