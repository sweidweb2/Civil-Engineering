import { useState } from 'react'
import { Pressable, Text } from 'react-native'
import { Link, Redirect, router } from 'expo-router'
import { Lock, Mail } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { TextField } from '@/components/kit'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { AuthShell } from '@/features/auth/AuthShell'
import { loginSchema } from '@/features/auth/login.schema'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { type FieldErrors, parseForm } from '@/lib/form'
import { homePathForRole } from '@/navigation'
import { ApiError } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'

export function LoginScreen() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const login = useAuthStore((s) => s.login)
  const handleApiError = useHandleApiError()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (user) {
    return <Redirect href={homePathForRole(user.role) as never} />
  }

  async function onSubmit() {
    const parsed = parseForm(loginSchema(t), { email, password })
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
      handleApiError(error, t('auth.couldNotSignIn'), t('auth.couldNotSignIn'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      testID="e2e-login"
      title={t('auth.signIn')}
      subtitle={t('auth.signInSubtitle')}
      footer={
        <>
          <Button
            onPress={() => void onSubmit()}
            disabled={isSubmitting}
            accessibilityState={{ busy: isSubmitting }}
          >
            {isSubmitting ? <ButtonSpinner /> : null}
            <ButtonText>{isSubmitting ? t('auth.signingIn') : t('auth.signIn')}</ButtonText>
          </Button>

          <Link href="/register" asChild>
            <Pressable
              accessibilityRole="link"
              className="min-h-11 items-center justify-center active:opacity-60"
            >
              <Text className="text-center text-base text-muted-foreground">
                {t('auth.noAccount')}{' '}
                <Text className="font-medium text-foreground">{t('auth.register')}</Text>
              </Text>
            </Pressable>
          </Link>
        </>
      }
    >
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
    </AuthShell>
  )
}
