import { useCallback, useMemo, useState } from 'react'
import { FlatList, RefreshControl, Text, View } from 'react-native'
import { router } from 'expo-router'

import { AsyncState } from '@/components/feedback/AsyncState'
import { Header } from '@/components/layout/Header'
import { Badge, BadgeText } from '@/components/ui/badge'
import { Button, ButtonText } from '@/components/ui/button'
import { Input, InputField } from '@/components/ui/input'
import { Pressable } from '@/components/ui/pressable'
import { useRemoteData } from '@/hooks/useRemoteData'
import { listUsers, type User } from '@/services/users'

const PAGE_SIZE = 20
const BASE = '/admin/users'

function displayName(user: User): string {
  return (
    user.profile?.displayName ||
    [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ') ||
    user.email
  )
}

function UserRow({ item }: { item: User }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${displayName(item)}`}
      className="gap-1 border-b border-border px-4 py-3 active:bg-muted/40"
      onPress={() => router.push(`${BASE}/${item.id}` as never)}
    >
      <View className="flex-row items-start justify-between gap-2">
        <Text className="min-w-0 flex-1 text-base font-medium text-foreground" numberOfLines={1}>
          {displayName(item)}
        </Text>
        <Badge variant={item.status === 'ACTIVE' ? 'default' : 'secondary'}>
          <BadgeText>{item.status}</BadgeText>
        </Badge>
      </View>
      <Text className="text-sm text-muted-foreground" numberOfLines={1}>
        {[item.email, item.role].join(' · ')}
      </Text>
    </Pressable>
  )
}

export function AdminUsersScreen() {
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(
    () => listUsers(page, PAGE_SIZE, appliedQuery || undefined),
    [appliedQuery, page],
  )
  const remote = useRemoteData(load)

  const hasData = remote.status === 'success'
  const rows = hasData ? remote.data.data : []
  const total = hasData ? remote.data.meta.total : 0
  const totalPages = Math.max(1, hasData ? remote.data.meta.totalPages : 1)
  const isInitialLoading = remote.isLoading && !hasData
  const isRefreshing = hasData && remote.isLoading

  const statusSubtitle = useMemo(() => (total ? `${total} total` : undefined), [total])

  function onSearch() {
    setPage(1)
    setAppliedQuery(query.trim())
  }

  return (
    <View className="flex-1 bg-background">
      <Header
        title="Users"
        subtitle={statusSubtitle}
        rightSlot={
          <Button size="sm" onPress={() => router.push(`${BASE}/new` as never)}>
            <ButtonText>Add</ButtonText>
          </Button>
        }
      />

      <View className="flex-row gap-2 border-b border-border px-4 py-3">
        <View className="min-w-0 flex-1">
          <Input>
            <InputField
              placeholder="Search users"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={onSearch}
              returnKeyType="search"
            />
          </Input>
        </View>
        <Button size="sm" variant="outline" onPress={onSearch}>
          <ButtonText>Search</ButtonText>
        </Button>
      </View>

      <AsyncState
        isLoading={isInitialLoading}
        error={remote.status === 'error' ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingLabel="Loading users…"
      >
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <UserRow item={item} />}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => void remote.refetch()} />
          }
          ListEmptyComponent={
            <View className="items-center px-6 py-16">
              <Text className="text-center text-base text-muted-foreground">No users found.</Text>
            </View>
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View className="flex-row items-center justify-between gap-3 px-4 py-4">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ButtonText>Previous</ButtonText>
                </Button>
                <Text className="text-sm text-muted-foreground">
                  Page {page} / {totalPages}
                </Text>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ButtonText>Next</ButtonText>
                </Button>
              </View>
            ) : null
          }
        />
      </AsyncState>
    </View>
  )
}
