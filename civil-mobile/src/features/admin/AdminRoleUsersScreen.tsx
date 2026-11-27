import { useCallback } from 'react'
import { RefreshControl, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Plus, SearchX, Users } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useStatusBarStyle } from '@/components/kit'
import { WkGrid } from '@/components/wk/GridCard'
import { WkButton, WkError, WkTopBar } from '@/components/wk/kit'
import { PagedListFooter } from '@/components/wk/PagedListFooter'
import { useWkPalette } from '@/components/wk/palette'
import { WkSearchAddButton, WkSearchField } from '@/components/wk/SearchField'
import { ListingGridSkeleton } from '@/components/wk/storefront'
import { usePagedList } from '@/components/wk/usePagedList'
import { UserGridCard } from '@/features/admin/UserGridCard'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { enumLabel } from '@/i18n/labels'
import { cacheKeys } from '@/lib/cacheKeys'
import type { AuthRole } from '@/services/auth'
import { errorMessage } from '@/services/feedback'
import { listUsers, type User, USER_ROLE_CATEGORIES } from '@/services/users'
import { MONO_STYLE } from '@/theme/typography'

const PAGE_SIZE = 24
const BASE = '/admin/users'

function parseRole(value: string | string[] | undefined): AuthRole | null {
  const raw = typeof value === 'string' ? value : value?.[0]
  if (!raw) return null
  return (USER_ROLE_CATEGORIES as readonly string[]).includes(raw) ? (raw as AuthRole) : null
}

/**
 * Nested admin users grid for one role (opened from the role category hub).
 */
export function AdminRoleUsersScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { c, shadow, isDark } = useWkPalette()
  useStatusBarStyle(isDark ? 'light' : 'dark')

  const params = useLocalSearchParams<{ role?: string }>()
  const role = parseRole(params.role)
  const title = role ? enumLabel(t, 'role', role) : t('users.title')
  const pull = usePullToRefresh()

  const list = usePagedList<User>({
    cacheKeyPrefix: role ? `${cacheKeys.users}:role:${role}` : cacheKeys.users,
    enabled: Boolean(role),
    resetKey: role ?? undefined,
    fetcher: ({ page, query }) => {
      if (!role) throw new Error('Role required')
      return listUsers(page, PAGE_SIZE, query || undefined, false, role)
    },
  })

  const renderUser = useCallback(
    (user: User) => (
      <UserGridCard user={user} onPress={() => router.push(`${BASE}/${user.id}` as never)} />
    ),
    [],
  )

  const header = (
    <View className="gap-3.5 pb-3.5">
      <WkSearchField
        value={list.query}
        onChangeText={list.setQuery}
        placeholder={t('users.search')}
        accessibilityLabel={t('users.search')}
        autoCapitalize="none"
        trailing={
          <WkSearchAddButton
            label={t('users.new')}
            onPress={() => router.push(`${BASE}/new` as never)}
          />
        }
      />

      {list.hasResult || list.rows.length > 0 ? (
        <Text className="text-[11px] font-medium uppercase text-wk-ink3" style={MONO_STYLE}>
          {t('users.userCount', { count: list.total })}
        </Text>
      ) : null}

      {list.error ? (
        <WkError
          message={errorMessage(list.error, t('common.errorGeneric'))}
          onRetry={() => void list.refetch()}
        />
      ) : null}
      {list.isFirstLoad ? <ListingGridSkeleton /> : null}
    </View>
  )

  const empty =
    !list.isFirstLoad && list.status === 'success' && list.rows.length === 0 ? (
      <View className="items-center gap-2.5 px-6 py-10">
        <View
          className="size-16 items-center justify-center rounded-[20px] bg-wk-sf"
          style={shadow}
        >
          {list.applied ? (
            <SearchX size={28} color={c.brand} strokeWidth={1.75} />
          ) : (
            <Users size={28} color={c.brand} strokeWidth={1.75} />
          )}
        </View>
        <Text className="mt-1.5 text-[17px] font-semibold text-wk-ink">
          {list.applied ? t('pmPortal.noMatches') : t('users.roleEmpty')}
        </Text>
        <Text className="max-w-[260px] text-center text-[15px] leading-[22px] text-wk-ink2">
          {list.applied ? t('pmPortal.noMatchesHint') : t('users.roleEmptyHint')}
        </Text>
        {list.applied ? (
          <View className="mt-1.5">
            <WkButton
              compact
              variant="soft"
              height={44}
              label={t('common.clearSearch')}
              onPress={list.clear}
            />
          </View>
        ) : (
          <View className="mt-1.5">
            <WkButton
              compact
              height={44}
              icon={Plus}
              label={t('users.new')}
              onPress={() => router.push(`${BASE}/new` as never)}
            />
          </View>
        )}
      </View>
    ) : undefined

  if (!role) {
    return (
      <View className="flex-1 bg-wk-bg" testID="e2e-admin-role-users">
        <WkTopBar title={t('users.title')} backHref={BASE} />
        <View className="items-center gap-2.5 px-6 py-10">
          <View
            className="size-16 items-center justify-center rounded-[20px] bg-wk-sf"
            style={shadow}
          >
            <Users size={28} color={c.brand} strokeWidth={1.75} />
          </View>
          <Text className="mt-1.5 text-[17px] font-semibold text-wk-ink">
            {t('users.roleNotFound')}
          </Text>
          <Text className="max-w-[260px] text-center text-[15px] leading-[22px] text-wk-ink2">
            {t('users.roleNotFoundHint')}
          </Text>
          <View className="mt-1.5">
            <WkButton
              compact
              variant="soft"
              height={44}
              label={t('common.goBack')}
              onPress={() => router.replace(BASE as never)}
            />
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-wk-bg" testID="e2e-admin-role-users">
      <WkTopBar title={title} backHref={BASE} />
      <WkGrid
        data={list.isFirstLoad ? [] : list.rows}
        renderCard={renderUser}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={
          <PagedListFooter
            rowCount={list.rows.length}
            hasMore={list.hasMore}
            isFetching={list.isFetching}
            error={list.error}
            onLoadMore={list.loadMore}
          />
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerClassName="px-5"
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: 32 + insets.bottom,
        }}
        refreshControl={
          <RefreshControl
            refreshing={list.isFetching && list.rows.length > 0 && list.page === 1}
            onRefresh={() => pull(() => list.refresh())}
            tintColor={c.ink3}
            colors={[c.brand]}
          />
        }
      />
    </View>
  )
}
