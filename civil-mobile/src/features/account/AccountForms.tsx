import { useCallback, useEffect, useState } from 'react'
import { Text } from 'react-native'
import { KeyRound, LogOut, UserRound } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { FieldRow, Section, TextField } from '@/components/kit'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { Pressable } from '@/components/ui/pressable'
import { useLogout } from '@/features/portals/LogoutButton'
import {
  providerPasswordSchema,
  type ProviderPasswordValues,
  providerProfileSchema,
  type ProviderProfileValues,
} from '@/features/provider/profile.schema'
import { useRemoteData } from '@/hooks/useRemoteData'
import { useThemeColors } from '@/hooks/useThemeColors'
import { type FieldErrors, parseForm } from '@/lib/form'
import { changePassword } from '@/services/auth'
import { useHandleApiError, useToastSuccess } from '@/services/toast'
import { getUser, updateUser } from '@/services/users'
import { useAuthStore } from '@/stores/authStore'

const EMPTY_PASSWORD: ProviderPasswordValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

/** Edit the signed-in user's own name and phone. */
export function AccountDetailsForm() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const userId = user?.id
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()

  const [form, setForm] = useState<ProviderProfileValues>({
    firstName: user?.profile?.firstName ?? '',
    lastName: user?.profile?.lastName ?? '',
    displayName: user?.profile?.displayName ?? '',
    phone: '',
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSaving, setIsSaving] = useState(false)

  // The session only carries names; the full record adds the phone number.
  const load = useCallback(() => {
    if (!userId) return Promise.reject(new Error('Not signed in'))
    return getUser(userId)
  }, [userId])
  const remote = useRemoteData(load, { enabled: Boolean(userId) })
  const account = remote.status === 'success' ? remote.data.data : null

  useEffect(() => {
    if (!account) return
    setForm({
      firstName: account.profile?.firstName ?? '',
      lastName: account.profile?.lastName ?? '',
      displayName: account.profile?.displayName ?? '',
      phone: account.profile?.phone ?? '',
    })
  }, [account])

  function set<K extends keyof ProviderProfileValues>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function onSave() {
    if (!userId) return
    const parsed = parseForm(providerProfileSchema, form)
    if (!parsed.success) {
      setErrors(parsed.fieldErrors)
      return
    }
    setErrors({})
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
      toastSuccess(t('account.saved'))
    } catch (err) {
      handleApiError(err, t('account.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Section title={t('account.details')} description={user?.email} icon={UserRound}>
      <FieldRow>
        <TextField
          label={t('common.firstName')}
          value={form.firstName}
          onChangeText={(value) => set('firstName', value)}
          error={errors.firstName}
        />
        <TextField
          label={t('common.lastName')}
          value={form.lastName}
          onChangeText={(value) => set('lastName', value)}
          error={errors.lastName}
        />
      </FieldRow>
      <TextField
        label={t('common.displayName')}
        value={form.displayName}
        onChangeText={(value) => set('displayName', value)}
        error={errors.displayName}
        helper={t('account.displayNameHint')}
      />
      <TextField
        label={t('common.phone')}
        value={form.phone}
        onChangeText={(value) => set('phone', value)}
        error={errors.phone}
        keyboardType="phone-pad"
      />
      <Button
        onPress={() => void onSave()}
        disabled={isSaving}
        accessibilityState={{ busy: isSaving }}
      >
        {isSaving ? <ButtonSpinner /> : null}
        <ButtonText>{isSaving ? t('common.saving') : t('account.saveDetails')}</ButtonText>
      </Button>
    </Section>
  )
}

export function PasswordForm() {
  const { t } = useTranslation()
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()
  const [form, setForm] = useState<ProviderPasswordValues>(EMPTY_PASSWORD)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSaving, setIsSaving] = useState(false)

  function set<K extends keyof ProviderPasswordValues>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function onSave() {
    const parsed = parseForm(providerPasswordSchema, form)
    if (!parsed.success) {
      setErrors(parsed.fieldErrors)
      return
    }
    setErrors({})
    setIsSaving(true)
    try {
      await changePassword(parsed.data)
      setForm(EMPTY_PASSWORD)
      toastSuccess(t('account.passwordUpdated'))
    } catch (err) {
      handleApiError(err, t('account.passwordFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Section
      title={t('account.password')}
      description={t('account.passwordHint')}
      icon={KeyRound}
      tone="info"
    >
      <TextField
        label={t('account.currentPassword')}
        required
        secureTextEntry
        value={form.currentPassword}
        onChangeText={(value) => set('currentPassword', value)}
        error={errors.currentPassword}
      />
      <TextField
        label={t('account.newPassword')}
        required
        secureTextEntry
        value={form.newPassword}
        onChangeText={(value) => set('newPassword', value)}
        error={errors.newPassword}
      />
      <TextField
        label={t('account.confirmPassword')}
        required
        secureTextEntry
        value={form.confirmPassword}
        onChangeText={(value) => set('confirmPassword', value)}
        error={errors.confirmPassword}
      />
      <Button
        variant="outline"
        onPress={() => void onSave()}
        disabled={isSaving}
        accessibilityState={{ busy: isSaving }}
      >
        {isSaving ? <ButtonSpinner /> : null}
        <ButtonText>{isSaving ? t('account.updating') : t('account.updatePassword')}</ButtonText>
      </Button>
    </Section>
  )
}

/** Full-width red "Log out" row. */
export function LogoutRow() {
  const { t } = useTranslation()
  const colors = useThemeColors()
  const { isLoggingOut, requestLogout } = useLogout()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: isLoggingOut }}
      disabled={isLoggingOut}
      className="h-14 flex-row items-center justify-center gap-2 rounded-3xl border border-destructive/30 bg-destructive/10 active:opacity-80"
      onPress={requestLogout}
    >
      <LogOut size={18} color={colors.error} />
      <Text className="text-base font-bold text-destructive">
        {isLoggingOut ? t('account.loggingOut') : t('account.logout')}
      </Text>
    </Pressable>
  )
}
