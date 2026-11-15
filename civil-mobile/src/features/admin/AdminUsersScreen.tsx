import { useCallback } from 'react'
import { Text, View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'

import { Avatar, ListCard, ListScreen, StatusPill, toneForStatus } from '@/components/kit'
import { listView, useListState } from '@/hooks/useListState'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumLabel } from '@/i18n/labels'
import { userDisplayName } from '@/lib/user'
import { listUsers } from '@/services/users'

const PAGE_SIZE = 20
const BASE = '/admin/users'

export function AdminUsersScreen() {
  const { t } = useTranslation()
  const list = useListState()

  const load = useCallback(
    () => listUsers(list.page, PAGE_SIZE, list.appliedQuery || undefined),
    [list.appliedQuery, list.page],
  )
  const remote = useRemoteData(load)
  const view = listView(remote, PAGE_SIZE)

  return (
    <ListScreen
      title={t('users.title')}
      subtitle={view.total ? t('common.total', { count: view.total }) : undefined}
      searchPlaceholder={t('users.search')}
      query={list.query}
      onQueryChange={list.setQuery}
      onSearch={list.onSearch}
      addLabel={t('users.add')}
      onAdd={() => router.push(`${BASE}/new` as never)}
      data={view.rows}
      keyExtractor={(item) => item.id}
      renderItem={(item) => (
        <ListCard
          accessibilityLabel={userDisplayName(item)}
          leading={<Avatar name={userDisplayName(item)} imageUrl={item.profile?.avatarUrl} />}
          onPress={() => router.push(`${BASE}/${item.id}` as never)}
        >
          <View className="flex-row items-start justify-between gap-2">
            <Text className="min-w-0 flex-1 text-base font-bold text-foreground" numberOfLines={1}>
              {userDisplayName(item)}
            </Text>
            <StatusPill
              label={enumLabel(t, 'userStatus', item.status)}
              tone={toneForStatus(item.status)}
            />
          </View>
          <Text className="text-sm text-muted-foreground" numberOfLines={1}>
            {item.email}
          </Text>
          <Text className="text-xs font-semibold text-primary">
            {enumLabel(t, 'role', item.role)}
          </Text>
        </ListCard>
      )}
      isInitialLoading={view.isInitialLoading}
      isRefreshing={view.isRefreshing}
      error={view.error}
      onRefresh={() => void remote.refetch()}
      loadingLabel={t('users.loading')}
      page={list.page}
      totalPages={view.totalPages}
      onPageChange={list.setPage}
      emptyTitle={t('users.empty')}
    />
  )
}
