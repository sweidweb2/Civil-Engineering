import { ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'

import { Avatar, Card, HeroHeader, IconTile, SectionLabel, type Tone } from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { LogoutRow } from '@/features/account/AccountForms'
import { useThemeColors } from '@/hooks/useThemeColors'
import { roleLabel, userDisplayName } from '@/lib/user'
import { ADMIN_MORE_LINKS } from '@/navigation'
import { useAuthStore } from '@/stores/authStore'

const LINK_META: Record<string, { tone: Tone; description: string }> = {
  queue: { tone: 'warning', description: 'Approve or remove worker sign-ups' },
  directory: { tone: 'info', description: 'Browse the active marketplace' },
  listings: { tone: 'primary', description: 'Manage every provider listing' },
  reviews: { tone: 'success', description: 'Moderate ratings and comments' },
  categories: { tone: 'neutral', description: 'Organise materials, equipment and services' },
}

export function AdminMoreScreen() {
  const colors = useThemeColors()
  const user = useAuthStore((s) => s.user)
  const name = user ? userDisplayName(user) : 'Account'

  return (
    <View className="flex-1 bg-background">
      <HeroHeader title="More" subtitle="Everything else in the admin panel" />

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
              {user ? `${roleLabel(user.role)} · ${user.email}` : ''}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.disabled} />
        </Pressable>

        <View className="gap-2">
          <SectionLabel>Manage</SectionLabel>
          <Card className="py-1">
            {ADMIN_MORE_LINKS.map((item, index) => {
              const meta = LINK_META[item.key]
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  className={`flex-row items-center gap-3 py-3 active:opacity-70 ${
                    index === ADMIN_MORE_LINKS.length - 1 ? '' : 'border-b border-border/60'
                  }`}
                  onPress={() => router.push(item.href as never)}
                >
                  <IconTile icon={item.icon} tone={meta?.tone ?? 'primary'} />
                  <View className="min-w-0 flex-1">
                    <Text className="text-base font-semibold text-foreground">{item.label}</Text>
                    {meta ? (
                      <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                        {meta.description}
                      </Text>
                    ) : null}
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
