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

function ListingRow({ item, basePath }: { item: Listing; basePath: string }) {
  const price = formatListingPrice(item)
  const typeLabel = item.type ? listingTypeLabel(item.type) : null

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.name}`}
      className="mx-5 mb-3 flex-row gap-3 rounded-3xl border border-border/60 bg-card p-4 active:opacity-80"
      onPress={() => router.push(`${basePath}/${item.id}` as never)}
    >
      <View className="size-16 overflow-hidden rounded-2xl bg-muted">
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

type ProviderListingsScreenProps = {
  basePath?: string
  /** `mine` scopes to the signed-in provider; `admin` lists all. */
  scope?: 'mine' | 'admin'
}

export function ProviderListingsScreen({
  basePath = '/provider/listings',
  scope = 'mine',
}: ProviderListingsScreenProps) {
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [page, setPage] = useState(1)
  const isAdmin = scope === 'admin'

  const loadMine = useCallback(() => getMyProvider(), [])
  const mineRemote = useRemoteData(loadMine, { enabled: !isAdmin })
  const providerId = mineRemote.status === 'success' ? mineRemote.data.data.id : undefined

  const loadListings = useCallback(() => {
    if (!isAdmin && !providerId) {
      return Promise.reject(new Error('Provider not loaded'))
    }
    return listListings(page, PAGE_SIZE, {
      providerId: isAdmin ? undefined : providerId,
      q: appliedQuery || undefined,
      counts: false,
    })
  }, [appliedQuery, isAdmin, page, providerId])

  const listingsRemote = useRemoteData(loadListings, {
    enabled: isAdmin || Boolean(providerId),
  })

  const hasListings = listingsRemote.status === 'success'
  const rows = hasListings ? listingsRemote.data.data : []
  const total = hasListings ? listingsRemote.data.meta.total : 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Nice iso loader only on first paint — keep the list mounted for pull-to-refresh / paging.
  const isInitialLoading =
    (!isAdmin && mineRemote.isLoading) ||
    ((isAdmin || Boolean(providerId)) && listingsRemote.isLoading && !hasListings)

  const isRefreshing = hasListings && listingsRemote.isLoading

  const error =
    !isAdmin && mineRemote.status === 'error'
      ? mineRemote.error
      : listingsRemote.status === 'error'
        ? listingsRemote.error
        : undefined

  const onRetry = useMemo(
    () => () => {
      if (!isAdmin) void mineRemote.refetch()
      if (isAdmin || providerId) void listingsRemote.refetch()
    },
    [isAdmin, listingsRemote, mineRemote, providerId],
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
          <Button size="sm" onPress={() => router.push(`${basePath}/new` as never)}>
            <ButtonText>Add</ButtonText>
          </Button>
        }
      />
      <View className="flex-row gap-2 px-5 pb-4">
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
          renderItem={({ item }) => <ListingRow item={item} basePath={basePath} />}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRetry} />}
          ListEmptyComponent={
            <View className="items-center px-6 py-16">
              <Text className="text-center text-base text-muted-foreground">
                {isAdmin ? 'No listings yet.' : 'No listings yet for your company.'}
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
