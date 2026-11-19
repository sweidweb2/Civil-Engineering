import { useState } from 'react'
import { router } from 'expo-router'
import { Calendar, FileText } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import {
  EMPTY_PROJECT_FORM,
  type ProjectFormErrors,
  type ProjectFormValues,
  validateProject,
} from '@/features/pm/projectForm'
import { WkChoice, WkField, WkFormScreen, WkSection } from '@/features/worker/ui/forms'
import { WkGalleryCard } from '@/features/worker/ui/GalleryCard'
import { WkButton } from '@/features/worker/ui/kit'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { enumOptions } from '@/i18n/labels'
import { invalidateProjectCaches } from '@/lib/cacheKeys'
import type { PickedFile } from '@/services/filePicker'
import { uploadQueuedImages } from '@/services/galleryImages'
import { createProject, PROJECT_TYPE_OPTIONS, type ProjectType } from '@/services/projects'
import { useToastApiError, useToastSuccess } from '@/services/toast'

const BASE = '/pm/projects'

/** PM "New project": basics, schedule, photos (uploaded after create). */
export function PmNewProjectScreen() {
  const { t } = useTranslation()
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()
  const toastApiError = useToastApiError()
  const [form, setForm] = useState<ProjectFormValues>(EMPTY_PROJECT_FORM)
  const [errors, setErrors] = useState<ProjectFormErrors>({})
  const [isSaving, setIsSaving] = useState(false)
  const [queuedImages, setQueuedImages] = useState<PickedFile[]>([])

  const set =
    <K extends keyof ProjectFormValues>(key: K) =>
    (value: ProjectFormValues[K]) => {
      setForm((f) => ({ ...f, [key]: value }))
      if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
    }

  async function onCreate() {
    const e = validateProject(t, form)
    if (Object.keys(e).length) {
      setErrors(e)
      return
    }
    setIsSaving(true)
    try {
      const created = await createProject({
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        description: form.description.trim() || undefined,
        type: form.type || undefined,
        startDate: form.startDate.trim() || null,
        endDate: form.endDate.trim() || null,
      })
      toastSuccess(t('projects.created'))
      if (queuedImages.length > 0) {
        const failed = await uploadQueuedImages('project', created.data.id, queuedImages)
        if (failed > 0) toastApiError(new Error(t('gallery.someFailed', { count: failed })))
      }
      // After uploads so list thumbnails aren't cached without images.
      invalidateProjectCaches()
      router.replace(`${BASE}/${created.data.id}` as never)
    } catch (err) {
      handleApiError(err, t('projects.createFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  const date = {
    placeholder: 'YYYY-MM-DD',
    ltr: true,
    autoCapitalize: 'none' as const,
    maxLength: 10,
  }

  return (
    <WkFormScreen
      title={t('projects.new')}
      backHref={BASE}
      testID="e2e-pm-project-new"
      footer={
        <WkButton
          label={isSaving ? t('common.creating') : t('projects.create')}
          loading={isSaving}
          height={54}
          onPress={() => void onCreate()}
        />
      }
    >
      <WkSection icon={FileText} title={t('pmPortal.basics')}>
        <WkField
          label={t('projects.name')}
          required
          value={form.name}
          onChangeText={set('name')}
          placeholder={t('projects.namePlaceholder')}
          error={errors.name}
        />
        <WkField
          label={t('pmPortal.code')}
          value={form.code}
          onChangeText={set('code')}
          placeholder={t('pmPortal.codePlaceholder')}
          autoCapitalize="characters"
          ltr
        />
        <WkChoice
          label={t('projects.type')}
          options={enumOptions(t, 'projectType', PROJECT_TYPE_OPTIONS)}
          value={form.type}
          onChange={(v) => set('type')(v as ProjectType)}
        />
        <WkField
          label={t('common.description')}
          multiline
          value={form.description}
          onChangeText={set('description')}
          placeholder={t('pmPortal.descPlaceholder')}
        />
      </WkSection>

      <WkSection icon={Calendar} title={t('projects.schedule')}>
        <WkField
          label={t('projects.start')}
          value={form.startDate}
          onChangeText={set('startDate')}
          error={errors.startDate}
          {...date}
        />
        <WkField
          label={t('projects.end')}
          value={form.endDate}
          onChangeText={set('endDate')}
          error={errors.endDate}
          {...date}
        />
      </WkSection>

      <WkGalleryCard kind="project" onQueueChange={setQueuedImages} disabled={isSaving} />
    </WkFormScreen>
  )
}
