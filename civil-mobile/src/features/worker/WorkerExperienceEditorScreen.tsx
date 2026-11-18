import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'

import { DangerZone, FormScreen, Section, TextField, ToggleRow } from '@/components/kit'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { useWorkerProfile } from '@/features/worker/useWorkerProfile'
import {
  workerExperienceSchema,
  type WorkerExperienceValues,
} from '@/features/worker/worker.schema'
import { type FieldErrors, parseForm } from '@/lib/form'
import { showBlockingAlert } from '@/services/feedback'
import type { WorkerExperienceWrite } from '@/services/workers'

const EMPTY: WorkerExperienceValues = {
  company: '',
  roleTitle: '',
  projectType: null,
  location: null,
  startDate: null,
  endDate: null,
  isCurrent: false,
  description: null,
}

type Props = { indexParam: string }

export function WorkerExperienceEditorScreen({ indexParam }: Props) {
  const { t } = useTranslation()
  const { profile, isReady, isLoading, error, refetch, isSaving, saveMerged } = useWorkerProfile()
  const isNew = indexParam === 'new'
  const index = isNew ? -1 : Number.parseInt(indexParam, 10)
  const itemId = !isNew && profile?.experiences[index] ? profile.experiences[index].id : null
  const [form, setForm] = useState<WorkerExperienceValues>(EMPTY)
  const [errors, setErrors] = useState<FieldErrors>({})

  useEffect(() => {
    if (isNew || !profile || Number.isNaN(index) || !profile.experiences[index]) return
    const item = profile.experiences[index]
    setForm({
      company: item.company,
      roleTitle: item.roleTitle,
      projectType: item.projectType,
      location: item.location,
      startDate: item.startDate,
      endDate: item.endDate,
      isCurrent: item.isCurrent,
      description: item.description,
    })
  }, [index, isNew, profile])

  function toWrite(values: WorkerExperienceValues, sortOrder: number): WorkerExperienceWrite {
    return { ...values, sortOrder }
  }

  async function onSave() {
    const parsed = parseForm(workerExperienceSchema, {
      ...form,
      endDate: form.isCurrent ? null : form.endDate,
    })
    if (!parsed.success) {
      setErrors(parsed.fieldErrors)
      return
    }
    setErrors({})
    const ok = await saveMerged(({ profile: latest, base }) => {
      const current = base.experiences
      if (isNew || !itemId) {
        return {
          ...base,
          experiences: [...current, toWrite(parsed.data, current.length)],
        }
      }
      const freshIndex = latest?.experiences.findIndex((item) => item.id === itemId) ?? -1
      if (freshIndex < 0) {
        return {
          ...base,
          experiences: [...current, toWrite(parsed.data, current.length)],
        }
      }
      return {
        ...base,
        experiences: current.map((item, i) => (i === freshIndex ? toWrite(parsed.data, i) : item)),
      }
    })
    if (ok) router.back()
  }

  function onDelete() {
    if (isNew || !itemId) return
    showBlockingAlert(t('worker.deleteItemTitle'), t('worker.deleteItemBody'), {
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      onConfirm: () => {
        void (async () => {
          const ok = await saveMerged(({ profile: latest, base }) => {
            const experiences = (latest?.experiences ?? [])
              .filter((item) => item.id !== itemId)
              .map((item, i) =>
                toWrite(
                  {
                    company: item.company,
                    roleTitle: item.roleTitle,
                    projectType: item.projectType,
                    location: item.location,
                    startDate: item.startDate,
                    endDate: item.endDate,
                    isCurrent: item.isCurrent,
                    description: item.description,
                  },
                  i,
                ),
              )
            return { ...base, experiences }
          })
          if (ok) router.back()
        })()
      },
    })
  }

  return (
    <FormScreen
      title={isNew ? t('worker.addExperience') : t('worker.editExperience')}
      backHref="/worker/cv/experience"
      isLoading={isLoading}
      error={error}
      onRetry={() => void refetch({ fresh: true })}
      loadingLabel={t('worker.loading')}
      footer={
        <View className="min-w-0 flex-1 gap-2">
          <Button onPress={() => void onSave()} disabled={isSaving || !isReady} className="w-full">
            {isSaving ? <ButtonSpinner /> : null}
            <ButtonText>{isSaving ? t('common.saving') : t('common.save')}</ButtonText>
          </Button>
        </View>
      }
    >
      <Section title={t('worker.sections.experience')}>
        <TextField
          label={t('worker.roleTitle')}
          required
          value={form.roleTitle}
          onChangeText={(value) => setForm((c) => ({ ...c, roleTitle: value }))}
          error={errors.roleTitle}
        />
        <TextField
          label={t('worker.company')}
          required
          value={form.company}
          onChangeText={(value) => setForm((c) => ({ ...c, company: value }))}
          error={errors.company}
        />
        <TextField
          label={t('worker.projectType')}
          value={form.projectType ?? ''}
          onChangeText={(value) => setForm((c) => ({ ...c, projectType: value }))}
          error={errors.projectType}
        />
        <TextField
          label={t('worker.jobLocation')}
          value={form.location ?? ''}
          onChangeText={(value) => setForm((c) => ({ ...c, location: value }))}
          error={errors.location}
        />
        <ToggleRow
          label={t('worker.currentRole')}
          description={t('worker.currentRoleHint')}
          value={form.isCurrent}
          onValueChange={(value) =>
            setForm((c) => ({ ...c, isCurrent: value, endDate: value ? null : c.endDate }))
          }
        />
        <TextField
          label={t('worker.startDate')}
          value={form.startDate ?? ''}
          onChangeText={(value) => setForm((c) => ({ ...c, startDate: value }))}
          error={errors.startDate}
          placeholder={t('common.dateFormat')}
          helper={t('common.dateFormat')}
        />
        {!form.isCurrent ? (
          <TextField
            label={t('worker.endDate')}
            value={form.endDate ?? ''}
            onChangeText={(value) => setForm((c) => ({ ...c, endDate: value }))}
            error={errors.endDate}
            placeholder={t('common.dateFormat')}
          />
        ) : null}
        <TextField
          label={t('common.description')}
          value={form.description ?? ''}
          onChangeText={(value) => setForm((c) => ({ ...c, description: value }))}
          error={errors.description}
          multiline
        />
      </Section>
      {!isNew ? (
        <DangerZone title={t('common.dangerZone')}>
          <Button variant="destructive" onPress={onDelete} disabled={isSaving || !isReady}>
            <ButtonText>{t('common.delete')}</ButtonText>
          </Button>
        </DangerZone>
      ) : null}
    </FormScreen>
  )
}
