import { useEffect, useState } from 'react'
import { router } from 'expo-router'
import { Banknote, Eye } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { WkChoice, WkField, WkFormScreen, WkSection, WkToggle } from '@/features/worker/ui/forms'
import { WkButton } from '@/features/worker/ui/kit'
import { WORKER_CURRENCIES } from '@/features/worker/ui/sections'
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
    const ok = await saveMerged(parsed.data, { successMessage: t('worker.changesSaved') })
    if (ok) router.back()
  }

  const set = <K extends keyof WorkerRatesValues>(key: K, value: WorkerRatesValues[K]) => {
    setForm((c) => ({ ...c, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  // Keep a stored currency that is not in the short list selectable.
  const currencies: string[] = [...WORKER_CURRENCIES]
  if (form.currency && !currencies.includes(form.currency)) currencies.push(form.currency)
  const unit = form.currency ? ` (${form.currency})` : ''

  return (
    <WkFormScreen
      title={t('worker.sections.rates')}
      backHref="/worker/cv"
      isLoading={isLoading}
      error={error}
      onRetry={() => void refetch({ fresh: true })}
      footer={
        <WkButton
          label={t('worker.saveChanges')}
          loading={isSaving}
          disabled={!isReady}
          onPress={() => void onSave()}
        />
      }
    >
      <WkSection icon={Banknote} title={t('worker.pay')}>
        <WkField
          label={`${t('worker.hourlyRate')}${unit}`}
          value={form.hourlyRate ?? ''}
          onChangeText={(value) => set('hourlyRate', value)}
          error={errors.hourlyRate}
          keyboardType="decimal-pad"
          placeholder="0"
          ltr
        />
        <WkField
          label={`${t('worker.dailyRate')}${unit}`}
          value={form.dailyRate ?? ''}
          onChangeText={(value) => set('dailyRate', value)}
          error={errors.dailyRate}
          keyboardType="decimal-pad"
          placeholder="0"
          ltr
        />
        <WkChoice
          label={t('worker.currency')}
          value={form.currency}
          options={currencies.map((code) => ({ value: code, label: code }))}
          onChange={(value) => set('currency', value)}
          error={errors.currency}
        />
        <WkChoice
          label={t('worker.availability')}
          value={form.availability}
          options={enumOptions(t, 'workerAvailability', WORKER_AVAILABILITY_OPTIONS)}
          onChange={(value) => set('availability', value as WorkerRatesValues['availability'])}
        />
        <WkField
          label={t('worker.cvUrl')}
          value={form.cvUrl ?? ''}
          onChangeText={(value) => set('cvUrl', value)}
          error={errors.cvUrl}
          hint={t('worker.cvUrlHint')}
          placeholder="https://"
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          ltr
        />
      </WkSection>

      <WkSection icon={Eye} title={t('worker.visibility')}>
        <WkToggle
          label={t('worker.isPublic')}
          hint={t('worker.isPublicHint')}
          value={form.isPublic}
          onChange={(value) => set('isPublic', value)}
        />
      </WkSection>
    </WkFormScreen>
  )
}
