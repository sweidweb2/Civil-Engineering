import { useState } from 'react'
import { router } from 'expo-router'
import { FolderKanban, Images } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { GalleryImagesField } from '@/components/files/GalleryImagesField'
import { ChoiceField, FieldRow, FormError, FormScreen, Section, TextField } from '@/components/kit'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { enumOptions } from '@/i18n/labels'
import { invalidateProjectCaches } from '@/lib/cacheKeys'
import type { PickedFile } from '@/services/filePicker'
import { uploadQueuedImages } from '@/services/galleryImages'
import { createProject, PROJECT_TYPE_OPTIONS, type ProjectType } from '@/services/projects'
import { useToastApiError, useToastSuccess } from '@/services/toast'

type PmProjectCreateScreenProps = {
  basePath?: string
}

export function PmProjectCreateScreen({ basePath = '/pm/projects' }: PmProjectCreateScreenProps) {
  const { t } = useTranslation()
  const toastApiError = useToastApiError()
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<ProjectType | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [isSaving, setIsSaving] = useState(false)
  const [queuedImages, setQueuedImages] = useState<PickedFile[]>([])

  async function onCreate() {
    if (!name.trim()) {
      setError(t('projects.nameRequired'))
      return
    }
    setError(undefined)
    setIsSaving(true)
    try {
      const created = await createProject({
        name: name.trim(),
        code: code.trim() || undefined,
        description: description.trim() || undefined,
        type: type || undefined,
        startDate: startDate.trim() || null,
        endDate: endDate.trim() || null,
      })
      invalidateProjectCaches()
      toastSuccess(t('projects.created'))
      if (queuedImages.length > 0) {
        const failed = await uploadQueuedImages('project', created.data.id, queuedImages)
        if (failed > 0) toastApiError(new Error(t('gallery.someFailed', { count: failed })))
      }
      router.replace(`${basePath}/${created.data.id}` as never)
    } catch (err) {
      handleApiError(err, t('projects.createFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <FormScreen
      title={t('projects.new')}
      backHref={basePath}
      footer={
        <Button
          className="flex-1"
          onPress={() => void onCreate()}
          disabled={isSaving}
          accessibilityState={{ busy: isSaving }}
        >
          {isSaving ? <ButtonSpinner /> : null}
          <ButtonText>{isSaving ? t('common.creating') : t('projects.create')}</ButtonText>
        </Button>
      }
    >
      <FormError message={error} />
      <Section title={t('projects.basics')} icon={FolderKanban}>
        <TextField
          label={t('projects.name')}
          required
          value={name}
          onChangeText={setName}
          placeholder={t('projects.namePlaceholder')}
        />
        <TextField
          label={t('projects.code')}
          value={code}
          onChangeText={setCode}
          placeholder={t('common.optional')}
        />
        <ChoiceField
          label={t('projects.type')}
          options={enumOptions(t, 'projectType', PROJECT_TYPE_OPTIONS)}
          value={type}
          allowClear
          onChange={(value) => setType(value as ProjectType | '')}
        />
        <TextField
          label={t('common.description')}
          multiline
          value={description}
          onChangeText={setDescription}
        />
      </Section>
      <Section title={t('projects.schedule')}>
        <FieldRow>
          <TextField
            label={t('projects.start')}
            value={startDate}
            onChangeText={setStartDate}
            placeholder="2026-01-01"
            helper={t('common.dateFormat')}
            autoCapitalize="none"
          />
          <TextField
            label={t('projects.end')}
            value={endDate}
            onChangeText={setEndDate}
            placeholder="2026-12-31"
            helper={t('common.dateFormat')}
            autoCapitalize="none"
          />
        </FieldRow>
      </Section>
      <Section title={t('gallery.title')} icon={Images} tone="info">
        <GalleryImagesField kind="project" onQueueChange={setQueuedImages} disabled={isSaving} />
      </Section>
    </FormScreen>
  )
}
