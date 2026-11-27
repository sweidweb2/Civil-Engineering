import { useCallback, useEffect, useState } from 'react'
import { router } from 'expo-router'
import { GraduationCap, Link2, MapPin, UserRound } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import {
  formFromManagerProfile,
  type ManagerProfileForm,
  managerProfileSchema,
} from '@/features/pm/managerProfile.schema'
import { WkField, WkFormScreen, WkSection } from '@/components/wk/forms'
import { WkButton } from '@/components/wk/kit'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { useRemoteData } from '@/hooks/useRemoteData'
import { type FieldErrors, parseForm } from '@/lib/form'
import { getMyManagerProfile, upsertMyManagerProfile } from '@/services/managerProfiles'
import { useToastSuccess } from '@/services/toast'

const BACK = '/pm/account'

/** PM → Account → Professional profile (`manager_profiles`, full PUT). */
export function PmProfileScreen() {
  const { t } = useTranslation()
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()
  const load = useCallback(() => getMyManagerProfile(), [])
  const remote = useRemoteData(load)
  const profile = remote.status === 'success' ? remote.data.data : null
  const [form, setForm] = useState<ManagerProfileForm>(() => formFromManagerProfile(null))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (remote.status === 'success') setForm(formFromManagerProfile(profile))
  }, [remote.status, profile])

  const set = (key: keyof ManagerProfileForm) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  async function onSave() {
    const parsed = parseForm(managerProfileSchema(t), form)
    if (!parsed.success) {
      setErrors(parsed.fieldErrors)
      return
    }
    setErrors({})
    setIsSaving(true)
    try {
      await upsertMyManagerProfile(parsed.data)
      toastSuccess(t('worker.changesSaved'))
      router.back()
    } catch (err) {
      handleApiError(err, t('pmProfile.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  const field = (
    key: keyof ManagerProfileForm,
    extra: Partial<Parameters<typeof WkField>[0]> = {},
  ) => (
    <WkField
      label={t(`pmProfile.fields.${key}`)}
      value={form[key]}
      onChangeText={set(key)}
      error={errors[key]}
      {...extra}
    />
  )
  const urlProps = {
    placeholder: 'https://',
    keyboardType: 'url',
    autoCapitalize: 'none',
    autoCorrect: false,
    ltr: true,
  } as const

  return (
    <WkFormScreen
      title={t('pmProfile.title')}
      backHref={BACK}
      isLoading={remote.isLoading}
      error={remote.status === 'error' ? remote.error : undefined}
      onRetry={() => void remote.refetch()}
      testID="e2e-pm-profile"
      footer={
        <WkButton
          label={isSaving ? t('common.saving') : t('worker.saveChanges')}
          loading={isSaving}
          disabled={remote.status !== 'success'}
          onPress={() => void onSave()}
        />
      }
    >
      <WkSection icon={UserRound} title={t('pmProfile.summary')}>
        {field('headline', { placeholder: t('pmProfile.headlinePlaceholder') })}
        {field('specialty')}
        {field('yearsExperience', { keyboardType: 'number-pad', placeholder: '0', ltr: true })}
        {field('bio', { multiline: true })}
      </WkSection>

      <WkSection icon={GraduationCap} title={t('pmProfile.background')}>
        {field('education', { multiline: true })}
        {field('certifications', { multiline: true })}
        {field('skills', { multiline: true, hint: t('pmProfile.commaHint') })}
        {field('projectTypes', { hint: t('pmProfile.commaHint') })}
        {field('languages', { hint: t('pmProfile.commaHint') })}
      </WkSection>

      <WkSection icon={MapPin} title={t('pmProfile.locationAvailability')}>
        {field('city')}
        {field('country')}
        {field('availability', { placeholder: t('pmProfile.availabilityPlaceholder') })}
      </WkSection>

      <WkSection icon={Link2} title={t('pmProfile.links')}>
        {field('website', urlProps)}
        {field('linkedinUrl', urlProps)}
        {field('cvUrl', urlProps)}
      </WkSection>
    </WkFormScreen>
  )
}
