import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Link, Redirect, router } from 'expo-router'
import { useTranslation } from 'react-i18next'

import { FormField } from '@/components/forms/FormField'
import { ChoiceField } from '@/components/kit'
import { Header } from '@/components/layout/Header'
import { Button, ButtonText } from '@/components/ui/button'
import { Input, InputField } from '@/components/ui/input'
import { registerSchema } from '@/features/auth/register.schema'
import { type FieldErrors, parseForm } from '@/lib/form'
import { homePathForRole } from '@/navigation'
import { ApiError } from '@/services/api'
import type { RegisterRole } from '@/services/auth'
import { showApiAlert } from '@/services/feedback'
import { useToastApiError } from '@/services/toast'
import { useAuthStore } from '@/stores/authStore'

export function RegisterScreen() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const register = useAuthStore((s) => s.register)
  const toastApiError = useToastApiError()
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
      if (error instanceof ApiError && error.status >= 500) {
        toastApiError(error)
      } else {
        showApiAlert(error, t('auth.couldNotRegister'), t('auth.couldNotRegister'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <View className="flex-1 bg-background" testID="e2e-register">
      <Header title={t('auth.createAccount')} />
      <View className="gap-4 px-4 py-6">
        <Text className="text-sm text-muted-foreground">{t('auth.registerRoleNote')}</Text>

        <ChoiceField
          label={t('auth.role')}
          options={roleOptions}
          value={role}
          onChange={(value) => setRole(value as RegisterRole)}
          required
          helper={role === 'CLIENT' ? t('auth.roleClientHint') : t('auth.rolePendingHint')}
        />

        <FormField
          label={t('auth.firstName')}
          isInvalid={Boolean(fieldErrors.firstName)}
          errorText={fieldErrors.firstName}
        >
          <Input>
            <InputField
              placeholder={t('auth.firstName')}
              value={firstName}
              onChangeText={setFirstName}
            />
          </Input>
        </FormField>

        <FormField
          label={t('auth.lastName')}
          isInvalid={Boolean(fieldErrors.lastName)}
          errorText={fieldErrors.lastName}
        >
          <Input>
            <InputField
              placeholder={t('auth.lastName')}
              value={lastName}
              onChangeText={setLastName}
            />
          </Input>
        </FormField>

        <FormField
          label={t('auth.email')}
          isRequired
          isInvalid={Boolean(fieldErrors.email)}
          errorText={fieldErrors.email}
        >
          <Input>
            <InputField
              placeholder={t('auth.email')}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </Input>
        </FormField>

        <FormField
          label={t('auth.password')}
          isRequired
          isInvalid={Boolean(fieldErrors.password)}
          errorText={fieldErrors.password}
        >
          <Input>
            <InputField
              placeholder={t('auth.password')}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </Input>
        </FormField>

        <Button onPress={() => void onSubmit()} disabled={isSubmitting}>
          <ButtonText>{isSubmitting ? t('auth.creating') : t('auth.register')}</ButtonText>
        </Button>

        <Link href="/login" asChild>
          <Pressable>
            <Text className="text-center text-sm text-muted-foreground">
              {t('auth.haveAccount')} <Text className="text-foreground">{t('auth.signIn')}</Text>
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  )
}
