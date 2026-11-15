import { useCallback, useState } from 'react'
import { FlatList, RefreshControl, Text, View } from 'react-native'

import { AsyncState } from '@/components/feedback/AsyncState'
import { OptionChips } from '@/components/forms/OptionChips'
import { Header } from '@/components/layout/Header'
import { Badge, BadgeText } from '@/components/ui/badge'
import { Button, ButtonText } from '@/components/ui/button'
import { Input, InputField } from '@/components/ui/input'
import { useRemoteData } from '@/hooks/useRemoteData'
import {
  formatListingPrice,
  type Listing,
  type ListingType,
  listingTypeLabel,
  listListings,
} from '@/services/listings'

const PAGE_SIZE = 20

const TYPE_OPTIONS = [
  { value: 'MATERIAL', label: 'Materials' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'SERVICE', label: 'Services' },
]

function DirectoryRow({ item }: { item: Listing }) {
  return (
    <View className="mx-5 mb-3 gap-1 rounded-3xl border border-border/60 bg-card p-4">
      <View className="flex-row items-start justify-between gap-2">
        <Text className="min-w-0 flex-1 text-base font-medium text-foreground" numberOfLines={1}>
          {item.name}
        </Text>
        <Badge variant="secondary">
          <BadgeText>{item.type ? listingTypeLabel(item.type) : 'Listing'}</BadgeText>
        </Badge>
      </View>
      <Text className="text-sm text-muted-foreground" numberOfLines={1}>
        {[item.providerName, item.categoryName, item.brand].filter(Boolean).join(' · ') || '—'}
      </Text>
      <Text className="text-sm text-foreground">{formatListingPrice(item)}</Text>
    </View>
  )
}

export function PmDirectoryScreen() {
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [type, setType] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(
    () =>
      listListings(page, PAGE_SIZE, {
        q: appliedQuery || undefined,
        type: (type || undefined) as ListingType | undefined,
        status: 'ACTIVE',
        counts: false,
      }),
    [appliedQuery, page, type],
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
      <Header title="Directory" subtitle={total ? `${total} active` : 'Browse marketplace'} />

      <View className="gap-3 px-5 pb-4">
        <View className="flex-row gap-2">
          <View className="min-w-0 flex-1">
            <Input>
              <InputField
                placeholder="Search listings"
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
          options={TYPE_OPTIONS}
          value={type}
          allowClear
          onChange={(value) => {
            setType(value)
            setPage(1)
          }}
        />
      </View>

      <AsyncState
        isLoading={isInitialLoading}
        error={remote.status === 'error' ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingLabel="Loading directory…"
      >
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <DirectoryRow item={item} />}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => void remote.refetch()} />
          }
          ListEmptyComponent={
            <View className="items-center px-6 py-16">
              <Text className="text-center text-base text-muted-foreground">
                No active listings match your filters.
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
