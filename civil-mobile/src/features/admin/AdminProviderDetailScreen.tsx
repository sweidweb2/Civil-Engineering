import { useCallback, useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'

import {
  ChoiceField,
  FieldRow,
  FormError,
  FormScreen,
  Section,
  StatusPill,
  TextField,
  toneForStatus,
} from '@/components/kit'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { LogoField } from '@/features/provider/LogoField'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumLabel, enumOptions } from '@/i18n/labels'
import { invalidateAdminCaches } from '@/lib/cacheKeys'
import {
  createProvider,
  getProvider,
  PROVIDER_STATUS_OPTIONS,
  type ProviderStatus,
  updateProvider,
} from '@/services/providers'
import { useToastSuccess } from '@/services/toast'

const BASE = '/admin/providers'

type Mode = 'create' | 'edit'

function ProviderFormScreen({ mode }: { mode: Mode }) {
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const providerId = typeof id === 'string' ? id : id?.[0]
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()

  const load = useCallback(() => {
    if (!providerId) return Promise.reject(new Error('Provider id required'))
    return getProvider(providerId)
  }, [providerId])
  const remote = useRemoteData(load, { enabled: mode === 'edit' && Boolean(providerId) })
  const provider = remote.status === 'success' ? remote.data.data : null
  const remoteLogoUrl = remote.status === 'success' ? remote.data.meta.logoDownloadUrl : null
  const [logoOverride, setLogoOverride] = useState<string | null | undefined>(undefined)
  const logoUrl = logoOverride !== undefined ? logoOverride : remoteLogoUrl

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
  const [error, setError] = useState<string | undefined>()
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
  }, [provider])

  async function onSave() {
    if (!name.trim()) {
      setError(t('providers.nameRequired'))
      return
    }
    setError(undefined)
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
    }
    try {
      if (mode === 'create') {
        const created = await createProvider(payload)
        invalidateAdminCaches()
        toastSuccess(t('providers.created'))
        router.replace(`${BASE}/${created.data.id}` as never)
      } else if (providerId) {
        await updateProvider(providerId, payload)
        invalidateAdminCaches()
        toastSuccess(t('providers.saved'))
        await remote.refetch()
      }
    } catch (err) {
      handleApiError(err, t(mode === 'create' ? 'providers.createFailed' : 'providers.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <FormScreen
      title={mode === 'create' ? t('providers.new') : (provider?.name ?? t('providers.provider'))}
      backHref={BASE}
      isLoading={mode === 'edit' && remote.isLoading}
      error={mode === 'edit' && remote.status === 'error' ? remote.error : undefined}
      onRetry={() => void remote.refetch()}
      loadingLabel={t('providers.loadingOne')}
      footer={
        <Button
          className="flex-1"
          onPress={() => void onSave()}
          disabled={isSaving}
          accessibilityState={{ busy: isSaving }}
        >
          {isSaving ? <ButtonSpinner /> : null}
          <ButtonText>
            {isSaving
              ? t('common.saving')
              : mode === 'create'
                ? t('providers.create')
                : t('common.save')}
          </ButtonText>
        </Button>
      }
    >
      <FormError message={error} />
      {provider ? (
        <View className="flex-row items-center gap-4">
          <LogoField providerId={provider.id} logoUrl={logoUrl} onChanged={setLogoOverride} />
          <View className="min-w-0 flex-1 gap-1.5">
            <Text className="text-xl font-semibold text-foreground" numberOfLines={1}>
              {provider.name}
            </Text>
            <View className="flex-row">
              <StatusPill
                label={enumLabel(t, 'providerStatus', provider.status)}
                tone={toneForStatus(provider.status)}
              />
            </View>
          </View>
        </View>
      ) : null}

      <Section title={t('providers.company')}>
        <TextField label={t('common.name')} required value={name} onChangeText={setName} />
        <ChoiceField
          label={t('providers.status')}
          options={enumOptions(t, 'providerStatus', PROVIDER_STATUS_OPTIONS)}
          value={status}
          onChange={(value) => setStatus(value as ProviderStatus)}
        />
        <TextField
          label={t('common.description')}
          multiline
          value={description}
          onChangeText={setDescription}
        />
      </Section>

      <Section title={t('providers.contact')}>
        <TextField
          label={t('common.email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <FieldRow>
          <TextField
            label={t('common.phone')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <TextField
            label={t('common.whatsapp')}
            value={whatsapp}
            onChangeText={setWhatsapp}
            keyboardType="phone-pad"
          />
        </FieldRow>
        <TextField
          label={t('common.website')}
          value={website}
          onChangeText={setWebsite}
          autoCapitalize="none"
        />
      </Section>

      <Section title={t('providers.location')}>
        <TextField label={t('common.address')} value={address} onChangeText={setAddress} />
        <FieldRow>
          <TextField label={t('common.city')} value={city} onChangeText={setCity} />
          <TextField label={t('common.country')} value={country} onChangeText={setCountry} />
        </FieldRow>
      </Section>
    </FormScreen>
  )
}

export function AdminProviderDetailScreen() {
  return <ProviderFormScreen mode="edit" />
}

export function AdminProviderCreateScreen() {
  return <ProviderFormScreen mode="create" />
}
