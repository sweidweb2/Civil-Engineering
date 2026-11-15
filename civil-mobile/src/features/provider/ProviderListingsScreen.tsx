import { useCallback, useMemo, useState } from 'react'
import { FlatList, Image, RefreshControl, Text, View } from 'react-native'
import { router } from 'expo-router'

import { AsyncState } from '@/components/feedback/AsyncState'
import { Header } from '@/components/layout/Header'
import { Badge, BadgeText } from '@/components/ui/badge'
import { Button, ButtonText } from '@/components/ui/button'
import { Input, InputField } from '@/components/ui/input'
import { Pressable } from '@/components/ui/pressable'
import { useRemoteData } from '@/hooks/useRemoteData'
import {
  formatListingPrice,
  type Listing,
  listingTypeLabel,
  listListings,
} from '@/services/listings'
import { getMyProvider } from '@/services/providers'

const PAGE_SIZE = 20

function ListingRow({ item }: { item: Listing }) {
  const price = formatListingPrice(item)
  const typeLabel = item.type ? listingTypeLabel(item.type) : null

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.name}`}
      className="flex-row gap-3 border-b border-border px-4 py-3 active:bg-muted/40"
      onPress={() => router.push(`/provider/listings/${item.id}` as never)}
    >
      <View className="size-14 overflow-hidden rounded-md border border-border bg-muted/40">
        {item.mainImageUrl ? (
          <Image source={{ uri: item.mainImageUrl }} className="size-full" resizeMode="cover" />
        ) : (
          <View className="size-full items-center justify-center">
            <Text className="text-xs text-muted-foreground">No img</Text>
          </View>
        )}
      </View>
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-base font-medium text-foreground" numberOfLines={1}>
          {item.name}
        </Text>
        <Text className="text-sm text-muted-foreground" numberOfLines={1}>
          {[typeLabel, item.categoryName, item.brand].filter(Boolean).join(' · ') || '—'}
        </Text>
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-sm text-foreground">{price}</Text>
          <Badge variant={item.status === 'ACTIVE' ? 'default' : 'secondary'}>
            <BadgeText>{item.status === 'ACTIVE' ? 'Active' : 'Inactive'}</BadgeText>
          </Badge>
        </View>
      </View>
    </Pressable>
  )
}

export function ProviderListingsScreen() {
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [page, setPage] = useState(1)

  const loadMine = useCallback(() => getMyProvider(), [])
  const mineRemote = useRemoteData(loadMine)
  const providerId = mineRemote.status === 'success' ? mineRemote.data.data.id : undefined

  const loadListings = useCallback(() => {
    if (!providerId) {
      return Promise.reject(new Error('Provider not loaded'))
    }
    return listListings(page, PAGE_SIZE, {
      providerId,
      q: appliedQuery || undefined,
      counts: false,
    })
  }, [appliedQuery, page, providerId])

  const listingsRemote = useRemoteData(loadListings, {
    enabled: Boolean(providerId),
  })

  const hasListings = listingsRemote.status === 'success'
  const rows = hasListings ? listingsRemote.data.data : []
  const total = hasListings ? listingsRemote.data.meta.total : 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Nice iso loader only on first paint — keep the list mounted for pull-to-refresh / paging.
  const isInitialLoading =
    mineRemote.isLoading || (Boolean(providerId) && listingsRemote.isLoading && !hasListings)

  const isRefreshing = hasListings && listingsRemote.isLoading

  const error =
    mineRemote.status === 'error'
      ? mineRemote.error
      : listingsRemote.status === 'error'
        ? listingsRemote.error
        : undefined

  const onRetry = useMemo(
    () => () => {
      void mineRemote.refetch()
      if (providerId) void listingsRemote.refetch()
    },
    [listingsRemote, mineRemote, providerId],
  )

  function onSearch() {
    setPage(1)
    setAppliedQuery(query.trim())
  }

  return (
    <View className="flex-1 bg-background" testID="e2e-provider-listings">
      <Header
        title="Listings"
        subtitle={total ? `${total} total` : undefined}
        rightSlot={
          <Button size="sm" onPress={() => router.push('/provider/listings/new' as never)}>
            <ButtonText>Add</ButtonText>
          </Button>
        }
      />
      <View className="flex-row gap-2 border-b border-border px-4 py-3">
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

      <AsyncState
        isLoading={isInitialLoading}
        error={error}
        onRetry={onRetry}
        loadingLabel="Loading listings…"
      >
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ListingRow item={item} />}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRetry} />}
          ListEmptyComponent={
            <View className="items-center px-6 py-16">
              <Text className="text-center text-base text-muted-foreground">
                No listings yet for your company.
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
