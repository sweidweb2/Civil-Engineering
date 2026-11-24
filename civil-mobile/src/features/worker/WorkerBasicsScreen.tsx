import { useMemo, useState } from 'react'
import { router } from 'expo-router'
import { HardHat, Languages, MapPin, UserRound } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { specialtyLabel, specialtyOptions } from '@/features/worker/specialties'
import {
  WkField,
  WkFormScreen,
  WkPickerSheet,
  WkSection,
  WkSelect,
} from '@/features/worker/ui/forms'
import { WkButton } from '@/features/worker/ui/kit'
import { useWorkerProfile } from '@/features/worker/useWorkerProfile'
import { workerBasicsSchema, type WorkerBasicsValues } from '@/features/worker/worker.schema'
import { useSeedOnce } from '@/hooks/useSeedOnce'
import { type FieldErrors, parseForm } from '@/lib/form'

const EMPTY: WorkerBasicsValues = {
  headline: null,
  bio: null,
  specialty: null,
  yearsExperience: null,
  languages: null,
  city: null,
  country: null,
}

export function WorkerBasicsScreen() {
  const { t, i18n } = useTranslation()
  const { profile, isReady, isLoading, error, refetch, isSaving, saveMerged } = useWorkerProfile()
  const [form, setForm] = useState<WorkerBasicsValues>(EMPTY)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [pickerOpen, setPickerOpen] = useState(false)

  // Seed once: background refetches must not wipe unsaved edits.
  useSeedOnce(profile, (profile) => {
    setForm({
      headline: profile.headline,
      bio: profile.bio,
      specialty: profile.specialty,
      yearsExperience: profile.yearsExperience,
      languages: profile.languages,
      city: profile.city,
      country: profile.country,
    })
  })

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

  const options = useMemo(() => {
    const next = specialtyOptions(i18n.language)
    // Legacy free-text values stay selectable until the worker re-picks from the list.
    if (form.specialty && !next.some((item) => item.value === form.specialty)) {
      next.unshift({
        value: form.specialty,
        label: specialtyLabel(form.specialty, i18n.language) || form.specialty,
      })
    }
    return next
  }, [form.specialty, i18n.language])

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

      <WkSection icon={HardHat} title={t('worker.specialtySection')}>
        <WkSelect
          label={t('worker.specialty')}
          value={specialtyLabel(form.specialty, i18n.language)}
          placeholder={t('worker.chooseSpecialty')}
          error={errors.specialty}
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
        title={t('worker.chooseSpecialty')}
        options={options}
        value={form.specialty}
        searchPlaceholder={t('worker.searchSpecialties')}
        emptyLabel={(query) =>
          query ? t('worker.noSpecialtiesMatch', { query }) : t('worker.noSpecialties')
        }
        onSelect={(option) => {
          set('specialty', option.value)
          setPickerOpen(false)
        }}
      />
    </WkFormScreen>
  )
}
