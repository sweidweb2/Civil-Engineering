import { useCallback, useEffect, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'

import { AsyncState } from '@/components/feedback/AsyncState'
import { FormField } from '@/components/forms/FormField'
import { OptionChips } from '@/components/forms/OptionChips'
import { Header } from '@/components/layout/Header'
import { Badge, BadgeText } from '@/components/ui/badge'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { Input, InputField } from '@/components/ui/input'
import { Textarea, TextareaInput } from '@/components/ui/textarea'
import { BackButton } from '@/features/pm/components/BackButton'
import { useRemoteData } from '@/hooks/useRemoteData'
import { ApiError } from '@/services/api'
import { showApiAlert, showBlockingAlert } from '@/services/feedback'
import {
  getProvider,
  PROVIDER_STATUS_OPTIONS,
  type ProviderStatus,
  providerStatusLabel,
  updateProvider,
} from '@/services/providers'
import { useToastApiError } from '@/services/toast'

const BASE = '/admin/providers'

export function AdminProviderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const providerId = typeof id === 'string' ? id : id?.[0]
  const toastApiError = useToastApiError()

  const load = useCallback(() => {
    if (!providerId) return Promise.reject(new Error('Provider id required'))
    return getProvider(providerId)
  }, [providerId])
  const remote = useRemoteData(load, { enabled: Boolean(providerId) })
  const provider = remote.status === 'success' ? remote.data.data : null

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
    if (!providerId || !name.trim()) {
      showApiAlert(new Error('Name is required'), 'Could not save')
      return
    }
    setIsSaving(true)
    try {
      await updateProvider(providerId, {
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
      })
      showBlockingAlert('Saved', 'Provider was updated.')
      await remote.refetch()
    } catch (err) {
      if (err instanceof ApiError && err.status >= 500) toastApiError(err)
      else showApiAlert(err, 'Could not save provider')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <View className="flex-1 bg-background">
      <Header
        title={provider?.name ?? 'Provider'}
        leftSlot={<BackButton fallbackHref={BASE} />}
        rightSlot={
          provider ? (
            <Badge variant={provider.status === 'APPROVED' ? 'default' : 'secondary'}>
              <BadgeText>{providerStatusLabel(provider.status)}</BadgeText>
            </Badge>
          ) : undefined
        }
      />

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.status === 'error' ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingLabel="Loading provider…"
      >
        {provider ? (
          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-4 px-4 py-4 pb-10"
            keyboardShouldPersistTaps="handled"
          >
            <FormField label="Name" isRequired>
              <Input>
                <InputField value={name} onChangeText={setName} />
              </Input>
            </FormField>

            <FormField label="Status">
              <OptionChips
                options={PROVIDER_STATUS_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                value={status}
                onChange={(value) => setStatus(value as ProviderStatus)}
              />
            </FormField>

            <FormField label="Description">
              <Textarea>
                <TextareaInput value={description} onChangeText={setDescription} />
              </Textarea>
            </FormField>

            <FormField label="Email">
              <Input>
                <InputField
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </Input>
            </FormField>

            <View className="flex-row gap-3">
              <View className="min-w-0 flex-1">
                <FormField label="Phone">
                  <Input>
                    <InputField value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                  </Input>
                </FormField>
              </View>
              <View className="min-w-0 flex-1">
                <FormField label="WhatsApp">
                  <Input>
                    <InputField
                      value={whatsapp}
                      onChangeText={setWhatsapp}
                      keyboardType="phone-pad"
                    />
                  </Input>
                </FormField>
              </View>
            </View>

            <FormField label="Website">
              <Input>
                <InputField value={website} onChangeText={setWebsite} autoCapitalize="none" />
              </Input>
            </FormField>

            <FormField label="Address">
              <Input>
                <InputField value={address} onChangeText={setAddress} />
              </Input>
            </FormField>

            <View className="flex-row gap-3">
              <View className="min-w-0 flex-1">
                <FormField label="City">
                  <Input>
                    <InputField value={city} onChangeText={setCity} />
                  </Input>
                </FormField>
              </View>
              <View className="min-w-0 flex-1">
                <FormField label="Country">
                  <Input>
                    <InputField value={country} onChangeText={setCountry} />
                  </Input>
                </FormField>
              </View>
            </View>

            <Button
              onPress={() => void onSave()}
              disabled={isSaving}
              accessibilityState={{ busy: isSaving }}
            >
              {isSaving ? <ButtonSpinner /> : null}
              <ButtonText>{isSaving ? 'Saving…' : 'Save provider'}</ButtonText>
            </Button>
          </ScrollView>
        ) : null}
      </AsyncState>
    </View>
  )
}
