import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { GraduationCap } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { FormScreen, Section, TextField } from '@/components/kit'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { useWorkerProfile } from '@/features/worker/useWorkerProfile'
import { workerEducationSchema, type WorkerEducationValues } from '@/features/worker/worker.schema'
import { type FieldErrors, parseForm } from '@/lib/form'
import { showBlockingAlert } from '@/services/feedback'
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

  useEffect(() => {
    if (isNew || !profile || Number.isNaN(index) || !profile.education[index]) return
    const item = profile.education[index]
    setForm({
      school: item.school,
      degree: item.degree,
      field: item.field,
      startYear: item.startYear,
      endYear: item.endYear,
    })
  }, [index, isNew, profile])

  function toWrite(values: WorkerEducationValues, sortOrder: number): WorkerEducationWrite {
    return { ...values, sortOrder }
  }

  async function onSave() {
    const parsed = parseForm(workerEducationSchema, form)
    if (!parsed.success) {
      setErrors(parsed.fieldErrors)
      return
    }
    setErrors({})
    const ok = await saveMerged(({ profile: latest, base }) => {
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
          })
          if (ok) router.back()
        })()
      },
    })
  }

  return (
    <FormScreen
      title={isNew ? t('worker.addEducation') : t('worker.editEducation')}
      backHref="/worker/cv/education"
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
          {!isNew ? (
            <Button
              variant="destructive"
              onPress={onDelete}
              disabled={isSaving || !isReady}
              className="w-full"
            >
              <ButtonText>{t('common.delete')}</ButtonText>
            </Button>
          ) : null}
        </View>
      }
    >
      <Section title={t('worker.sections.education')} icon={GraduationCap}>
        <TextField
          label={t('worker.school')}
          required
          value={form.school}
          onChangeText={(value) => setForm((c) => ({ ...c, school: value }))}
          error={errors.school}
        />
        <TextField
          label={t('worker.degree')}
          value={form.degree ?? ''}
          onChangeText={(value) => setForm((c) => ({ ...c, degree: value }))}
          error={errors.degree}
        />
        <TextField
          label={t('worker.field')}
          value={form.field ?? ''}
          onChangeText={(value) => setForm((c) => ({ ...c, field: value }))}
          error={errors.field}
        />
        <TextField
          label={t('worker.startYear')}
          value={form.startYear == null ? '' : String(form.startYear)}
          onChangeText={(value) => {
            const trimmed = value.trim()
            if (!trimmed) {
              setForm((c) => ({ ...c, startYear: null }))
              return
            }
            const parsed = Number.parseInt(trimmed, 10)
            setForm((c) => ({
              ...c,
              startYear: Number.isFinite(parsed) ? parsed : c.startYear,
            }))
          }}
          keyboardType="number-pad"
          error={errors.startYear}
        />
        <TextField
          label={t('worker.endYear')}
          value={form.endYear == null ? '' : String(form.endYear)}
          onChangeText={(value) => {
            const trimmed = value.trim()
            if (!trimmed) {
              setForm((c) => ({ ...c, endYear: null }))
              return
            }
            const parsed = Number.parseInt(trimmed, 10)
            setForm((c) => ({
              ...c,
              endYear: Number.isFinite(parsed) ? parsed : c.endYear,
            }))
          }}
          keyboardType="number-pad"
          error={errors.endYear}
        />
      </Section>
    </FormScreen>
  )
}
