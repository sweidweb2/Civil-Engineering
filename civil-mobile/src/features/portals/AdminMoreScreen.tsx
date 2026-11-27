import { useCallback, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { router } from 'expo-router'
import { ChevronRight, LogOut } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { useLogout } from '@/components/LogoutButton'
import { Pressable } from '@/components/ui/pressable'
import {
  flipStyle,
  WkConfirm,
  type WkConfirmState,
  WkGroup,
  WkTabScroll,
} from '@/components/wk/kit'
import { useWkPalette } from '@/components/wk/palette'
import { MyAvatarPhoto } from '@/features/account/MyAvatarPhoto'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumLabel } from '@/i18n/labels'
import { cacheKeys } from '@/lib/cacheKeys'
import { ltr } from '@/lib/rtl'
import { initialsOf, userDisplayName } from '@/lib/user'
import { ADMIN_MORE_LINKS } from '@/navigation'
import { getAdminOverview } from '@/services/users'
import { useAuthStore } from '@/stores/authStore'

/** Admin "More" tab: identity card → account, admin tools with badges, log out. */
export function AdminMoreScreen() {
  const { t } = useTranslation()
  const { c, shadow } = useWkPalette()
  const user = useAuthStore((s) => s.user)
  const name = user ? userDisplayName(user) : t('account.title')
  const { isLoggingOut, logoutNow } = useLogout()
  const [confirm, setConfirm] = useState<WkConfirmState | null>(null)

  // Same cache entry as Home, so badges are free when coming from there.
  const load = useCallback(async () => (await getAdminOverview()).data, [])
  const remote = useRemoteData(load, { cacheKey: cacheKeys.dashboardAdmin, persist: true })
  const overview = remote.status === 'success' ? remote.data : null
  const badge: Partial<Record<string, number>> = {
    queue: overview?.pendingRequests,
    verifications: overview?.verificationRequests,
    reviews: overview?.pendingReviews,
  }

  return (
    <WkTabScroll
      testID="e2e-admin-more"
      refreshing={remote.isFetching && Boolean(overview)}
      onRefresh={() => remote.refetch()}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('dashboard.openAccount')}
        onPress={() => router.push('/admin/account' as never)}
        className="flex-row items-center gap-3.5 rounded-3xl bg-wk-hero p-[18px] active:opacity-90"
      >
        <View
          className="size-14 items-center justify-center overflow-hidden rounded-full"
          style={{ backgroundColor: 'rgba(134,227,166,0.16)' }}
        >
          <Text className="text-[19px] font-semibold text-wk-lime">{initialsOf(name)}</Text>
          <MyAvatarPhoto />
        </View>
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-[17px] font-semibold text-wk-hero-ink" numberOfLines={1}>
            {name}
          </Text>
          {user ? (
            <Text className="text-[13px] text-wk-hero-mute" numberOfLines={1}>
              {enumLabel(t, 'role', user.role)} · {ltr(user.email)}
            </Text>
          ) : null}
        </View>
        <View style={flipStyle()}>
          <ChevronRight size={20} color={c.heroMute} />
        </View>
      </Pressable>

      <WkGroup>
        {ADMIN_MORE_LINKS.map((item) => {
          const count = badge[item.key] ?? 0
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={t(`more.links.${item.key}.title`)}
              onPress={() => router.push(item.href as never)}
              className="min-h-[72px] flex-row items-center gap-3.5 bg-wk-sf px-4 py-3 active:bg-wk-sf2"
            >
              <View className="size-[42px] items-center justify-center rounded-xl bg-wk-brand-soft">
                <item.icon size={19} color={c.brand} strokeWidth={1.9} />
              </View>
              <View className="min-w-0 flex-1 gap-[3px]">
                <Text className="text-[15px] font-semibold text-wk-ink">
                  {t(`more.links.${item.key}.title`)}
                </Text>
                <Text className="text-[13px] text-wk-ink3" numberOfLines={1}>
                  {t(`more.links.${item.key}.description`)}
                </Text>
              </View>
              {count > 0 ? (
                <View className="h-6 min-w-6 items-center justify-center rounded-full bg-wk-amber-soft px-[7px]">
                  <Text className="text-xs font-semibold text-wk-amber">{count}</Text>
                </View>
              ) : null}
              <View style={flipStyle()}>
                <ChevronRight size={18} color={c.ink3} strokeWidth={1.9} />
              </View>
            </Pressable>
          )
        })}
      </WkGroup>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('account.logout')}
        accessibilityState={{ busy: isLoggingOut, disabled: isLoggingOut }}
        disabled={isLoggingOut}
        onPress={() =>
          setConfirm({
            title: t('account.logoutTitle'),
            body: t('account.logoutBody'),
            cta: t('account.logout'),
            onConfirm: () => {
              setConfirm(null)
              void logoutNow()
            },
          })
        }
        className="min-h-14 flex-row items-center gap-3 rounded-[20px] bg-wk-sf px-4 active:bg-wk-red-soft"
        style={shadow}
      >
        {isLoggingOut ? (
          <ActivityIndicator size="small" color={c.red} />
        ) : (
          <LogOut size={18} color={c.red} strokeWidth={1.9} />
        )}
        <Text className="text-[15px] font-medium text-wk-red">
          {isLoggingOut ? t('account.loggingOut') : t('account.logout')}
        </Text>
      </Pressable>

      <WkConfirm state={confirm} onCancel={() => setConfirm(null)} />
    </WkTabScroll>
  )
}
