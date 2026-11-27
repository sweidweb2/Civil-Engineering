import { useCallback, useMemo } from 'react'
import { FlatList, RefreshControl, Text, View } from 'react-native'
import { router } from 'expo-router'
import { Plus, Users } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useStatusBarStyle } from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { UserRoleCategoryCard } from '@/features/admin/UserRoleCategoryCard'
import { ListingGridSkeleton } from '@/components/wk/storefront'
import { WkError } from '@/components/wk/kit'
import { useWkPalette, WK_TAB_SPACE } from '@/components/wk/palette'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useRemoteData } from '@/hooks/useRemoteData'
import { cacheKeys } from '@/lib/cacheKeys'
import { LIST_PERF, useStableListHeader } from '@/lib/listPerf'
import { toPairs } from '@/lib/pagedRows'
import { errorMessage } from '@/services/feedback'
import { listUsers, USER_ROLE_CATEGORIES, type UserRoleCounts } from '@/services/users'
import { MONO_STYLE } from '@/theme/typography'

const BASE = '/admin/users'
const EMPTY_ROLES: UserRoleCounts = {
  SUPER: 0,
  ADMIN: 0,
  MANAGER: 0,
  PROVIDER: 0,
  WORKER: 0,
  CLIENT: 0,
}

/**
 * Admin "Users" tab: browse by role category first (isometric cards), then
 * open the nested role grid at `/admin/users/roles/:role`.
 */
export function AdminUsersScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { c, shadow, isDark } = useWkPalette()
  useStatusBarStyle(isDark ? 'light' : 'dark')

  const load = useCallback(async () => {
    const r = await listUsers(1, 1, undefined, true)
    return r.meta.counts?.roles ?? EMPTY_ROLES
  }, [])

  const pull = usePullToRefresh()
  const remote = useRemoteData(load, {
    cacheKey: `${cacheKeys.users}:role-counts`,
  })

  const roles = remote.status === 'success' ? remote.data : EMPTY_ROLES
  const cards = useMemo(
    () => USER_ROLE_CATEGORIES.map((role) => ({ role, count: roles[role] ?? 0 })),
    [roles],
  )
  const rows = useMemo(() => toPairs(cards), [cards])
  const isFirstLoad = remote.isLoading
  const totalUsers = cards.reduce((sum, card) => sum + card.count, 0)

  const header = (
    <View className="gap-3.5 pb-3.5">
      <View className="flex-row items-center gap-2.5">
        <View className="min-w-0 flex-1">
          <Text className="text-[22px] font-semibold tracking-tight text-wk-ink">
            {t('users.title')}
          </Text>
          {remote.status === 'success' ? (
            <Text
              className="mt-1 text-[11px] font-medium uppercase text-wk-ink3"
              style={MONO_STYLE}
            >
              {t('users.userCount', { count: totalUsers })}
            </Text>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('users.new')}
          onPress={() => router.push(`${BASE}/new` as never)}
          className="size-12 items-center justify-center rounded-[14px] bg-wk-ink active:opacity-80"
          style={shadow}
        >
          <Plus size={22} color={c.bg} strokeWidth={2} />
        </Pressable>
      </View>

      {remote.status === 'error' ? (
        <WkError
          message={errorMessage(remote.error, t('common.errorGeneric'))}
          onRetry={() => void remote.refetch()}
        />
      ) : null}
      {isFirstLoad ? <ListingGridSkeleton count={6} /> : null}
    </View>
  )

  const empty =
    !isFirstLoad && remote.status === 'success' && cards.length === 0 ? (
      <View className="items-center gap-2.5 px-6 py-10">
        <View
          className="size-16 items-center justify-center rounded-[20px] bg-wk-sf"
          style={shadow}
        >
          <Users size={28} color={c.brand} strokeWidth={1.75} />
        </View>
        <Text className="mt-1.5 text-[17px] font-semibold text-wk-ink">{t('users.empty')}</Text>
      </View>
    ) : undefined

  const listHeader = useStableListHeader(header)

  return (
    <View className="flex-1 bg-wk-bg" testID="e2e-admin-users">
      <FlatList
        data={isFirstLoad ? [] : rows}
        keyExtractor={(row) => row.map((card) => card.role).join(':')}
        {...LIST_PERF}
        renderItem={({ item: row }) => (
          <View className="flex-row gap-3">
            {row.map((card) => (
              <UserRoleCategoryCard
                key={card.role}
                role={card.role}
                count={card.count}
                onPress={() => router.push(`${BASE}/roles/${card.role}` as never)}
              />
            ))}
            {row.length === 1 ? <View className="flex-1" /> : null}
          </View>
        )}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={empty}
        contentContainerClassName="px-5"
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: WK_TAB_SPACE + insets.bottom,
        }}
        refreshControl={
          <RefreshControl
            refreshing={remote.isFetching && !isFirstLoad}
            onRefresh={() => pull(() => remote.refetch())}
            tintColor={c.ink3}
            colors={[c.brand]}
          />
        }
      />
    </View>
  )
}
