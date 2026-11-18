import { View } from 'react-native'
import { Construction } from 'lucide-react-native'

import { EmptyState, ScreenHeader } from '@/components/kit'
import { LogoutButton } from '@/features/portals/LogoutButton'

type PortalPlaceholderScreenProps = {
  title: string
  description?: string
  showLogout?: boolean
}

/** Thin shell screen until the portal feature is wired: header + honest empty state. */
export function PortalPlaceholderScreen({
  title,
  description = 'This section isn’t on mobile yet. It will show up here once it’s ready.',
  showLogout = false,
}: PortalPlaceholderScreenProps) {
  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title={title} right={showLogout ? <LogoutButton /> : undefined} />
      <View className="px-5">
        <EmptyState icon={Construction} title={title} description={description} />
      </View>
    </View>
  )
}
