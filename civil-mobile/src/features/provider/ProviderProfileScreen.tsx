import { useCallback, useEffect, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { Image } from 'expo-image'

import { AsyncState } from '@/components/feedback/AsyncState'
import { FormField } from '@/components/forms/FormField'
import { Header } from '@/components/layout/Header'
import { Badge, BadgeText } from '@/components/ui/badge'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { Input, InputField } from '@/components/ui/input'
import { Textarea, TextareaInput } from '@/components/ui/textarea'
import { LogoutButton } from '@/features/portals/LogoutButton'
import {
  companyWriteFromForm,
  EMPTY_COMPANY,
  providerCompanySchema,
  type ProviderCompanyValues,
} from '@/features/provider/company.schema'
import {
  providerPasswordSchema,
  type ProviderPasswordValues,
  providerProfileSchema,
  type ProviderProfileValues,
} from '@/features/provider/profile.schema'
import { useRemoteData } from '@/hooks/useRemoteData'
import { type FieldErrors, parseForm } from '@/lib/form'
import { ApiError } from '@/services/api'
import { changePassword } from '@/services/auth'
import { showApiAlert, showBlockingAlert } from '@/services/feedback'
import { getMyProvider, providerStatusLabel, updateProvider } from '@/services/providers'
import { useToastApiError } from '@/services/toast'
import { getUser, updateUser } from '@/services/users'
import { useAuthStore } from '@/stores/authStore'

const EMPTY_PROFILE: ProviderProfileValues = {
  firstName: '',
  lastName: '',
  displayName: '',
  phone: '',
}

const EMPTY_PASSWORD: ProviderPasswordValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

export function ProviderProfileScreen() {
  const userId = useAuthStore((s) => s.user?.id)
  const toastApiError = useToastApiError()

  const [form, setForm] = useState<ProviderProfileValues>(EMPTY_PROFILE)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSaving, setIsSaving] = useState(false)

  const [companyForm, setCompanyForm] = useState<ProviderCompanyValues>(EMPTY_COMPANY)
  const [companyErrors, setCompanyErrors] = useState<FieldErrors>({})
  const [isSavingCompany, setIsSavingCompany] = useState(false)

  const [passwordForm, setPasswordForm] = useState<ProviderPasswordValues>(EMPTY_PASSWORD)
  const [passwordErrors, setPasswordErrors] = useState<FieldErrors>({})
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  const loadUser = useCallback(() => {
    if (!userId) return Promise.reject(new Error('Not signed in'))
    return getUser(userId)
  }, [userId])
  const userRemote = useRemoteData(loadUser, { enabled: Boolean(userId) })

  const loadProvider = useCallback(() => getMyProvider(), [])
  const providerRemote = useRemoteData(loadProvider)

  const account = userRemote.status === 'success' ? userRemote.data.data : null
  const provider = providerRemote.status === 'success' ? providerRemote.data.data : null
  const logoUrl =
    providerRemote.status === 'success' ? providerRemote.data.meta.logoDownloadUrl : null

  useEffect(() => {
    if (!account) return
    setForm({
      firstName: account.profile?.firstName ?? '',
      lastName: account.profile?.lastName ?? '',
      displayName: account.profile?.displayName ?? '',
      phone: account.profile?.phone ?? '',
    })
  }, [account])

  useEffect(() => {
    if (!provider) return
    setCompanyForm({
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

  const isLoading = userRemote.isLoading || providerRemote.isLoading
  const error =
    userRemote.status === 'error'
      ? userRemote.error
      : providerRemote.status === 'error'
        ? providerRemote.error
        : undefined

  async function onSaveProfile() {
    if (!userId) return
    const parsed = parseForm(providerProfileSchema, form)
    if (!parsed.success) {
      setFieldErrors(parsed.fieldErrors)
      return
    }

    setFieldErrors({})
    setIsSaving(true)
    try {
      const result = await updateUser(userId, parsed.data)
      const profile = result.data.profile
      useAuthStore.setState((state) => ({
        user: state.user
          ? {
              ...state.user,
              profile: {
                firstName: profile?.firstName ?? null,
                lastName: profile?.lastName ?? null,
                displayName: profile?.displayName ?? null,
              },
            }
          : state.user,
      }))
      showBlockingAlert('Saved', 'Your profile was updated.')
      await userRemote.refetch()
    } catch (err) {
      if (err instanceof ApiError && err.status >= 500) toastApiError(err)
      else showApiAlert(err, 'Could not save profile')
    } finally {
      setIsSaving(false)
    }
  }

  async function onSaveCompany() {
    if (!provider) return
    const parsed = parseForm(providerCompanySchema, companyForm)
    if (!parsed.success) {
      setCompanyErrors(parsed.fieldErrors)
      return
    }

    setCompanyErrors({})
    setIsSavingCompany(true)
    try {
      await updateProvider(provider.id, companyWriteFromForm(parsed.data))
      showBlockingAlert('Saved', 'Company info was updated.')
      await providerRemote.refetch()
    } catch (err) {
      if (err instanceof ApiError && err.status >= 500) toastApiError(err)
      else showApiAlert(err, 'Could not save company')
    } finally {
      setIsSavingCompany(false)
    }
  }

  async function onSavePassword() {
    const parsed = parseForm(providerPasswordSchema, passwordForm)
    if (!parsed.success) {
      setPasswordErrors(parsed.fieldErrors)
      return
    }

    setPasswordErrors({})
    setIsSavingPassword(true)
    try {
      await changePassword(parsed.data)
      setPasswordForm(EMPTY_PASSWORD)
      showBlockingAlert('Updated', 'Your password was changed.')
    } catch (err) {
      if (err instanceof ApiError && err.status >= 500) toastApiError(err)
      else showApiAlert(err, 'Could not update password')
    } finally {
      setIsSavingPassword(false)
    }
  }

  return (
    <View className="flex-1 bg-background" testID="e2e-provider-profile">
      <Header title="Profile" rightSlot={<LogoutButton />} />
      <AsyncState
        isLoading={isLoading}
        error={error}
        loadingLabel="Loading profile…"
        onRetry={() => {
          void userRemote.refetch()
          void providerRemote.refetch()
        }}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-6 px-5 pb-10 pt-2"
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
            <View className="size-20 overflow-hidden rounded-full border border-border bg-background">
              {logoUrl ? (
                <Image source={{ uri: logoUrl }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <View className="size-full items-center justify-center">
                  <Text className="text-lg font-semibold text-foreground">
                    {(provider?.name || account?.email || '?').slice(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-center text-lg font-semibold text-foreground">
              {provider?.name ?? 'Your company'}
            </Text>
            {provider ? (
              <Badge variant={provider.status === 'APPROVED' ? 'default' : 'secondary'}>
                <BadgeText>{providerStatusLabel(provider.status)}</BadgeText>
              </Badge>
            ) : null}
          </View>

          <View className="gap-3">
            <Text className="text-base font-semibold text-foreground">Company</Text>
            <FormField
              label="Company name"
              isRequired
              isInvalid={Boolean(companyErrors.name)}
              errorText={companyErrors.name}
            >
              <Input>
                <InputField
                  value={companyForm.name}
                  onChangeText={(value) => setCompanyForm((c) => ({ ...c, name: value }))}
                />
              </Input>
            </FormField>
            <FormField
              label="Description"
              isInvalid={Boolean(companyErrors.description)}
              errorText={companyErrors.description}
            >
              <Textarea>
                <TextareaInput
                  value={companyForm.description}
                  onChangeText={(value) => setCompanyForm((c) => ({ ...c, description: value }))}
                />
              </Textarea>
            </FormField>
            <FormField
              label="Phone"
              isInvalid={Boolean(companyErrors.phone)}
              errorText={companyErrors.phone}
            >
              <Input>
                <InputField
                  value={companyForm.phone}
                  onChangeText={(value) => setCompanyForm((c) => ({ ...c, phone: value }))}
                  keyboardType="phone-pad"
                />
              </Input>
            </FormField>
            <FormField
              label="WhatsApp"
              isInvalid={Boolean(companyErrors.whatsapp)}
              errorText={companyErrors.whatsapp}
            >
              <Input>
                <InputField
                  value={companyForm.whatsapp}
                  onChangeText={(value) => setCompanyForm((c) => ({ ...c, whatsapp: value }))}
                  keyboardType="phone-pad"
                />
              </Input>
            </FormField>
            <FormField
              label="Email"
              isInvalid={Boolean(companyErrors.email)}
              errorText={companyErrors.email}
            >
              <Input>
                <InputField
                  value={companyForm.email}
                  onChangeText={(value) => setCompanyForm((c) => ({ ...c, email: value }))}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </Input>
            </FormField>
            <FormField
              label="Website"
              isInvalid={Boolean(companyErrors.website)}
              errorText={companyErrors.website}
            >
              <Input>
                <InputField
                  value={companyForm.website}
                  onChangeText={(value) => setCompanyForm((c) => ({ ...c, website: value }))}
                  autoCapitalize="none"
                />
              </Input>
            </FormField>
            <FormField
              label="Address"
              isInvalid={Boolean(companyErrors.address)}
              errorText={companyErrors.address}
            >
              <Input>
                <InputField
                  value={companyForm.address}
                  onChangeText={(value) => setCompanyForm((c) => ({ ...c, address: value }))}
                />
              </Input>
            </FormField>
            <View className="flex-row gap-3">
              <View className="min-w-0 flex-1">
                <FormField
                  label="City"
                  isInvalid={Boolean(companyErrors.city)}
                  errorText={companyErrors.city}
                >
                  <Input>
                    <InputField
                      value={companyForm.city}
                      onChangeText={(value) => setCompanyForm((c) => ({ ...c, city: value }))}
                    />
                  </Input>
                </FormField>
              </View>
              <View className="min-w-0 flex-1">
                <FormField
                  label="Country"
                  isInvalid={Boolean(companyErrors.country)}
                  errorText={companyErrors.country}
                >
                  <Input>
                    <InputField
                      value={companyForm.country}
                      onChangeText={(value) => setCompanyForm((c) => ({ ...c, country: value }))}
                    />
                  </Input>
                </FormField>
              </View>
            </View>
            <Button
              onPress={() => void onSaveCompany()}
              disabled={isSavingCompany || !provider}
              accessibilityState={{ busy: isSavingCompany }}
            >
              {isSavingCompany ? <ButtonSpinner /> : null}
              <ButtonText>{isSavingCompany ? 'Saving…' : 'Save company'}</ButtonText>
            </Button>
          </View>

          <View className="gap-3">
            <Text className="text-base font-semibold text-foreground">Account</Text>
            <FormField
              label="First name"
              isInvalid={Boolean(fieldErrors.firstName)}
              errorText={fieldErrors.firstName}
            >
              <Input>
                <InputField
                  value={form.firstName}
                  onChangeText={(value) => setForm((c) => ({ ...c, firstName: value }))}
                />
              </Input>
            </FormField>
            <FormField
              label="Last name"
              isInvalid={Boolean(fieldErrors.lastName)}
              errorText={fieldErrors.lastName}
            >
              <Input>
                <InputField
                  value={form.lastName}
                  onChangeText={(value) => setForm((c) => ({ ...c, lastName: value }))}
                />
              </Input>
            </FormField>
            <FormField
              label="Display name"
              isInvalid={Boolean(fieldErrors.displayName)}
              errorText={fieldErrors.displayName}
            >
              <Input>
                <InputField
                  value={form.displayName}
                  onChangeText={(value) => setForm((c) => ({ ...c, displayName: value }))}
                />
              </Input>
            </FormField>
            <FormField
              label="Phone"
              isInvalid={Boolean(fieldErrors.phone)}
              errorText={fieldErrors.phone}
            >
              <Input>
                <InputField
                  value={form.phone}
                  onChangeText={(value) => setForm((c) => ({ ...c, phone: value }))}
                  keyboardType="phone-pad"
                />
              </Input>
            </FormField>
            <Button
              onPress={() => void onSaveProfile()}
              disabled={isSaving}
              accessibilityState={{ busy: isSaving }}
            >
              {isSaving ? <ButtonSpinner /> : null}
              <ButtonText>{isSaving ? 'Saving…' : 'Save account'}</ButtonText>
            </Button>
          </View>

          <View className="gap-3">
            <Text className="text-base font-semibold text-foreground">Change password</Text>
            <FormField
              label="Current password"
              isRequired
              isInvalid={Boolean(passwordErrors.currentPassword)}
              errorText={passwordErrors.currentPassword}
            >
              <Input>
                <InputField
                  secureTextEntry
                  value={passwordForm.currentPassword}
                  onChangeText={(value) =>
                    setPasswordForm((c) => ({ ...c, currentPassword: value }))
                  }
                />
              </Input>
            </FormField>
            <FormField
              label="New password"
              isRequired
              isInvalid={Boolean(passwordErrors.newPassword)}
              errorText={passwordErrors.newPassword}
            >
              <Input>
                <InputField
                  secureTextEntry
                  value={passwordForm.newPassword}
                  onChangeText={(value) => setPasswordForm((c) => ({ ...c, newPassword: value }))}
                />
              </Input>
            </FormField>
            <FormField
              label="Confirm password"
              isRequired
              isInvalid={Boolean(passwordErrors.confirmPassword)}
              errorText={passwordErrors.confirmPassword}
            >
              <Input>
                <InputField
                  secureTextEntry
                  value={passwordForm.confirmPassword}
                  onChangeText={(value) =>
                    setPasswordForm((c) => ({ ...c, confirmPassword: value }))
                  }
                />
              </Input>
            </FormField>
            <Button
              variant="outline"
              onPress={() => void onSavePassword()}
              disabled={isSavingPassword}
              accessibilityState={{ busy: isSavingPassword }}
            >
              {isSavingPassword ? <ButtonSpinner /> : null}
              <ButtonText>{isSavingPassword ? 'Updating…' : 'Update password'}</ButtonText>
            </Button>
          </View>
        </ScrollView>
      </AsyncState>
    </View>
  )
}
