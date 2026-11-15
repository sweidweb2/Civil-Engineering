import { Text, View } from 'react-native'

import { Header } from '@/components/layout/Header'
import { ScreenContainer } from '@/components/layout/ScreenContainer'
import { LogoutButton } from '@/features/portals/LogoutButton'

type PortalPlaceholderScreenProps = {
  title: string
  description?: string
  showLogout?: boolean
}

/** Thin shell screen until the portal feature is wired. */
export function PortalPlaceholderScreen({
  title,
  description = 'This screen is a mobile shell. Content will be wired next.',
  showLogout = false,
}: PortalPlaceholderScreenProps) {
  return (
    <View className="flex-1 bg-background">
      <Header title={title} rightSlot={showLogout ? <LogoutButton /> : undefined} />
      <ScreenContainer>
        <Text className="text-base text-muted-foreground">{description}</Text>
      </ScreenContainer>
    </View>
  )
}
