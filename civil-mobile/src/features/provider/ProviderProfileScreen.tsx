import { useCallback, useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { Building2 } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { AsyncState } from '@/components/feedback/AsyncState'
import {
  FieldRow,
  FormScroll,
  ScreenHeader,
  Section,
  SegmentedControl,
  StatusPill,
  TextField,
  Thumbnail,
  toneForStatus,
} from '@/components/kit'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { AccountDetailsForm, LogoutRow, PasswordForm } from '@/features/account/AccountForms'
import { LanguagePicker } from '@/features/account/LanguagePicker'
import { ThemePicker } from '@/features/account/ThemePicker'
import {
  companyWriteFromForm,
  EMPTY_COMPANY,
  providerCompanySchema,
  type ProviderCompanyValues,
} from '@/features/provider/company.schema'
import { LogoField } from '@/features/provider/LogoField'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumLabel } from '@/i18n/labels'
import { cacheKeys, invalidateProviderProfileCaches } from '@/lib/cacheKeys'
import { type FieldErrors, parseForm } from '@/lib/form'
import { getMyProvider, updateProvider } from '@/services/providers'
import { useToastSuccess } from '@/services/toast'
import { softShadows } from '@/theme/shadows'

type Key = keyof ProviderCompanyValues

export function ProviderProfileScreen() {
  const { t } = useTranslation()
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()
  const [tab, setTab] = useState('company')
  const [form, setForm] = useState<ProviderCompanyValues>(EMPTY_COMPANY)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSaving, setIsSaving] = useState(false)

  const load = useCallback(() => getMyProvider(), [])
  const remote = useRemoteData(load, { cacheKey: cacheKeys.providersMe })
  const provider = remote.status === 'success' ? remote.data.data : null
  const remoteLogoUrl = remote.status === 'success' ? remote.data.meta.logoDownloadUrl : null
  // Set right after an upload/remove so the new logo shows without a refetch.
  const [logoOverride, setLogoOverride] = useState<string | null | undefined>(undefined)
  const logoUrl = logoOverride !== undefined ? logoOverride : remoteLogoUrl

  useEffect(() => {
    if (!provider) return
    setForm({
      name: provider.name ?? '',
      description: provider.description ?? '',
      phone: provider.phone ?? '',
      whatsapp: provider.whatsapp ?? '',
      email: provider.email ?? '',
      website: provider.website ?? '',
      address: provider.address ?? '',
      city: provider.city ?? '',
      country: provider.country ?? '',
    })
  }, [provider])

  const set = (key: Key) => (value: string) => setForm((current) => ({ ...current, [key]: value }))

  async function onSave() {
    if (!provider) return
    const parsed = parseForm(providerCompanySchema, form)
    if (!parsed.success) {
      setErrors(parsed.fieldErrors)
      return
    }
    setErrors({})
    setIsSaving(true)
    try {
      await updateProvider(provider.id, companyWriteFromForm(parsed.data))
      invalidateProviderProfileCaches()
      toastSuccess(t('profile.companySaved'))
      await remote.refetch({ fresh: true })
    } catch (err) {
      handleApiError(err, t('profile.companySaveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  const tabs = [
    { value: 'company', label: t('profile.company') },
    { value: 'account', label: t('profile.account') },
    { value: 'security', label: t('profile.security') },
  ]

  return (
    <View className="flex-1 bg-background" testID="e2e-provider-profile">
      <ScreenHeader title={t('profile.title')}>
        <View
          className="flex-row items-center gap-3 rounded-2xl border border-border/40 bg-card p-4"
          style={softShadows.card}
        >
          <Thumbnail imageUrl={logoUrl} icon={Building2} size={56} />
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-lg font-bold text-foreground" numberOfLines={1}>
              {provider?.name ?? t('profile.yourCompany')}
            </Text>
            {provider ? (
              <View className="flex-row">
                <StatusPill
                  label={enumLabel(t, 'providerStatus', provider.status)}
                  tone={toneForStatus(provider.status)}
                />
              </View>
            ) : null}
          </View>
        </View>
      </ScreenHeader>

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.status === 'error' ? remote.error : undefined}
        loadingLabel={t('profile.loading')}
        onRetry={() => void remote.refetch()}
      >
        <FormScroll>
          <View className="pt-2">
            <SegmentedControl options={tabs} value={tab} onChange={setTab} />
          </View>

          {tab === 'company' ? (
            <Section title={t('profile.companyInfo')} icon={Building2}>
              {provider ? (
                <LogoField providerId={provider.id} logoUrl={logoUrl} onChanged={setLogoOverride} />
              ) : null}
              <TextField
                label={t('profile.companyName')}
                required
                value={form.name}
                onChangeText={set('name')}
                error={errors.name}
              />
              <TextField
                label={t('common.description')}
                multiline
                value={form.description}
                onChangeText={set('description')}
                error={errors.description}
              />
              <FieldRow>
                <TextField
                  label={t('common.phone')}
                  value={form.phone}
                  onChangeText={set('phone')}
                  error={errors.phone}
                  keyboardType="phone-pad"
                />
                <TextField
                  label={t('common.whatsapp')}
                  value={form.whatsapp}
                  onChangeText={set('whatsapp')}
                  error={errors.whatsapp}
                  keyboardType="phone-pad"
                />
              </FieldRow>
              <TextField
                label={t('common.email')}
                value={form.email}
                onChangeText={set('email')}
                error={errors.email}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextField
                label={t('common.website')}
                value={form.website}
                onChangeText={set('website')}
                error={errors.website}
                autoCapitalize="none"
              />
              <TextField
                label={t('common.address')}
                value={form.address}
                onChangeText={set('address')}
                error={errors.address}
              />
              <FieldRow>
                <TextField
                  label={t('common.city')}
                  value={form.city}
                  onChangeText={set('city')}
                  error={errors.city}
                />
                <TextField
                  label={t('common.country')}
                  value={form.country}
                  onChangeText={set('country')}
                  error={errors.country}
                />
              </FieldRow>
              <Button
                onPress={() => void onSave()}
                disabled={isSaving || !provider}
                accessibilityState={{ busy: isSaving }}
              >
                {isSaving ? <ButtonSpinner /> : null}
                <ButtonText>{isSaving ? t('common.saving') : t('profile.saveCompany')}</ButtonText>
              </Button>
            </Section>
          ) : null}

          {tab === 'account' ? <AccountDetailsForm /> : null}
          {tab === 'security' ? <PasswordForm /> : null}

          <ThemePicker />
          <LanguagePicker />
          <LogoutRow />
        </FormScroll>
      </AsyncState>
    </View>
  )
}
