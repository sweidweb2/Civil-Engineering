import { View } from 'react-native'
import { useTranslation } from 'react-i18next'

import { EmptyState, IdentityBlock, ScreenHeader, useTodayCaption } from '@/components/kit'
import { LogoutButton } from '@/components/LogoutButton'
import { userDisplayLabel } from '@/lib/user'
import { useAuthStore } from '@/stores/authStore'

type PortalHomeScreenProps = {
  title: string
  portalLabel: string
}

/** Minimal portal home (client / super): who you are, where you are, sign out. */
export function PortalHomeScreen({ title, portalLabel }: PortalHomeScreenProps) {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const today = useTodayCaption()
  const name = user ? userDisplayLabel(user) : t('dashboard.there')

  return (
    <View className="flex-1 bg-background" testID="e2e-root">
      <ScreenHeader caption={today} title={title} right={<LogoutButton />} />
      <View className="gap-7 px-5 pt-3">
        <IdentityBlock name={name} detail={[portalLabel, user?.role].filter(Boolean).join(' · ')} />
        <EmptyState
          title={t('portals.inPortal', { portal: portalLabel })}
          description={t('portals.comingSoon')}
        />
      </View>
    </View>
  )
}
