import { useCallback, useState } from 'react'
import { FlatList, RefreshControl, Text, View } from 'react-native'
import { router } from 'expo-router'

import { AsyncState } from '@/components/feedback/AsyncState'
import { OptionChips } from '@/components/forms/OptionChips'
import { Header } from '@/components/layout/Header'
import { Badge, BadgeText } from '@/components/ui/badge'
import { Button, ButtonText } from '@/components/ui/button'
import { Input, InputField } from '@/components/ui/input'
import { Pressable } from '@/components/ui/pressable'
import { useRemoteData } from '@/hooks/useRemoteData'
import {
  CATEGORY_KIND_OPTIONS,
  type Category,
  type CategoryKind,
  listCategories,
} from '@/services/categories'

const PAGE_SIZE = 50
const BASE = '/admin/categories'

function CategoryRow({ item }: { item: Category }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.name}`}
      className="gap-1 border-b border-border px-4 py-3 active:bg-muted/40"
      onPress={() => router.push(`${BASE}/${item.id}` as never)}
    >
      <View className="flex-row items-start justify-between gap-2">
        <Text className="min-w-0 flex-1 text-base font-medium text-foreground" numberOfLines={1}>
          {item.name}
        </Text>
        <Badge variant={item.isActive ? 'default' : 'secondary'}>
          <BadgeText>{item.isActive ? 'Active' : 'Inactive'}</BadgeText>
        </Badge>
      </View>
      <Text className="text-sm text-muted-foreground" numberOfLines={1}>
        {[item.kind, item.slug, item.nameAr].filter(Boolean).join(' · ')}
      </Text>
    </Pressable>
  )
}

export function AdminCategoriesScreen() {
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [kind, setKind] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(
    () =>
      listCategories(page, PAGE_SIZE, {
        q: appliedQuery || undefined,
        kind: (kind || undefined) as CategoryKind | undefined,
        includeCounts: true,
      }),
    [appliedQuery, kind, page],
  )
  const remote = useRemoteData(load)

  const hasData = remote.status === 'success'
  const rows = hasData ? remote.data.data : []
  const total = hasData ? remote.data.meta.total : 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const isInitialLoading = remote.isLoading && !hasData
  const isRefreshing = hasData && remote.isLoading

  function onSearch() {
    setPage(1)
    setAppliedQuery(query.trim())
  }

  return (
    <View className="flex-1 bg-background">
      <Header
        title="Categories"
        subtitle={total ? `${total} total` : undefined}
        rightSlot={
          <Button size="sm" onPress={() => router.push(`${BASE}/new` as never)}>
            <ButtonText>Add</ButtonText>
          </Button>
        }
      />

      <View className="gap-3 border-b border-border px-4 py-3">
        <View className="flex-row gap-2">
          <View className="min-w-0 flex-1">
            <Input>
              <InputField
                placeholder="Search categories"
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
        <OptionChips
          options={CATEGORY_KIND_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          value={kind}
          allowClear
          onChange={(value) => {
            setKind(value)
            setPage(1)
          }}
        />
      </View>

      <AsyncState
        isLoading={isInitialLoading}
        error={remote.status === 'error' ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingLabel="Loading categories…"
      >
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CategoryRow item={item} />}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => void remote.refetch()} />
          }
          ListEmptyComponent={
            <View className="items-center px-6 py-16">
              <Text className="text-center text-base text-muted-foreground">
                No categories found.
              </Text>
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
