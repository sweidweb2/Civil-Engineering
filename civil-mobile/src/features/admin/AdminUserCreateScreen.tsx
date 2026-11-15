import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'

import { FormField } from '@/components/forms/FormField'
import { OptionChips } from '@/components/forms/OptionChips'
import { Header } from '@/components/layout/Header'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { Input, InputField } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { BackButton } from '@/features/pm/components/BackButton'
import { ApiError } from '@/services/api'
import type { AuthRole } from '@/services/auth'
import { showApiAlert, showBlockingAlert } from '@/services/feedback'
import { AUTH_ROLE_OPTIONS, createUser } from '@/services/users'
import { useToastApiError } from '@/services/toast'

const BASE = '/admin/users'

export function AdminUserCreateScreen() {
  const toastApiError = useToastApiError()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<AuthRole>('CLIENT')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [isSaving, setIsSaving] = useState(false)

  async function onCreate() {
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required')
      return
    }
    setError(undefined)
    setIsSaving(true)
    try {
      const created = await createUser({
        email: email.trim(),
        password,
        role,
        isVerified,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        displayName: displayName.trim() || undefined,
        phone: phone.trim() || undefined,
      })
      showBlockingAlert('Created', 'User was created.')
      router.replace(`${BASE}/${created.data.id}` as never)
    } catch (err) {
      if (err instanceof ApiError && err.status >= 500) toastApiError(err)
      else showApiAlert(err, 'Could not create user')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <View className="flex-1 bg-background">
      <Header title="New user" leftSlot={<BackButton fallbackHref={BASE} />} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-4 py-4 pb-10"
        keyboardShouldPersistTaps="handled"
      >
        {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

        <FormField label="Email" isRequired>
          <Input>
            <InputField
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="user@example.com"
            />
          </Input>
        </FormField>

        <FormField label="Password" isRequired>
          <Input>
            <InputField
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Temporary password"
            />
          </Input>
        </FormField>

        <FormField label="Role">
          <OptionChips
            options={AUTH_ROLE_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            value={role}
            onChange={(value) => setRole(value as AuthRole)}
          />
        </FormField>

        <View className="flex-row gap-3">
          <View className="min-w-0 flex-1">
            <FormField label="First name">
              <Input>
                <InputField value={firstName} onChangeText={setFirstName} />
              </Input>
            </FormField>
          </View>
          <View className="min-w-0 flex-1">
            <FormField label="Last name">
              <Input>
                <InputField value={lastName} onChangeText={setLastName} />
              </Input>
            </FormField>
          </View>
        </View>

        <FormField label="Display name">
          <Input>
            <InputField value={displayName} onChangeText={setDisplayName} />
          </Input>
        </FormField>

        <FormField label="Phone">
          <Input>
            <InputField value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          </Input>
        </FormField>

        <View className="flex-row items-center justify-between rounded-md border border-border px-3 py-3">
          <Text className="text-sm font-medium text-foreground">Verified</Text>
          <Switch value={isVerified} onValueChange={setIsVerified} />
        </View>

        <Button
          onPress={() => void onCreate()}
          disabled={isSaving}
          accessibilityState={{ busy: isSaving }}
        >
          {isSaving ? <ButtonSpinner /> : null}
          <ButtonText>{isSaving ? 'Creating…' : 'Create user'}</ButtonText>
        </Button>
      </ScrollView>
    </View>
  )
}
