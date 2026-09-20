import { useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { Link, Redirect, router } from 'expo-router'

import { Header } from '@/components/layout/Header'
import { Button, ButtonText } from '@/components/ui/button'
import { Input, InputField } from '@/components/ui/input'
import { ApiError } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'

export default function LoginScreen() {
  const user = useAuthStore((s) => s.user)
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (user) {
    return <Redirect href="/home" />
  }

  async function onSubmit() {
    setIsSubmitting(true)
    try {
      await login(email.trim(), password)
      router.replace('/home')
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Could not sign in'
      Alert.alert('Sign in failed', message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <View className="flex-1 bg-background" testID="e2e-login">
      <Header title="Sign in" />
      <View className="gap-4 px-4 py-6">
        <Text className="text-sm text-muted-foreground">
          Use your Civil Engineering account.
        </Text>

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
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </Input>

        <Button onPress={() => void onSubmit()} disabled={isSubmitting}>
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
