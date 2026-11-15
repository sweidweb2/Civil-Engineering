import { useState } from 'react'
import { router } from 'expo-router'
import { UserRound } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import {
  ChoiceField,
  FieldRow,
  FormError,
  FormScreen,
  Section,
  TextField,
  ToggleRow,
} from '@/components/kit'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { enumOptions } from '@/i18n/labels'
import type { AuthRole } from '@/services/auth'
import { useHandleApiError, useToastSuccess } from '@/services/toast'
import { AUTH_ROLE_OPTIONS, createUser } from '@/services/users'

const BASE = '/admin/users'

export function AdminUserCreateScreen() {
  const { t } = useTranslation()
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()
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
      setError(t('users.emailPasswordRequired'))
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
      toastSuccess(t('users.created'))
      router.replace(`${BASE}/${created.data.id}` as never)
    } catch (err) {
      handleApiError(err, t('users.createFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <FormScreen
      title={t('users.new')}
      backHref={BASE}
      footer={
        <Button
          className="flex-1"
          onPress={() => void onCreate()}
          disabled={isSaving}
          accessibilityState={{ busy: isSaving }}
        >
          {isSaving ? <ButtonSpinner /> : null}
          <ButtonText>{isSaving ? t('common.creating') : t('users.create')}</ButtonText>
        </Button>
      }
    >
      <FormError message={error} />
      <Section title={t('users.account')} icon={UserRound}>
        <TextField
          label={t('common.email')}
          required
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="user@example.com"
        />
        <TextField
          label={t('common.password')}
          required
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder={t('users.tempPassword')}
        />
        <ChoiceField
          label={t('users.role')}
          options={enumOptions(t, 'role', AUTH_ROLE_OPTIONS)}
          value={role}
          onChange={(value) => setRole(value as AuthRole)}
        />
        <ToggleRow label={t('users.verified')} value={isVerified} onValueChange={setIsVerified} />
      </Section>
      <Section title={t('users.profile')}>
        <FieldRow>
          <TextField label={t('common.firstName')} value={firstName} onChangeText={setFirstName} />
          <TextField label={t('common.lastName')} value={lastName} onChangeText={setLastName} />
        </FieldRow>
        <TextField
          label={t('common.displayName')}
          value={displayName}
          onChangeText={setDisplayName}
        />
        <TextField
          label={t('common.phone')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
      </Section>
    </FormScreen>
  )
}
