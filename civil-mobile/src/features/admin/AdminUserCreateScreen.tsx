import { useState } from 'react'
import { router } from 'expo-router'
import { KeyRound, UserRound } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { passwordSchema } from '@/features/auth/password.schema'
import {
  WkChoice,
  WkField,
  WkFormScreen,
  WkPasswordField,
  WkSection,
  WkToggle,
} from '@/components/wk/forms'
import { WkButton } from '@/components/wk/kit'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { enumOptions } from '@/i18n/labels'
import { invalidateAdminCaches } from '@/lib/cacheKeys'
import { useIdempotencyKey } from '@/lib/idempotency'
import type { AuthRole } from '@/services/auth'
import { useToastSuccess } from '@/services/toast'
import { AUTH_ROLE_OPTIONS, createUser } from '@/services/users'

const BASE = '/admin/users'
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Errors = Partial<Record<'email' | 'password', string>>

/** Admin "New user": account (email, temp password, role) + profile. */
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
  const [errors, setErrors] = useState<Errors>({})
  const [isSaving, setIsSaving] = useState(false)
  const idempotencyKeyFor = useIdempotencyKey()

  async function onCreate() {
    const e: Errors = {}
    if (!email.trim()) e.email = t('adminPortal.required')
    else if (!EMAIL.test(email.trim())) e.email = t('adminPortal.validEmail')
    const pw = passwordSchema(t).safeParse(password)
    if (!pw.success) e.password = pw.error.issues[0]?.message
    if (Object.keys(e).length) {
      setErrors(e)
      return
    }
    setErrors({})
    setIsSaving(true)
    try {
      const input = {
        email: email.trim(),
        password,
        role,
        isVerified,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        displayName: displayName.trim() || undefined,
        phone: phone.trim() || undefined,
      }
      const created = await createUser(input, { idempotencyKey: idempotencyKeyFor(input) })
      invalidateAdminCaches()
      toastSuccess(t('users.created'))
      router.replace(`${BASE}/${created.data.id}` as never)
    } catch (err) {
      handleApiError(err, t('users.createFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <WkFormScreen
      title={t('users.new')}
      backHref={BASE}
      testID="e2e-admin-user-new"
      footer={
        <WkButton
          label={isSaving ? t('common.creating') : t('users.create')}
          loading={isSaving}
          height={54}
          onPress={() => void onCreate()}
        />
      }
    >
      <WkSection icon={KeyRound} title={t('users.account')}>
        <WkField
          label={t('common.email')}
          required
          value={email}
          onChangeText={(v) => {
            setEmail(v)
            if (errors.email) setErrors((x) => ({ ...x, email: undefined }))
          }}
          error={errors.email}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="user@example.com"
          ltr
        />
        <WkPasswordField
          label={t('users.tempPassword')}
          required
          value={password}
          onChangeText={(v) => {
            setPassword(v)
            if (errors.password) setErrors((x) => ({ ...x, password: undefined }))
          }}
          error={errors.password}
          hint={t('account.passwordHint')}
        />
        <WkChoice
          label={t('users.role')}
          options={enumOptions(t, 'role', AUTH_ROLE_OPTIONS)}
          value={role}
          onChange={(value) => setRole(value as AuthRole)}
        />
        <WkToggle
          label={t('users.verified')}
          hint={t('adminPortal.verifiedHint')}
          value={isVerified}
          onChange={setIsVerified}
        />
      </WkSection>
      <WkSection icon={UserRound} title={t('users.profile')}>
        <WkField label={t('common.firstName')} value={firstName} onChangeText={setFirstName} />
        <WkField label={t('common.lastName')} value={lastName} onChangeText={setLastName} />
        <WkField
          label={t('common.displayName')}
          value={displayName}
          onChangeText={setDisplayName}
        />
        <WkField
          label={t('common.phone')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          ltr
        />
      </WkSection>
    </WkFormScreen>
  )
}
