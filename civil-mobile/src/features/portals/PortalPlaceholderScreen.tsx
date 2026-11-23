import { View } from 'react-native'
import { Construction } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { EmptyState, ScreenHeader } from '@/components/kit'
import { LogoutButton } from '@/components/LogoutButton'

type PortalPlaceholderScreenProps = {
  title: string
  description?: string
  showLogout?: boolean
}

/** Thin shell screen until the portal feature is wired: header + honest empty state. */
export function PortalPlaceholderScreen({
  title,
  description,
  showLogout = false,
}: PortalPlaceholderScreenProps) {
  const { t } = useTranslation()
  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title={title} right={showLogout ? <LogoutButton /> : undefined} />
      <View className="px-5">
        <EmptyState
          icon={Construction}
          title={title}
          description={description ?? t('portals.placeholderBody')}
        />
      </View>
    </View>
  )
}
