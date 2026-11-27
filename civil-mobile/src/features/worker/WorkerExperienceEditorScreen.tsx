import { useState } from 'react'
import { router } from 'expo-router'
import { AlignLeft, Briefcase, Calendar } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { WkDangerZone, WkField, WkFormScreen, WkSection, WkToggle } from '@/components/wk/forms'
import { WkButton, WkConfirm, type WkConfirmState } from '@/components/wk/kit'
import { useWorkerProfile } from '@/features/worker/useWorkerProfile'
import {
  workerExperienceSchema,
  type WorkerExperienceValues,
} from '@/features/worker/worker.schema'
import { useSeedOnce } from '@/hooks/useSeedOnce'
import { type FieldErrors, parseForm } from '@/lib/form'
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
  const [confirm, setConfirm] = useState<WkConfirmState | null>(null)

  // Seed once: background refetches must not wipe unsaved edits.
  const seedItem = isNew || Number.isNaN(index) ? null : profile?.experiences[index]
  useSeedOnce(seedItem, (item) => {
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
  })

  function toWrite(values: WorkerExperienceValues, sortOrder: number): WorkerExperienceWrite {
    return { ...values, sortOrder }
  }

  async function onSave() {
    const parsed = parseForm(workerExperienceSchema(t), {
      ...form,
      endDate: form.isCurrent ? null : form.endDate,
    })
    if (!parsed.success) {
      setErrors(parsed.fieldErrors)
      return
    }
    setErrors({})
    const ok = await saveMerged(
      ({ profile: latest, base }) => {
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
          experiences: current.map((item, i) =>
            i === freshIndex ? toWrite(parsed.data, i) : item,
          ),
        }
      },
      { successMessage: isNew ? t('worker.addedToCv') : t('worker.changesSaved') },
    )
    if (ok) router.back()
  }

  function onDelete() {
    if (isNew || !itemId) return
    setConfirm({
      title: t('worker.deleteItemTitle'),
      body: t('worker.deleteItemBody'),
      cta: t('common.delete'),
      onConfirm: () => {
        setConfirm(null)
        void (async () => {
          const ok = await saveMerged(
            ({ profile: latest, base }) => {
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
            },
            { successMessage: t('worker.deleted') },
          )
          if (ok) router.back()
        })()
      },
    })
  }

  return (
    <WkFormScreen
      title={isNew ? t('worker.addExperience') : t('worker.editExperience')}
      backHref="/worker/cv/experience"
      isLoading={isLoading}
      error={error}
      onRetry={() => void refetch({ fresh: true })}
      footer={
        <WkButton
          label={isNew ? t('worker.addToCv') : t('worker.saveChanges')}
          loading={isSaving}
          disabled={!isReady}
          onPress={() => void onSave()}
        />
      }
    >
      <WkSection icon={Briefcase} title={t('worker.roleSection')}>
        <WkField
          label={t('worker.roleTitle')}
          required
          value={form.roleTitle}
          onChangeText={(value) => setForm((c) => ({ ...c, roleTitle: value }))}
          error={errors.roleTitle}
        />
        <WkField
          label={t('worker.company')}
          required
          value={form.company}
          onChangeText={(value) => setForm((c) => ({ ...c, company: value }))}
          error={errors.company}
        />
        <WkField
          label={t('worker.projectType')}
          value={form.projectType ?? ''}
          onChangeText={(value) => setForm((c) => ({ ...c, projectType: value }))}
          error={errors.projectType}
        />
        <WkField
          label={t('worker.jobLocation')}
          value={form.location ?? ''}
          onChangeText={(value) => setForm((c) => ({ ...c, location: value }))}
          error={errors.location}
        />
      </WkSection>
      <WkSection icon={Calendar} title={t('worker.datesSection')}>
        <WkField
          label={t('worker.startDate')}
          value={form.startDate ?? ''}
          onChangeText={(value) => setForm((c) => ({ ...c, startDate: value }))}
          error={errors.startDate}
          placeholder={t('common.dateFormat')}
          keyboardType="numbers-and-punctuation"
          ltr
        />
        <WkToggle
          label={t('worker.currentRole')}
          value={form.isCurrent}
          onChange={(value) =>
            setForm((c) => ({ ...c, isCurrent: value, endDate: value ? null : c.endDate }))
          }
        />
        {!form.isCurrent ? (
          <WkField
            label={t('worker.endDate')}
            value={form.endDate ?? ''}
            onChangeText={(value) => setForm((c) => ({ ...c, endDate: value }))}
            error={errors.endDate}
            placeholder={t('common.dateFormat')}
            keyboardType="numbers-and-punctuation"
            ltr
          />
        ) : null}
      </WkSection>
      <WkSection icon={AlignLeft} title={t('worker.descriptionSection')}>
        <WkField
          label={t('common.description')}
          value={form.description ?? ''}
          onChangeText={(value) => setForm((c) => ({ ...c, description: value }))}
          error={errors.description}
          placeholder={t('worker.descriptionPlaceholder')}
          multiline
        />
      </WkSection>
      {!isNew ? (
        <WkDangerZone
          title={t('common.dangerZone')}
          body={t('worker.dangerBody')}
          label={t('common.delete')}
          disabled={isSaving || !isReady}
          onPress={onDelete}
        />
      ) : null}
      <WkConfirm state={confirm} onCancel={() => setConfirm(null)} />
    </WkFormScreen>
  )
}
