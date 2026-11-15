import { ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { Avatar, Card, HeroHeader, IconTile, SectionLabel, type Tone } from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { LogoutRow } from '@/features/account/AccountForms'
import { useThemeColors } from '@/hooks/useThemeColors'
import { enumLabel } from '@/i18n/labels'
import { userDisplayName } from '@/lib/user'
import { ADMIN_MORE_LINKS } from '@/navigation'
import { useAuthStore } from '@/stores/authStore'

const LINK_TONES: Record<string, Tone> = {
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
      <HeroHeader title={t('nav.more')} subtitle={t('more.subtitle')} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-6 pt-5"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open your account"
          className="flex-row items-center gap-3 rounded-3xl border border-border/60 bg-card p-4 active:opacity-80"
          onPress={() => router.push('/admin/account' as never)}
        >
          <Avatar name={name} size={52} />
          <View className="min-w-0 flex-1">
            <Text className="text-base font-bold text-foreground" numberOfLines={1}>
              {name}
            </Text>
            <Text className="text-sm text-muted-foreground" numberOfLines={1}>
              {user ? `${enumLabel(t, 'role', user.role)} · ${user.email}` : ''}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.disabled} />
        </Pressable>

        <View className="gap-2">
          <SectionLabel>{t('more.manage')}</SectionLabel>
          <Card className="py-1">
            {ADMIN_MORE_LINKS.map((item, index) => {
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityLabel={t(`more.links.${item.key}.title`)}
                  className={`flex-row items-center gap-3 py-3 active:opacity-70 ${
                    index === ADMIN_MORE_LINKS.length - 1 ? '' : 'border-b border-border/60'
                  }`}
                  onPress={() => router.push(item.href as never)}
                >
                  <IconTile icon={item.icon} tone={LINK_TONES[item.key] ?? 'primary'} />
                  <View className="min-w-0 flex-1">
                    <Text className="text-base font-semibold text-foreground">
                      {t(`more.links.${item.key}.title`)}
                    </Text>
                    <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                      {t(`more.links.${item.key}.description`)}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={colors.disabled} />
                </Pressable>
              )
            })}
          </Card>
        </View>

        <LogoutRow />
      </ScrollView>
    </View>
  )
}
