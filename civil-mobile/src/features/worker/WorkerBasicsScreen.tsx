import { useEffect, useState } from 'react'
import { router } from 'expo-router'
import { HardHat, Languages, MapPin, UserRound } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import {
  WkField,
  WkFormScreen,
  WkPickerSheet,
  WkSection,
  WkSelect,
} from '@/features/worker/ui/forms'
import { WkButton } from '@/features/worker/ui/kit'
import { useWorkerCategories } from '@/features/worker/useWorkerCategories'
import { useWorkerProfile } from '@/features/worker/useWorkerProfile'
import { workerBasicsSchema, type WorkerBasicsValues } from '@/features/worker/worker.schema'
import { type FieldErrors, parseForm } from '@/lib/form'

const EMPTY: WorkerBasicsValues = {
  headline: null,
  bio: null,
  primaryTrade: null,
  yearsExperience: null,
  languages: null,
  city: null,
  country: null,
}

export function WorkerBasicsScreen() {
  const { t } = useTranslation()
  const { profile, isReady, isLoading, error, refetch, isSaving, saveMerged } = useWorkerProfile()
  const { trades, labelForName, isLoading: tradesLoading } = useWorkerCategories()
  const [form, setForm] = useState<WorkerBasicsValues>(EMPTY)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    if (!profile) return
    setForm({
      headline: profile.headline,
      bio: profile.bio,
      primaryTrade: profile.primaryTrade,
      yearsExperience: profile.yearsExperience,
      languages: profile.languages,
      city: profile.city,
      country: profile.country,
    })
  }, [profile])

  async function onSave() {
    const parsed = parseForm(workerBasicsSchema, form)
    if (!parsed.success) {
      setErrors(parsed.fieldErrors)
      return
    }
    setErrors({})
    const ok = await saveMerged(parsed.data, { successMessage: t('worker.changesSaved') })
    if (ok) router.back()
  }

  const set = <K extends keyof WorkerBasicsValues>(key: K, value: WorkerBasicsValues[K]) =>
    setForm((c) => ({ ...c, [key]: value }))

  // A trade typed before the picker existed may not match a category: keep it selectable.
  const tradeOptions = trades.map((tr) => ({ value: tr.name, label: tr.label }))
  if (form.primaryTrade && !trades.some((tr) => tr.name === form.primaryTrade)) {
    tradeOptions.unshift({ value: form.primaryTrade, label: form.primaryTrade })
  }

  return (
    <WkFormScreen
      title={t('worker.sections.basics')}
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
      <WkSection icon={UserRound} title={t('worker.aboutYou')}>
        <WkField
          label={t('worker.headline')}
          value={form.headline ?? ''}
          onChangeText={(value) => set('headline', value)}
          error={errors.headline}
          placeholder={t('worker.headlinePlaceholder')}
        />
        <WkField
          label={t('worker.bio')}
          value={form.bio ?? ''}
          onChangeText={(value) => set('bio', value)}
          error={errors.bio}
          placeholder={t('worker.bioPlaceholder')}
          multiline
        />
      </WkSection>

      <WkSection icon={HardHat} title={t('worker.tradeSection')}>
        <WkSelect
          label={t('worker.primaryTrade')}
          value={labelForName(form.primaryTrade)}
          placeholder={t('worker.chooseTrade')}
          error={errors.primaryTrade}
          onPress={() => setPickerOpen(true)}
        />
        <WkField
          label={t('worker.yearsExperience')}
          value={form.yearsExperience == null ? '' : String(form.yearsExperience)}
          onChangeText={(value) => {
            const trimmed = value.trim()
            if (!trimmed) {
              set('yearsExperience', null)
              return
            }
            const parsed = Number.parseInt(trimmed, 10)
            setForm((c) => ({
              ...c,
              yearsExperience: Number.isFinite(parsed) ? parsed : c.yearsExperience,
            }))
          }}
          keyboardType="number-pad"
          placeholder="0"
          maxLength={2}
          ltr
          error={errors.yearsExperience}
        />
      </WkSection>

      <WkSection icon={MapPin} title={t('worker.location')}>
        <WkField
          label={t('common.city')}
          value={form.city ?? ''}
          onChangeText={(value) => set('city', value)}
          error={errors.city}
        />
        <WkField
          label={t('common.country')}
          value={form.country ?? ''}
          onChangeText={(value) => set('country', value)}
          error={errors.country}
        />
      </WkSection>

      <WkSection icon={Languages} title={t('worker.languages')}>
        <WkField
          label={t('worker.languages')}
          value={form.languages ?? ''}
          onChangeText={(value) => set('languages', value)}
          error={errors.languages}
          placeholder={t('worker.languagesPlaceholder')}
          hint={t('worker.languagesHelper')}
        />
      </WkSection>

      <WkPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={t('worker.chooseTrade')}
        options={tradeOptions}
        value={form.primaryTrade}
        isLoading={tradesLoading}
        searchPlaceholder={t('worker.searchTrades')}
        emptyLabel={(query) =>
          query ? t('worker.noTradesMatch', { query }) : t('worker.noTrades')
        }
        onSelect={(option) => {
          set('primaryTrade', option.value)
          setPickerOpen(false)
        }}
      />
    </WkFormScreen>
  )
}
