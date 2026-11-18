import { useEffect, useState } from 'react'
import { router } from 'expo-router'
import { BadgeDollarSign, Eye } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { ChoiceField, FormScreen, Section, TextField, ToggleRow } from '@/components/kit'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { useWorkerProfile } from '@/features/worker/useWorkerProfile'
import { workerRatesSchema, type WorkerRatesValues } from '@/features/worker/worker.schema'
import { enumOptions } from '@/i18n/labels'
import { type FieldErrors, parseForm } from '@/lib/form'
import { WORKER_AVAILABILITY_OPTIONS } from '@/services/workers'

const EMPTY: WorkerRatesValues = {
  hourlyRate: null,
  dailyRate: null,
  currency: null,
  availability: 'AVAILABLE',
  isPublic: false,
  cvUrl: null,
}

export function WorkerRatesScreen() {
  const { t } = useTranslation()
  const { profile, isReady, isLoading, error, refetch, isSaving, saveMerged } = useWorkerProfile()
  const [form, setForm] = useState<WorkerRatesValues>(EMPTY)
  const [errors, setErrors] = useState<FieldErrors>({})

  useEffect(() => {
    if (!profile) return
    setForm({
      hourlyRate: profile.hourlyRate,
      dailyRate: profile.dailyRate,
      currency: profile.currency,
      availability: profile.availability,
      isPublic: profile.isPublic,
      cvUrl: profile.cvUrl,
    })
  }, [profile])

  async function onSave() {
    const parsed = parseForm(workerRatesSchema, form)
    if (!parsed.success) {
      setErrors(parsed.fieldErrors)
      return
    }
    setErrors({})
    const ok = await saveMerged(parsed.data)
    if (ok) router.back()
  }

  return (
    <FormScreen
      title={t('worker.sections.rates')}
      subtitle={t('worker.ratesHint')}
      backHref="/worker/cv"
      isLoading={isLoading}
      error={error}
      onRetry={() => void refetch({ fresh: true })}
      loadingLabel={t('worker.loading')}
      footer={
        <Button onPress={() => void onSave()} disabled={isSaving || !isReady} className="w-full">
          {isSaving ? <ButtonSpinner /> : null}
          <ButtonText>{isSaving ? t('common.saving') : t('common.save')}</ButtonText>
        </Button>
      }
    >
      <Section title={t('worker.pay')} icon={BadgeDollarSign}>
        <TextField
          label={t('worker.hourlyRate')}
          value={form.hourlyRate ?? ''}
          onChangeText={(value) => setForm((c) => ({ ...c, hourlyRate: value }))}
          error={errors.hourlyRate}
          keyboardType="decimal-pad"
          placeholder="0"
        />
        <TextField
          label={t('worker.dailyRate')}
          value={form.dailyRate ?? ''}
          onChangeText={(value) => setForm((c) => ({ ...c, dailyRate: value }))}
          error={errors.dailyRate}
          keyboardType="decimal-pad"
          placeholder="0"
        />
        <TextField
          label={t('worker.currency')}
          value={form.currency ?? ''}
          onChangeText={(value) => setForm((c) => ({ ...c, currency: value.toUpperCase() }))}
          error={errors.currency}
          placeholder="USD"
          autoCapitalize="characters"
        />
        <ChoiceField
          label={t('worker.availability')}
          value={form.availability}
          onChange={(value) =>
            setForm((c) => ({
              ...c,
              availability: value as WorkerRatesValues['availability'],
            }))
          }
          options={enumOptions(t, 'workerAvailability', WORKER_AVAILABILITY_OPTIONS)}
        />
      </Section>

      <Section title={t('worker.visibility')} icon={Eye}>
        <ToggleRow
          label={t('worker.isPublic')}
          description={t('worker.isPublicHint')}
          value={form.isPublic}
          onValueChange={(value) => setForm((c) => ({ ...c, isPublic: value }))}
        />
        <TextField
          label={t('worker.cvUrl')}
          value={form.cvUrl ?? ''}
          onChangeText={(value) => setForm((c) => ({ ...c, cvUrl: value }))}
          error={errors.cvUrl}
          placeholder="https://"
          autoCapitalize="none"
          helper={t('worker.cvUrlHint')}
        />
      </Section>
    </FormScreen>
  )
}
