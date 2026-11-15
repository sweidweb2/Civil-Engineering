import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Link, Redirect, router } from 'expo-router'

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
      // Blocking alert for auth failure; toast available for non-blocking cases
      if (error instanceof ApiError && error.status >= 500) {
        toastApiError(error)
      } else {
        showApiAlert(error, 'Sign in failed', 'Could not sign in')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <View className="flex-1 bg-background" testID="e2e-login">
      <Header title="Sign in" />
      <View className="gap-4 px-4 py-6">
        <Text className="text-sm text-muted-foreground">Use your Civil Engineering account.</Text>

        <FormField
          label="Email"
          isRequired
          isInvalid={Boolean(fieldErrors.email)}
          errorText={fieldErrors.email}
        >
          <Input>
            <InputField
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </Input>
        </FormField>

        <FormField
          label="Password"
          isRequired
          isInvalid={Boolean(fieldErrors.password)}
          errorText={fieldErrors.password}
        >
          <Input>
            <InputField
              placeholder="Password"
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
          <ButtonText>{isSubmitting ? 'Signing in…' : 'Sign in'}</ButtonText>
        </Button>

        <Link href="/register" asChild>
          <Pressable>
            <Text className="text-center text-sm text-muted-foreground">
              No account? <Text className="text-foreground">Register</Text>
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  )
}
