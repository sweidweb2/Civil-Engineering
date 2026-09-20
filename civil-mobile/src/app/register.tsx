import { useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { Link, Redirect, router } from 'expo-router'

import { Header } from '@/components/layout/Header'
import { Button, ButtonText } from '@/components/ui/button'
import { Input, InputField } from '@/components/ui/input'
import { ApiError } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'

export default function RegisterScreen() {
  const user = useAuthStore((s) => s.user)
  const register = useAuthStore((s) => s.register)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (user) {
    return <Redirect href="/home" />
  }

  async function onSubmit() {
    setIsSubmitting(true)
    try {
      await register({
        email: email.trim(),
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      })
      router.replace('/home')
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Could not register'
      Alert.alert('Register failed', message)
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

        <Input>
          <InputField
            placeholder="First name"
            value={firstName}
            onChangeText={setFirstName}
          />
        </Input>

        <Input>
          <InputField
            placeholder="Last name"
            value={lastName}
            onChangeText={setLastName}
          />
        </Input>

        <Input>
          <InputField
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </Input>

        <Input>
          <InputField
            placeholder="Password (min 8)"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </Input>

        <Button onPress={() => void onSubmit()} disabled={isSubmitting}>
          <ButtonText>{isSubmitting ? 'Creating…' : 'Register'}</ButtonText>
        </Button>

        <Link href="/login" asChild>
          <Pressable>
            <Text className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Text className="text-foreground">Sign in</Text>
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  )
}
