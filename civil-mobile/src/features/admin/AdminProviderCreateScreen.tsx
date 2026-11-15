import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'

import { FormField } from '@/components/forms/FormField'
import { OptionChips } from '@/components/forms/OptionChips'
import { Header } from '@/components/layout/Header'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { Input, InputField } from '@/components/ui/input'
import { Textarea, TextareaInput } from '@/components/ui/textarea'
import { BackButton } from '@/features/pm/components/BackButton'
import { ApiError } from '@/services/api'
import { showApiAlert, showBlockingAlert } from '@/services/feedback'
import { createProvider, PROVIDER_STATUS_OPTIONS, type ProviderStatus } from '@/services/providers'
import { useToastApiError } from '@/services/toast'

const BASE = '/admin/providers'

export function AdminProviderCreateScreen() {
  const toastApiError = useToastApiError()
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

  async function onCreate() {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    setError(undefined)
    setIsSaving(true)
    try {
      const created = await createProvider({
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
      showBlockingAlert('Created', 'Provider was created.')
      router.replace(`${BASE}/${created.data.id}` as never)
    } catch (err) {
      if (err instanceof ApiError && err.status >= 500) toastApiError(err)
      else showApiAlert(err, 'Could not create provider')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <View className="flex-1 bg-background">
      <Header title="New provider" leftSlot={<BackButton fallbackHref={BASE} />} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-4 py-4 pb-10"
        keyboardShouldPersistTaps="handled"
      >
        {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

        <FormField label="Name" isRequired>
          <Input>
            <InputField value={name} onChangeText={setName} placeholder="Company name" />
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
                <InputField value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" />
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
          onPress={() => void onCreate()}
          disabled={isSaving}
          accessibilityState={{ busy: isSaving }}
        >
          {isSaving ? <ButtonSpinner /> : null}
          <ButtonText>{isSaving ? 'Creating…' : 'Create provider'}</ButtonText>
        </Button>
      </ScrollView>
    </View>
  )
}
