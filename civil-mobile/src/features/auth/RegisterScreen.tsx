import { useMemo, useState } from 'react'
import { Pressable, Text } from 'react-native'
import { Link, Redirect, router } from 'expo-router'
import { Lock, Mail } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { ChoiceField, FieldRow, TextField } from '@/components/kit'
import { Button, ButtonText } from '@/components/ui/button'
import { AuthShell } from '@/features/auth/AuthShell'
import { registerSchema } from '@/features/auth/register.schema'
import { useThemeColors } from '@/hooks/useThemeColors'
import { type FieldErrors, parseForm } from '@/lib/form'
import { homePathForRole } from '@/navigation'
import type { RegisterRole } from '@/services/auth'
import { useHandleApiError } from '@/services/toast'
import { useAuthStore } from '@/stores/authStore'
import { glow } from '@/theme/shadows'

export function RegisterScreen() {
  const { t } = useTranslation()
  const colors = useThemeColors()
  const user = useAuthStore((s) => s.user)
  const register = useAuthStore((s) => s.register)
  const handleApiError = useHandleApiError()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<RegisterRole>('CLIENT')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const roleOptions = useMemo(
    () => [
      { value: 'CLIENT', label: t('auth.roleClient') },
      { value: 'MANAGER', label: t('auth.roleManager') },
      { value: 'WORKER', label: t('auth.roleWorker') },
    ],
    [t],
  )

  if (user) {
    return <Redirect href={homePathForRole(user.role) as never} />
  }

  async function onSubmit() {
    const parsed = parseForm(registerSchema, {
      firstName,
      lastName,
      email,
      password,
      role,
    })
    if (!parsed.success) {
      setFieldErrors(parsed.fieldErrors)
      return
    }

    setFieldErrors({})
    setIsSubmitting(true)
    try {
      const result = await register({
        email: parsed.data.email,
        password: parsed.data.password,
        firstName: parsed.data.firstName || undefined,
        lastName: parsed.data.lastName || undefined,
        role: parsed.data.role,
      })
      if (result.pendingApproval) {
        router.replace('/pending-approval' as never)
        return
      }
      const nextRole = useAuthStore.getState().user?.role
      router.replace(homePathForRole(nextRole) as never)
    } catch (error) {
      handleApiError(error, t('auth.couldNotRegister'), t('auth.couldNotRegister'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      compact
      testID="e2e-register"
      title={t('auth.createAccount')}
      subtitle={t('auth.registerRoleNote')}
    >
      <ChoiceField
        label={t('auth.role')}
        options={roleOptions}
        value={role}
        onChange={(value) => setRole(value as RegisterRole)}
        required
        helper={role === 'CLIENT' ? t('auth.roleClientHint') : t('auth.rolePendingHint')}
      />

      <FieldRow>
        <TextField
          label={t('auth.firstName')}
          error={fieldErrors.firstName}
          placeholder={t('auth.firstName')}
          value={firstName}
          onChangeText={setFirstName}
        />
        <TextField
          label={t('auth.lastName')}
          error={fieldErrors.lastName}
          placeholder={t('auth.lastName')}
          value={lastName}
          onChangeText={setLastName}
        />
      </FieldRow>

      <TextField
        label={t('auth.email')}
        required
        icon={Mail}
        error={fieldErrors.email}
        placeholder={t('auth.email')}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextField
        label={t('auth.password')}
        required
        icon={Lock}
        error={fieldErrors.password}
        placeholder={t('auth.password')}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Button
        size="lg"
        className="mt-2"
        onPress={() => void onSubmit()}
        disabled={isSubmitting}
        style={glow(colors.primary, 0.35)}
      >
        <ButtonText className="text-base font-bold">
          {isSubmitting ? t('auth.creating') : t('auth.register')}
        </ButtonText>
      </Button>

      <Link href="/login" asChild>
        <Pressable className="py-2" hitSlop={8}>
          <Text className="text-center text-sm text-muted-foreground">
            {t('auth.haveAccount')}{' '}
            <Text className="font-bold text-primary">{t('auth.signIn')}</Text>
          </Text>
        </Pressable>
      </Link>
    </AuthShell>
  )
}
