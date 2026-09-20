import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Link, Redirect, router } from 'expo-router'

import { FormField } from '@/components/forms/FormField'
import { Header } from '@/components/layout/Header'
import { Button, ButtonText } from '@/components/ui/button'
import { Input, InputField } from '@/components/ui/input'
import { registerSchema } from '@/features/auth/register.schema'
import { type FieldErrors,parseForm } from '@/lib/form'
import { ApiError } from '@/services/api'
import { showApiAlert } from '@/services/feedback'
import { useToastApiError } from '@/services/toast'
import { useAuthStore } from '@/stores/authStore'

export function RegisterScreen() {
  const user = useAuthStore((s) => s.user)
  const register = useAuthStore((s) => s.register)
  const toastApiError = useToastApiError()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (user) {
    return <Redirect href="/home" />
  }

  async function onSubmit() {
    const parsed = parseForm(registerSchema, {
      firstName,
      lastName,
      email,
      password,
    })
    if (!parsed.success) {
      setFieldErrors(parsed.fieldErrors)
      return
    }

    setFieldErrors({})
    setIsSubmitting(true)
    try {
      await register({
        email: parsed.data.email,
        password: parsed.data.password,
        firstName: parsed.data.firstName || undefined,
        lastName: parsed.data.lastName || undefined,
      })
      router.replace('/home')
    } catch (error) {
      if (error instanceof ApiError && error.status >= 500) {
        toastApiError(error)
      } else {
        showApiAlert(error, 'Register failed', 'Could not register')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <View className="flex-1 bg-background" testID="e2e-register">
      <Header title="Create account" />
      <View className="gap-4 px-4 py-6">
        <Text className="text-sm text-muted-foreground">
          New accounts start with the CLIENT role.
        </Text>

        <FormField
          label="First name"
          isInvalid={Boolean(fieldErrors.firstName)}
          errorText={fieldErrors.firstName}
        >
          <Input>
            <InputField placeholder="First name" value={firstName} onChangeText={setFirstName} />
          </Input>
        </FormField>

        <FormField
          label="Last name"
          isInvalid={Boolean(fieldErrors.lastName)}
          errorText={fieldErrors.lastName}
        >
          <Input>
            <InputField placeholder="Last name" value={lastName} onChangeText={setLastName} />
          </Input>
        </FormField>

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
              placeholder="Password (min 8)"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </Input>
        </FormField>

        <Button onPress={() => void onSubmit()} disabled={isSubmitting}>
          <ButtonText>{isSubmitting ? 'Creating…' : 'Register'}</ButtonText>
        </Button>

        <Link href="/login" asChild>
          <Pressable>
            <Text className="text-center text-sm text-muted-foreground">
              Already have an account? <Text className="text-foreground">Sign in</Text>
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  )
}
