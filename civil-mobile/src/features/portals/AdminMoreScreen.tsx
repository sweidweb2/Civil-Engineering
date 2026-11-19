import { ScrollView, View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'

import { IdentityBlock, MenuGroup, MenuRow, ScreenHeader, SectionLabel } from '@/components/kit'
import { LogoutRow } from '@/components/LogoutButton'
import { enumLabel } from '@/i18n/labels'
import { ltr } from '@/lib/rtl'
import { userDisplayName } from '@/lib/user'
import { ADMIN_MORE_LINKS } from '@/navigation'
import { useAuthStore } from '@/stores/authStore'

export function AdminMoreScreen() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const name = user ? userDisplayName(user) : t('account.title')

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title={t('nav.more')} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-7 px-5 pb-10 pt-3"
        showsVerticalScrollIndicator={false}
      >
        <IdentityBlock
          name={name}
          detail={user ? `${enumLabel(t, 'role', user.role)} · ${ltr(user.email)}` : undefined}
          accessibilityLabel={t('dashboard.openAccount')}
          onPress={() => router.push('/admin/account' as never)}
        />

        <View className="gap-3">
          <SectionLabel>{t('more.manage')}</SectionLabel>
          <MenuGroup>
            {ADMIN_MORE_LINKS.map((item, index) => (
              <MenuRow
                key={item.key}
                icon={item.icon}
                label={t(`more.links.${item.key}.title`)}
                hint={t(`more.links.${item.key}.description`)}
                last={index === ADMIN_MORE_LINKS.length - 1}
                onPress={() => router.push(item.href as never)}
              />
            ))}
          </MenuGroup>
        </View>

        <LogoutRow />
      </ScrollView>
    </View>
  )
}
