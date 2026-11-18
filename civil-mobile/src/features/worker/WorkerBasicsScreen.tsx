import { useEffect, useState } from 'react'
import { router } from 'expo-router'
import { BriefcaseBusiness, Languages, MapPinned } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { FormScreen, Section, TextField } from '@/components/kit'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
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
  const [form, setForm] = useState<WorkerBasicsValues>(EMPTY)
  const [errors, setErrors] = useState<FieldErrors>({})

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
    const ok = await saveMerged(parsed.data)
    if (ok) router.back()
  }

  return (
    <FormScreen
      title={t('worker.sections.basics')}
      subtitle={t('worker.basicsHint')}
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
      <Section title={t('worker.aboutYou')} icon={BriefcaseBusiness}>
        <TextField
          label={t('worker.headline')}
          value={form.headline ?? ''}
          onChangeText={(value) => setForm((c) => ({ ...c, headline: value }))}
          error={errors.headline}
          placeholder={t('worker.headlinePlaceholder')}
        />
        <TextField
          label={t('worker.primaryTrade')}
          value={form.primaryTrade ?? ''}
          onChangeText={(value) => setForm((c) => ({ ...c, primaryTrade: value }))}
          error={errors.primaryTrade}
          placeholder={t('worker.primaryTradePlaceholder')}
        />
        <TextField
          label={t('worker.yearsExperience')}
          value={form.yearsExperience == null ? '' : String(form.yearsExperience)}
          onChangeText={(value) => {
            const trimmed = value.trim()
            if (!trimmed) {
              setForm((c) => ({ ...c, yearsExperience: null }))
              return
            }
            const parsed = Number.parseInt(trimmed, 10)
            setForm((c) => ({
              ...c,
              yearsExperience: Number.isFinite(parsed) ? parsed : c.yearsExperience,
            }))
          }}
          keyboardType="number-pad"
          error={errors.yearsExperience}
        />
        <TextField
          label={t('worker.bio')}
          value={form.bio ?? ''}
          onChangeText={(value) => setForm((c) => ({ ...c, bio: value }))}
          error={errors.bio}
          multiline
          placeholder={t('worker.bioPlaceholder')}
        />
      </Section>

      <Section title={t('worker.location')} icon={MapPinned}>
        <TextField
          label={t('common.city')}
          value={form.city ?? ''}
          onChangeText={(value) => setForm((c) => ({ ...c, city: value }))}
          error={errors.city}
        />
        <TextField
          label={t('common.country')}
          value={form.country ?? ''}
          onChangeText={(value) => setForm((c) => ({ ...c, country: value }))}
          error={errors.country}
        />
      </Section>

      <Section title={t('worker.languages')} icon={Languages}>
        <TextField
          label={t('worker.languages')}
          value={form.languages ?? ''}
          onChangeText={(value) => setForm((c) => ({ ...c, languages: value }))}
          error={errors.languages}
          placeholder={t('worker.languagesPlaceholder')}
          helper={t('worker.languagesHelper')}
        />
      </Section>
    </FormScreen>
  )
}
