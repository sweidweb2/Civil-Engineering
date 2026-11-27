import { useState } from 'react'
import { router } from 'expo-router'
import { Calendar, GraduationCap } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { WkDangerZone, WkField, WkFormScreen, WkSection } from '@/components/wk/forms'
import { WkButton, WkConfirm, type WkConfirmState } from '@/components/wk/kit'
import { useWorkerProfile } from '@/features/worker/useWorkerProfile'
import { workerEducationSchema, type WorkerEducationValues } from '@/features/worker/worker.schema'
import { useSeedOnce } from '@/hooks/useSeedOnce'
import { type FieldErrors, parseForm } from '@/lib/form'
import type { WorkerEducationWrite } from '@/services/workers'

const EMPTY: WorkerEducationValues = {
  school: '',
  degree: null,
  field: null,
  startYear: null,
  endYear: null,
}

type Props = { indexParam: string }

export function WorkerEducationEditorScreen({ indexParam }: Props) {
  const { t } = useTranslation()
  const { profile, isReady, isLoading, error, refetch, isSaving, saveMerged } = useWorkerProfile()
  const isNew = indexParam === 'new'
  const index = isNew ? -1 : Number.parseInt(indexParam, 10)
  const itemId = !isNew && profile?.education[index] ? profile.education[index].id : null
  const [form, setForm] = useState<WorkerEducationValues>(EMPTY)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [confirm, setConfirm] = useState<WkConfirmState | null>(null)

  // Seed once: background refetches must not wipe unsaved edits.
  const seedItem = isNew || Number.isNaN(index) ? null : profile?.education[index]
  useSeedOnce(seedItem, (item) => {
    setForm({
      school: item.school,
      degree: item.degree,
      field: item.field,
      startYear: item.startYear,
      endYear: item.endYear,
    })
  })

  function toWrite(values: WorkerEducationValues, sortOrder: number): WorkerEducationWrite {
    return { ...values, sortOrder }
  }

  async function onSave() {
    const parsed = parseForm(workerEducationSchema(t), form)
    if (!parsed.success) {
      setErrors(parsed.fieldErrors)
      return
    }
    setErrors({})
    const ok = await saveMerged(
      ({ profile: latest, base }) => {
        const current = base.education
        if (isNew || !itemId) {
          return { ...base, education: [...current, toWrite(parsed.data, current.length)] }
        }
        const freshIndex = latest?.education.findIndex((item) => item.id === itemId) ?? -1
        if (freshIndex < 0) {
          return { ...base, education: [...current, toWrite(parsed.data, current.length)] }
        }
        return {
          ...base,
          education: current.map((item, i) => (i === freshIndex ? toWrite(parsed.data, i) : item)),
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
              const education = (latest?.education ?? [])
                .filter((item) => item.id !== itemId)
                .map((item, i) =>
                  toWrite(
                    {
                      school: item.school,
                      degree: item.degree,
                      field: item.field,
                      startYear: item.startYear,
                      endYear: item.endYear,
                    },
                    i,
                  ),
                )
              return { ...base, education }
            },
            { successMessage: t('worker.deleted') },
          )
          if (ok) router.back()
        })()
      },
    })
  }

  function setYear(key: 'startYear' | 'endYear', value: string) {
    const trimmed = value.trim()
    if (!trimmed) {
      setForm((c) => ({ ...c, [key]: null }))
      return
    }
    const parsed = Number.parseInt(trimmed, 10)
    setForm((c) => ({ ...c, [key]: Number.isFinite(parsed) ? parsed : c[key] }))
  }

  return (
    <WkFormScreen
      title={isNew ? t('worker.addEducation') : t('worker.editEducation')}
      backHref="/worker/cv/education"
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
      <WkSection icon={GraduationCap} title={t('worker.schoolSection')}>
        <WkField
          label={t('worker.school')}
          required
          value={form.school}
          onChangeText={(value) => setForm((c) => ({ ...c, school: value }))}
          error={errors.school}
        />
        <WkField
          label={t('worker.degree')}
          value={form.degree ?? ''}
          onChangeText={(value) => setForm((c) => ({ ...c, degree: value }))}
          error={errors.degree}
        />
        <WkField
          label={t('worker.field')}
          value={form.field ?? ''}
          onChangeText={(value) => setForm((c) => ({ ...c, field: value }))}
          error={errors.field}
        />
      </WkSection>
      <WkSection icon={Calendar} title={t('worker.yearsSection')}>
        <WkField
          label={t('worker.startYear')}
          value={form.startYear == null ? '' : String(form.startYear)}
          onChangeText={(value) => setYear('startYear', value)}
          keyboardType="number-pad"
          placeholder="YYYY"
          maxLength={4}
          ltr
          error={errors.startYear}
        />
        <WkField
          label={t('worker.endYear')}
          value={form.endYear == null ? '' : String(form.endYear)}
          onChangeText={(value) => setYear('endYear', value)}
          keyboardType="number-pad"
          placeholder="YYYY"
          maxLength={4}
          ltr
          error={errors.endYear}
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
