import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import {
  Camera,
  Image as ImageIcon,
  Images,
  MapPin,
  Phone,
  Store,
  Trash2,
  UserRound,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import {
  WkChoice,
  WkField,
  WkFormScreen,
  type WkOption,
  WkPickerSheet,
  WkSection,
  WkSelect,
} from '@/components/wk/forms'
import { WkButton, WkCard, WkPill } from '@/components/wk/kit'
import { WkMedia } from '@/components/wk/list'
import { PvOptionSheet } from '@/components/wk/storefront'
import { PROVIDER_TONE } from '@/features/admin/ui'
import { useFilePick } from '@/hooks/useFilePick'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumLabel, enumOptions } from '@/i18n/labels'
import { invalidateAdminCaches, invalidateProviderProfileCaches } from '@/lib/cacheKeys'
import { ltr } from '@/lib/rtl'
import {
  clearProviderLogo,
  createProvider,
  getProvider,
  listProviderOwnerCandidates,
  ownerLabel,
  PROVIDER_STATUS_OPTIONS,
  type ProviderOwner,
  type ProviderStatus,
  updateProvider,
  uploadProviderLogo,
} from '@/services/providers'
import { useToastApiError, useToastSuccess } from '@/services/toast'

const BASE = '/admin/providers'
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Mode = 'create' | 'edit'
type Errors = Partial<Record<'name' | 'email', string>>

