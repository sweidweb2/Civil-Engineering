import { useCallback, useState } from 'react'
import { Image, ScrollView, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'

import { AsyncState } from '@/components/feedback/AsyncState'
import { Header } from '@/components/layout/Header'
import { Badge, BadgeText } from '@/components/ui/badge'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { Pressable } from '@/components/ui/pressable'
import { useRemoteData } from '@/hooks/useRemoteData'
import { ApiError } from '@/services/api'
import { showApiAlert, showBlockingAlert } from '@/services/feedback'
import {
  deleteListing,
  formatListingPrice,
  getListingById,
  listingTypeLabel,
  rentalUnitLabel,
} from '@/services/listings'
import { useToastApiError } from '@/services/toast'
import { colors } from '@/theme/colors'

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-1 border-b border-border py-3">
      <Text className="text-xs text-muted-foreground">{label}</Text>
      <Text className="text-base text-foreground">{value}</Text>
    </View>
  )
}

function BackButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back to listings"
      className="size-9 items-center justify-center rounded-md"
      onPress={() => {
        if (router.canGoBack()) router.back()
        else router.replace('/provider/listings')
      }}
    >
      <ChevronLeft size={24} color={colors.light.text} />
    </Pressable>
  )
}

export function ProviderListingDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const listingId = typeof id === 'string' ? id : id?.[0]
  const toastApiError = useToastApiError()
  const [isDeleting, setIsDeleting] = useState(false)

  const load = useCallback(() => {
    if (!listingId) return Promise.reject(new Error('Listing id required'))
    return getListingById(listingId)
  }, [listingId])

  const remote = useRemoteData(load, { enabled: Boolean(listingId) })
  const listing = remote.status === 'success' ? remote.data.data : null

  const rental =
    listing?.rentalPrice && listing.rentalUnit
      ? `${listing.currency ?? ''} ${listing.rentalPrice} / ${rentalUnitLabel(listing.rentalUnit)}`.trim()
      : '—'

  function onDelete() {
    if (!listingId || isDeleting) return
    showBlockingAlert('Delete listing?', 'This cannot be undone from the provider portal.', {
      cancelLabel: 'Cancel',
      confirmLabel: 'Delete',
      onConfirm: () => {
        void (async () => {
          setIsDeleting(true)
          try {
            const result = await deleteListing(listingId)
            showBlockingAlert(
              result.data.outcome === 'hidden' ? 'Hidden' : 'Deleted',
              result.data.outcome === 'hidden'
                ? 'Listing was hidden because it is still referenced.'
                : 'Listing was removed.',
            )
            router.replace('/provider/listings')
          } catch (error) {
            if (error instanceof ApiError && error.status >= 500) toastApiError(error)
            else showApiAlert(error, 'Could not delete listing')
          } finally {
            setIsDeleting(false)
          }
        })()
      },
    })
  }

  return (
    <View className="flex-1 bg-background" testID="e2e-provider-listing-detail">
      <Header
        title={listing?.name ?? 'Listing'}
        leftSlot={<BackButton />}
        rightSlot={
          listing ? (
            <Badge variant={listing.status === 'ACTIVE' ? 'default' : 'secondary'}>
              <BadgeText>{listing.status === 'ACTIVE' ? 'Active' : 'Inactive'}</BadgeText>
            </Badge>
          ) : undefined
        }
      />

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.status === 'error' ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingLabel="Loading listing…"
      >
        {listing ? (
          <ScrollView className="flex-1" contentContainerClassName="pb-8">
            <View className="aspect-[5/4] w-full overflow-hidden border-b border-border bg-muted/40">
              {listing.mainImageUrl ? (
                <Image
                  source={{ uri: listing.mainImageUrl }}
                  className="size-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="size-full items-center justify-center">
                  <Text className="text-sm text-muted-foreground">No image</Text>
                </View>
              )}
            </View>

            <View className="gap-1 px-4 pt-4">
              <Text className="text-xl font-semibold text-foreground">{listing.name}</Text>
              <Text className="text-sm text-muted-foreground">
                {[
                  listing.type ? listingTypeLabel(listing.type) : null,
                  listing.categoryName,
                  listing.providerName,
                ]
                  .filter(Boolean)
                  .join(' · ') || '—'}
              </Text>
            </View>

            <View className="px-4 pt-2">
              <DetailRow label="Price" value={formatListingPrice(listing)} />
              <DetailRow label="Brand" value={listing.brand?.trim() || '—'} />
              <DetailRow label="Quantity" value={listing.quantityAvailable?.trim() || '—'} />
              <DetailRow label="Rental" value={rental} />
              <DetailRow
                label="Description"
                value={listing.description?.trim() || 'No description'}
              />
            </View>

            <View className="flex-row gap-3 px-4 pt-6">
              <Button
                className="flex-1"
                variant="outline"
                onPress={() => router.push(`/provider/listings/${listing.id}/edit` as never)}
              >
                <ButtonText>Edit</ButtonText>
              </Button>
              <Button
                className="flex-1"
                variant="destructive"
                onPress={onDelete}
                disabled={isDeleting}
                accessibilityState={{ busy: isDeleting }}
              >
                {isDeleting ? <ButtonSpinner /> : null}
                <ButtonText>{isDeleting ? 'Deleting…' : 'Delete'}</ButtonText>
              </Button>
            </View>
          </ScrollView>
        ) : null}
      </AsyncState>
    </View>
  )
}
