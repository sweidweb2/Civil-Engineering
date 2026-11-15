import { Text, View } from 'react-native'
import { HardHat } from 'lucide-react-native'

import { Header } from '@/components/layout/Header'
import { ScreenContainer } from '@/components/layout/ScreenContainer'
import { LogoutButton } from '@/features/portals/LogoutButton'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useAuthStore } from '@/stores/authStore'

type PortalHomeScreenProps = {
  title: string
  portalLabel: string
}

export function PortalHomeScreen({ title, portalLabel }: PortalHomeScreenProps) {
  const colors = useThemeColors()
  const user = useAuthStore((s) => s.user)

  const name =
    user?.profile?.displayName ||
    [user?.profile?.firstName, user?.profile?.lastName].filter(Boolean).join(' ') ||
    user?.email ||
    'there'

  return (
    <View className="flex-1 bg-background" testID="e2e-root">
      <Header title={title} rightSlot={<LogoutButton />} />
      <ScreenContainer>
        <View className="items-center gap-4 py-12">
          <View className="size-16 items-center justify-center rounded-2xl border border-border bg-muted/40">
            <HardHat size={32} color={colors.text} />
          </View>
          <Text className="text-center text-2xl font-semibold text-foreground">
            Welcome, {name}
          </Text>
          <Text className="text-center text-base text-muted-foreground">
            You are in the <Text className="font-medium text-foreground">{portalLabel}</Text>
            {user?.role ? (
              <>
                {' '}
                as <Text className="font-medium text-foreground">{user.role}</Text>
              </>
            ) : null}
            .
          </Text>
        </View>
      </ScreenContainer>
    </View>
  )
}
