import { useRef, useState } from 'react'
import { type TextInputInstance, View } from 'react-native'
import { router } from 'expo-router'
import { Lock, Mail } from 'lucide-react-native'

import { loginSchema } from '@/features/auth/login.schema'
import { useAuthTranslation } from '@/features/auth/useAuthTranslation'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { type FieldErrors, parseForm } from '@/lib/form'
import { homePathForRole } from '@/navigation'
import { ApiError } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'

import { AuthButton, AuthField } from './ui'

export const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function LoginForm() {
  const { t } = useAuthTranslation()
  const login = useAuthStore((s) => s.login)
  const handleApiError = useHandleApiError()
  const passwordRef = useRef<TextInputInstance>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onSubmit() {
    if (isSubmitting) return
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
    <View className="gap-5">
      <AuthField
        label={t('auth.email')}
        icon={Mail}
        error={fieldErrors.email}
        valid={EMAIL_SHAPE.test(email.trim())}
        placeholder={t('auth.emailPlaceholder')}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        keyboardType="email-address"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
        value={email}
        onChangeText={(value) => {
          setEmail(value)
          if (fieldErrors.email) setFieldErrors((e) => ({ ...e, email: undefined }))
        }}
      />

      <AuthField
        inputRef={passwordRef}
        label={t('auth.password')}
        icon={Lock}
        error={fieldErrors.password}
        placeholder={t('auth.passwordPlaceholder')}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={() => void onSubmit()}
        value={password}
        onChangeText={(value) => {
          setPassword(value)
          if (fieldErrors.password) setFieldErrors((e) => ({ ...e, password: undefined }))
        }}
      />

      <View className="pt-1">
        <AuthButton
          testID="e2e-login-submit"
          label={isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
          loading={isSubmitting}
          onPress={() => void onSubmit()}
        />
      </View>
    </View>
  )
}
