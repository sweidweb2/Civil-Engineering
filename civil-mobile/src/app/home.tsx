import { HardHat } from 'lucide-react-native'
import { Redirect } from 'expo-router'
import { Text, View } from 'react-native'

import { Header } from '@/components/layout/Header'
import { Button, ButtonText } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const isHydrated = useAuthStore((s) => s.isHydrated)

  if (!isHydrated) {
    return null
  }

  if (!user) {
    return <Redirect href="/login" />
  }

  const name =
    user.profile?.displayName ||
    [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ') ||
    user.email

  return (
    <View className="flex-1 bg-background" testID="e2e-root">
      <Header
        title="Home"
        rightSlot={
          <Button size="sm" variant="outline" onPress={() => void logout()}>
            <ButtonText>Log out</ButtonText>
          </Button>
        }
      />
      <View className="items-center gap-4 px-6 py-16">
        <View className="size-16 items-center justify-center rounded-2xl border border-border bg-muted/40">
          <HardHat size={32} color="#111" />
        </View>
        <Text className="text-center text-2xl font-semibold text-foreground">
          Welcome, {name}
        </Text>
        <Text className="text-center text-base text-muted-foreground">
          You are signed in as{' '}
          <Text className="font-medium text-foreground">{user.role}</Text>. This is
          your home base for Civil Engineering.
        </Text>
      </View>
    </View>
  )
}
