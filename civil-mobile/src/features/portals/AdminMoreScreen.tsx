import { ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import {
  Avatar,
  DirectionalIcon,
  MenuGroup,
  MenuRow,
  ScreenHeader,
  SectionLabel,
  type Tone,
} from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { LogoutRow } from '@/features/account/AccountForms'
import { useThemeColors } from '@/hooks/useThemeColors'
import { enumLabel } from '@/i18n/labels'
import { ltr } from '@/lib/rtl'
import { userDisplayName } from '@/lib/user'
import { ADMIN_MORE_LINKS } from '@/navigation'
import { useAuthStore } from '@/stores/authStore'

const LINK_TONES: Record<string, Tone> = {
  providers: 'info',
  queue: 'warning',
  directory: 'info',
  listings: 'primary',
  reviews: 'success',
  categories: 'neutral',
}

export function AdminMoreScreen() {
  const { t } = useTranslation()
  const colors = useThemeColors()
  const user = useAuthStore((s) => s.user)
  const name = user ? userDisplayName(user) : t('account.title')

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title={t('nav.more')} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-6 pt-5"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open your account"
          className="flex-row items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 active:opacity-80"
          onPress={() => router.push('/admin/account' as never)}
        >
          <Avatar name={name} size={52} />
          <View className="min-w-0 flex-1">
            <Text className="text-base font-bold text-foreground" numberOfLines={1}>
              {name}
            </Text>
            <Text className="text-sm text-muted-foreground" numberOfLines={1}>
              {user ? `${enumLabel(t, 'role', user.role)} · ${ltr(user.email)}` : ''}
            </Text>
          </View>
          <DirectionalIcon icon={ChevronRight} size={18} color={colors.disabled} />
        </Pressable>

        <View className="gap-3">
          <SectionLabel>{t('more.manage')}</SectionLabel>
          <MenuGroup>
            {ADMIN_MORE_LINKS.map((item, index) => (
              <MenuRow
                key={item.key}
                icon={item.icon}
                tone={LINK_TONES[item.key] ?? 'primary'}
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
