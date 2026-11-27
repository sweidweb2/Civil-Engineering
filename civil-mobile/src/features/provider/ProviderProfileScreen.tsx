import { useCallback, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { Camera, Images, MapPin, Phone, Store, Trash2 } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { Pressable } from '@/components/ui/pressable'
import { WkField, WkSection } from '@/components/wk/forms'
import {
  WkButton,
  WkError,
  WkHeroGlow,
  WkPill,
  WkSkeletonCard,
  WkTabScroll,
} from '@/components/wk/kit'
import { useWkPalette, type WkTone } from '@/components/wk/palette'
import {
  WkAccountDetailsCard,
  WkPasswordCard,
  WkPreferences,
  WkSegmented,
} from '@/components/wk/settings'
import {
  companyWriteFromForm,
  EMPTY_COMPANY,
  providerCompanySchema,
  type ProviderCompanyValues,
} from '@/features/provider/company.schema'
import { PvOptionSheet } from '@/features/provider/ui/kit'
import { useFilePick } from '@/hooks/useFilePick'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { useRemoteData } from '@/hooks/useRemoteData'
import { useSeedOnce } from '@/hooks/useSeedOnce'
import { enumLabel } from '@/i18n/labels'
import { cacheKeys, invalidateProviderProfileCaches } from '@/lib/cacheKeys'
import { type FieldErrors, parseForm } from '@/lib/form'
import { REMOTE_IMAGE_CACHE_POLICY, remoteImage } from '@/lib/imageSource'
import { initialsOf } from '@/lib/user'
import { errorMessage } from '@/services/feedback'
import {
  clearProviderLogo,
  getMyProvider,
  type ProviderStatus,
  updateProvider,
  uploadProviderLogo,
} from '@/services/providers'
import { useToastApiError, useToastSuccess } from '@/services/toast'

type Key = keyof ProviderCompanyValues
type Tab = 'company' | 'account' | 'security'

const STATUS_TONE: Record<ProviderStatus, WkTone> = {
  APPROVED: 'green',
  PENDING: 'amber',
  SUSPENDED: 'red',
}

export function ProviderProfileScreen() {
  const { t } = useTranslation()
  const { shadow } = useWkPalette()
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()
  const toastApiError = useToastApiError()
  const [tab, setTab] = useState<Tab>('company')
  const [form, setForm] = useState<ProviderCompanyValues>(EMPTY_COMPANY)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSaving, setIsSaving] = useState(false)
  const logoPick = useFilePick()

  const load = useCallback(() => getMyProvider(), [])
  const remote = useRemoteData(load, { cacheKey: cacheKeys.providersMe, persist: true })
  const provider = remote.status === 'success' ? remote.data.data : null
  const remoteLogoUrl = remote.status === 'success' ? remote.data.meta.logoDownloadUrl : null
  // Set right after an upload/remove so the new logo shows without a refetch.
  const [logoOverride, setLogoOverride] = useState<string | null | undefined>(undefined)
  const logoUrl = logoOverride !== undefined ? logoOverride : remoteLogoUrl

  // Seed once: background refetches (e.g. after a logo upload invalidates
  // `providers:me`) must not overwrite fields the user is still editing.
  useSeedOnce(provider, (provider) => {
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
  })

  const set = (key: Key) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }))
  }

  async function onSave() {
    if (!provider) return
    const parsed = parseForm(providerCompanySchema(t), form)
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
      await remote.refetch()
    } catch (err) {
      handleApiError(err, t('profile.companySaveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  async function removeLogo() {
    if (!provider) return
    logoPick.setSheetOpen(false)
    logoPick.setIsBusy(true)
    try {
      await clearProviderLogo(provider.id)
      invalidateProviderProfileCaches()
      setLogoOverride(null)
      toastSuccess(t('logo.removed'))
    } catch (error) {
      toastApiError(error)
    } finally {
      logoPick.setIsBusy(false)
    }
  }

  function pickLogo(source: 'camera' | 'library') {
    if (!provider) return
    void logoPick.pickAndRun(source, async (picked) => {
      const result = await uploadProviderLogo(provider.id, picked)
      invalidateProviderProfileCaches()
      setLogoOverride(result.meta.logoDownloadUrl)
      toastSuccess(t('logo.updated'))
    })
  }

  const name = provider?.name || t('profile.yourCompany')
  const place = [provider?.city, provider?.country].filter(Boolean).join(', ')

  return (
    <WkTabScroll
      testID="e2e-provider-profile"
      refreshing={remote.isFetching && Boolean(provider)}
      onRefresh={() => remote.refetch()}
    >
      {/* Company card */}
      <View className="overflow-hidden rounded-[26px] bg-wk-sf" style={shadow}>
        <View className="h-32 overflow-hidden bg-wk-hero">
          <WkHeroGlow size={300} />
        </View>
        <View className="gap-3 px-5 pb-5">
          <View className="-mt-9 flex-row items-end justify-between">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('logo.change')}
              disabled={!provider || logoPick.isBusy}
              onPress={() => logoPick.setSheetOpen(true)}
              className="size-[76px] items-center justify-center overflow-hidden rounded-[22px] border-4 border-wk-sf bg-wk-hero active:opacity-85"
            >
              {logoUrl ? (
                <Image
                  // Key = stored logo ref; skip it right after an upload until the refetch
                  // brings the new key (never cache new pixels under the old key).
                  source={remoteImage(
                    logoUrl,
                    logoOverride === undefined ? provider?.logoUrl : null,
                  )}
                  cachePolicy={REMOTE_IMAGE_CACHE_POLICY}
                  style={{ position: 'absolute', inset: 0 }}
                  contentFit="cover"
                  transition={150}
                />
              ) : (
                <Text className="text-[22px] font-semibold text-wk-lime">
                  {initialsOf(name) || '·'}
                </Text>
              )}
              {logoPick.isBusy ? (
                <View
                  className="absolute inset-0 items-center justify-center"
                  style={{ backgroundColor: 'rgba(10,12,10,0.45)' }}
                >
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              ) : null}
            </Pressable>
            {provider ? (
              <WkPill
                label={enumLabel(t, 'providerStatus', provider.status)}
                tone={STATUS_TONE[provider.status]}
                dot
                size="md"
              />
            ) : null}
          </View>
          <View className="gap-1">
            <Text
              className="text-[17px] font-semibold leading-[22px] text-wk-ink"
              numberOfLines={2}
            >
              {name}
            </Text>
            <Text className="text-[13px] text-wk-ink2" numberOfLines={1}>
              {[place, t('providerPortal.providerRole')].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>
      </View>

      <WkSegmented<Tab>
        options={[
          { value: 'company', label: t('profile.company') },
          { value: 'account', label: t('profile.account') },
          { value: 'security', label: t('profile.security') },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'company' ? (
        remote.isLoading && !provider ? (
          <>
            <WkSkeletonCard />
            <WkSkeletonCard />
          </>
        ) : remote.status === 'error' && !provider ? (
          <WkError
            message={errorMessage(remote.error, t('common.errorGeneric'))}
            onRetry={() => void remote.refetch()}
          />
        ) : (
          <>
            <WkSection icon={Store} title={t('profile.company')}>
              <WkField
                label={t('profile.companyName')}
                required
                value={form.name}
                onChangeText={set('name')}
                error={errors.name}
              />
              <WkField
                label={t('common.description')}
                multiline
                value={form.description}
                onChangeText={set('description')}
                error={errors.description}
              />
            </WkSection>
            <WkSection icon={Phone} title={t('providerPortal.contactSection')}>
              <WkField
                label={t('common.phone')}
                value={form.phone}
                onChangeText={set('phone')}
                error={errors.phone}
                keyboardType="phone-pad"
                ltr
              />
              <WkField
                label={t('common.whatsapp')}
                value={form.whatsapp}
                onChangeText={set('whatsapp')}
                error={errors.whatsapp}
                keyboardType="phone-pad"
                ltr
              />
              <WkField
                label={t('common.email')}
                value={form.email}
                onChangeText={set('email')}
                error={errors.email}
                autoCapitalize="none"
                keyboardType="email-address"
                ltr
              />
              <WkField
                label={t('common.website')}
                value={form.website}
                onChangeText={set('website')}
                error={errors.website}
                autoCapitalize="none"
                keyboardType="url"
                ltr
              />
            </WkSection>
            <WkSection icon={MapPin} title={t('providerPortal.locationSection')}>
              <WkField
                label={t('common.address')}
                value={form.address}
                onChangeText={set('address')}
                error={errors.address}
              />
              <WkField
                label={t('common.city')}
                value={form.city}
                onChangeText={set('city')}
                error={errors.city}
              />
              <WkField
                label={t('common.country')}
                value={form.country}
                onChangeText={set('country')}
                error={errors.country}
              />
            </WkSection>
            <WkButton
              label={isSaving ? t('common.saving') : t('profile.saveCompany')}
              loading={isSaving}
              disabled={!provider}
              height={54}
              onPress={() => void onSave()}
            />
          </>
        )
      ) : null}
      {tab === 'account' ? <WkAccountDetailsCard /> : null}
      {tab === 'security' ? <WkPasswordCard /> : null}

      <WkPreferences />

      <PvOptionSheet
        visible={logoPick.sheetOpen}
        title={t('logo.change')}
        onClose={() => logoPick.setSheetOpen(false)}
        options={[
          {
            key: 'camera',
            icon: Camera,
            label: t('files.takePhoto'),
            onPress: () => pickLogo('camera'),
          },
          {
            key: 'library',
            icon: Images,
            label: t('files.chooseLibrary'),
            onPress: () => pickLogo('library'),
          },
          ...(logoUrl
            ? [
                {
                  key: 'remove',
                  icon: Trash2,
                  label: t('logo.remove'),
                  destructive: true,
                  onPress: () => void removeLogo(),
                },
              ]
            : []),
        ]}
      />
    </WkTabScroll>
  )
}