function ProviderFormScreen({ mode }: { mode: Mode }) {
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const providerId = typeof id === 'string' ? id : id?.[0]
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()
  const toastApiError = useToastApiError()
  const logoPick = useFilePick()

  const load = useCallback(() => {
    if (!providerId) return Promise.reject(new Error('Provider id required'))
    return getProvider(providerId)
  }, [providerId])
  const remote = useRemoteData(load, { enabled: mode === 'edit' && Boolean(providerId) })
  const provider = remote.status === 'success' ? remote.data.data : null
  const remoteLogoUrl = remote.status === 'success' ? remote.data.meta.logoDownloadUrl : null
  const [logoOverride, setLogoOverride] = useState<string | null | undefined>(undefined)
  const logoUrl = logoOverride !== undefined ? logoOverride : remoteLogoUrl
  // Stored logo ref is the cache key; none right after an upload (old key ≠ new pixels).
  const logoKey = logoOverride === undefined ? provider?.logoUrl : null

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [website, setWebsite] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [status, setStatus] = useState<ProviderStatus>('PENDING')
  // '' = no owner. Without an owner the PROVIDER user has no company (`/providers/me` 404s).
  const [ownerUserId, setOwnerUserId] = useState('')
  const [ownerOpen, setOwnerOpen] = useState(false)
  const loadCandidates = useCallback(() => listProviderOwnerCandidates(), [])
  const candidates = useRemoteData(loadCandidates)
  const candidateList = candidates.status === 'success' ? candidates.data.data : null
  const [errors, setErrors] = useState<Errors>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!provider) return
    setName(provider.name ?? '')
    setDescription(provider.description ?? '')
    setEmail(provider.email ?? '')
    setPhone(provider.phone ?? '')
    setWhatsapp(provider.whatsapp ?? '')
    setWebsite(provider.website ?? '')
    setAddress(provider.address ?? '')
    setCity(provider.city ?? '')
    setCountry(provider.country ?? '')
    setStatus(provider.status)
    setOwnerUserId(provider.ownerUserId ?? '')
  }, [provider])

  const currentOwner = provider?.owner ?? null
  const ownerOptions = useMemo<WkOption[]>(() => {
    const owners: ProviderOwner[] = []
    if (currentOwner) owners.push(currentOwner)
    if (candidateList) {
      for (const c of candidateList) {
        if (!owners.some((o) => o.id === c.id)) owners.push(c)
      }
    }
    return [
      { value: '', label: t('adminPortal.noOwner') },
      ...owners.map((o) => ({ value: o.id, label: ownerLabel(o) })),
    ]
  }, [currentOwner, candidateList, t])

  async function onSave() {
    const e: Errors = {}
    if (!name.trim()) e.name = t('providers.nameRequired')
    if (email.trim() && !EMAIL.test(email.trim())) e.email = t('adminPortal.validEmail')
    if (Object.keys(e).length) {
      setErrors(e)
      return
    }
    setErrors({})
    setIsSaving(true)
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      whatsapp: whatsapp.trim() || null,
      website: website.trim() || null,
      address: address.trim() || null,
      city: city.trim() || null,
      country: country.trim() || null,
      status,
      ownerUserId: ownerUserId || null,
    }
    try {
      if (mode === 'create') {
        const created = await createProvider(payload)
        invalidateAdminCaches()
        toastSuccess(t('providers.created'))
        void candidates.refetch()
        router.replace(`${BASE}/${created.data.id}` as never)
      } else if (providerId) {
        await updateProvider(providerId, payload)
        invalidateAdminCaches()
        toastSuccess(t('providers.saved'))
        await Promise.all([remote.refetch(), candidates.refetch()])
      }
    } catch (err) {
      handleApiError(err, t(mode === 'create' ? 'providers.createFailed' : 'providers.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  function pickLogo(source: 'camera' | 'library') {
    if (!providerId) return
    void logoPick.pickAndRun(source, async (picked) => {
      const result = await uploadProviderLogo(providerId, picked)
      invalidateProviderProfileCaches()
      invalidateAdminCaches()
      setLogoOverride(result.meta.logoDownloadUrl)
      toastSuccess(t('logo.updated'))
    })
  }

  async function removeLogo() {
    if (!providerId) return
    logoPick.setSheetOpen(false)
    logoPick.setIsBusy(true)
    try {
      await clearProviderLogo(providerId)
      invalidateProviderProfileCaches()
      invalidateAdminCaches()
      setLogoOverride(null)
      toastSuccess(t('logo.removed'))
    } catch (error) {
      toastApiError(error)
    } finally {
      logoPick.setIsBusy(false)
    }
  }

  const clearErr = (key: keyof Errors) => {
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }))
  }

  return (
    <WkFormScreen
      title={mode === 'create' ? t('providers.new') : (provider?.name ?? t('providers.provider'))}
      backHref={BASE}
      isLoading={mode === 'edit' && remote.isLoading && !provider}
      error={mode === 'edit' && remote.status === 'error' ? remote.error : undefined}
      onRetry={() => void remote.refetch()}
      testID="e2e-admin-provider"
      footer={
        <WkButton
          label={
            isSaving
              ? t('common.saving')
              : mode === 'create'
                ? t('providers.create')
                : t('worker.saveChanges')
          }
          loading={isSaving}
          height={54}
          onPress={() => void onSave()}
        />
      }
    >
      {provider ? (
        <>
          <WkCard className="flex-row items-center gap-3.5 rounded-3xl">
            <WkMedia photo={logoUrl} photoKey={logoKey} name={provider.name} size={60} hero />
            <View className="min-w-0 flex-1 gap-1">
              <Text
                className="text-[17px] font-semibold leading-[22px] text-wk-ink"
                numberOfLines={2}
              >
                {provider.name}
              </Text>
              {provider.email ? (
                <Text className="text-[13px] text-wk-ink2" numberOfLines={1}>
                  {ltr(provider.email)}
                </Text>
              ) : null}
            </View>
            <WkPill
              label={enumLabel(t, 'providerStatus', provider.status)}
              tone={PROVIDER_TONE[provider.status]}
              size="md"
            />
          </WkCard>

          <WkSection icon={ImageIcon} title={t('adminPortal.logo')}>
            <View className="flex-row items-center gap-3.5">
              <View>
                <WkMedia photo={logoUrl} photoKey={logoKey} name={provider.name} size={76} hero />
                {logoPick.isBusy ? (
                  <View
                    className="absolute inset-0 items-center justify-center rounded-[23px]"
                    style={{ backgroundColor: 'rgba(10,12,10,0.45)' }}
                  >
                    <ActivityIndicator color="#FFFFFF" />
                  </View>
                ) : null}
              </View>
              <View className="min-w-0 flex-1 items-start gap-2">
                <Text className="text-[13px] leading-[18px] text-wk-ink3">
                  {t('adminPortal.logoHint')}
                </Text>
                <WkButton
                  compact
                  variant="soft"
                  height={40}
                  icon={Camera}
                  label={logoUrl ? t('logo.change') : t('adminPortal.uploadLogo')}
                  disabled={logoPick.isBusy}
                  onPress={() => logoPick.setSheetOpen(true)}
                />
              </View>
            </View>
          </WkSection>
        </>
      ) : null}

      <WkSection icon={Store} title={t('providers.company')}>
        <WkField
          label={t('common.name')}
          required
          value={name}
          onChangeText={(v) => {
            setName(v)
            clearErr('name')
          }}
          error={errors.name}
        />
        <WkChoice
          label={t('providers.status')}
          options={enumOptions(t, 'providerStatus', PROVIDER_STATUS_OPTIONS)}
          value={status}
          onChange={(value) => setStatus(value as ProviderStatus)}
        />
        <WkField
          label={t('common.description')}
          multiline
          value={description}
          onChangeText={setDescription}
        />
      </WkSection>

      <WkSection icon={UserRound} title={t('adminPortal.ownerSection')}>
        <WkSelect
          label={t('adminPortal.ownerAccount')}
          value={ownerOptions.find((o) => o.value === ownerUserId)?.label}
          placeholder={t('adminPortal.noOwner')}
          onPress={() => setOwnerOpen(true)}
        />
        <Text className="text-[13px] leading-[18px] text-wk-ink3">
          {t('adminPortal.ownerHint')}
        </Text>
      </WkSection>

      <WkSection icon={Phone} title={t('providers.contact')}>
        <WkField
          label={t('common.email')}
          value={email}
          onChangeText={(v) => {
            setEmail(v)
            clearErr('email')
          }}
          error={errors.email}
          autoCapitalize="none"
          keyboardType="email-address"
          ltr
        />
        <WkField
          label={t('common.phone')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          ltr
        />
        <WkField
          label={t('common.whatsapp')}
          value={whatsapp}
          onChangeText={setWhatsapp}
          keyboardType="phone-pad"
          ltr
        />
        <WkField
          label={t('common.website')}
          value={website}
          onChangeText={setWebsite}
          autoCapitalize="none"
          keyboardType="url"
          ltr
        />
      </WkSection>

      <WkSection icon={MapPin} title={t('providers.location')}>
        <WkField label={t('common.address')} value={address} onChangeText={setAddress} />
        <WkField label={t('common.city')} value={city} onChangeText={setCity} />
        <WkField label={t('common.country')} value={country} onChangeText={setCountry} />
      </WkSection>

      <WkPickerSheet
        visible={ownerOpen}
        onClose={() => setOwnerOpen(false)}
        title={t('adminPortal.ownerAccount')}
        options={ownerOptions}
        value={ownerUserId}
        isLoading={candidates.isLoading}
        searchPlaceholder={t('adminPortal.searchOwners')}
        emptyLabel={() => t('adminPortal.noOwnerCandidates')}
        onSelect={(option) => {
          setOwnerUserId(option.value)
          setOwnerOpen(false)
        }}
      />

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
    </WkFormScreen>
  )
}

export function AdminProviderDetailScreen() {
  return <ProviderFormScreen mode="edit" />
}

export function AdminProviderCreateScreen() {
  return <ProviderFormScreen mode="create" />
}
