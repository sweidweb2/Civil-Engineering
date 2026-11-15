import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Link, Redirect, router } from 'expo-router'
import { useTranslation } from 'react-i18next'

import { FormField } from '@/components/forms/FormField'
import { Header } from '@/components/layout/Header'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { Input, InputField } from '@/components/ui/input'
import { loginSchema } from '@/features/auth/login.schema'
import { type FieldErrors, parseForm } from '@/lib/form'
import { homePathForRole } from '@/navigation'
import { ApiError } from '@/services/api'
import { showApiAlert } from '@/services/feedback'
import { useToastApiError } from '@/services/toast'
import { useAuthStore } from '@/stores/authStore'

export function LoginScreen() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const login = useAuthStore((s) => s.login)
  const toastApiError = useToastApiError()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (user) {
    return <Redirect href={homePathForRole(user.role) as never} />
  }

  async function onSubmit() {
    const parsed = parseForm(loginSchema, { email, password })
    if (!parsed.success) {
      setFieldErrors(parsed.fieldErrors)
      return
    }

    setFieldErrors({})
    setIsSubmitting(true)
    try {
      await login(parsed.data.email, parsed.data.password)
      const role = useAuthStore.getState().user?.role
      router.replace(homePathForRole(role) as never)
    } catch (error) {
      if (error instanceof ApiError && error.code === 'ACCOUNT_PENDING') {
        router.replace('/pending-approval' as never)
        return
      }
      if (error instanceof ApiError && error.status >= 500) {
        toastApiError(error)
      } else {
        showApiAlert(error, t('auth.couldNotSignIn'), t('auth.couldNotSignIn'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <View className="flex-1 bg-background" testID="e2e-login">
      <Header title={t('auth.signIn')} />
      <View className="gap-4 px-4 py-6">
        <Text className="text-sm text-muted-foreground">{t('auth.signInSubtitle')}</Text>

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

        <Button
          onPress={() => void onSubmit()}
          disabled={isSubmitting}
          accessibilityState={{ busy: isSubmitting }}
        >
          {isSubmitting ? <ButtonSpinner /> : null}
          <ButtonText>{isSubmitting ? t('auth.signingIn') : t('auth.signIn')}</ButtonText>
        </Button>

        <Link href="/register" asChild>
          <Pressable>
            <Text className="text-center text-sm text-muted-foreground">
              {t('auth.noAccount')} <Text className="text-foreground">{t('auth.register')}</Text>
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  )
}
