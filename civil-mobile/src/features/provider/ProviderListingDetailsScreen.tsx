import { useCallback, useState } from 'react'
import { Text, View } from 'react-native'
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { Boxes, FileText, Package, Tag, Timer } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { Card, FormScreen, IconTile, InfoRow, StatusPill } from '@/components/kit'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumLabel } from '@/i18n/labels'
import { invalidateListingCaches } from '@/lib/cacheKeys'
import { showBlockingAlert } from '@/services/feedback'
import { deleteListing, formatListingPrice, getListingById } from '@/services/listings'
import { useToastSuccess } from '@/services/toast'

type ProviderListingDetailsScreenProps = {
  basePath?: string
}

export function ProviderListingDetailsScreen({
  basePath = '/provider/listings',
}: ProviderListingDetailsScreenProps) {
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id: string }>()
  const listingId = typeof id === 'string' ? id : id?.[0]
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()
  const [isDeleting, setIsDeleting] = useState(false)

  const load = useCallback(() => {
    if (!listingId) return Promise.reject(new Error('Listing id required'))
    return getListingById(listingId)
  }, [listingId])
  const remote = useRemoteData(load, { enabled: Boolean(listingId) })
  const listing = remote.status === 'success' ? remote.data.data : null

  const rental =
    listing?.rentalPrice && listing.rentalUnit
      ? `${listing.currency ?? ''} ${listing.rentalPrice} / ${enumLabel(t, 'rentalUnit', listing.rentalUnit)}`.trim()
      : '—'

  function onDelete() {
    if (!listingId || isDeleting) return
    showBlockingAlert(t('listings.deleteTitle'), t('listings.deleteBody'), {
      cancelLabel: t('common.cancel'),
      confirmLabel: t('common.delete'),
      onConfirm: () => {
        void (async () => {
          setIsDeleting(true)
          try {
            const result = await deleteListing(listingId)
            invalidateListingCaches()
            toastSuccess(
              t(result.data.outcome === 'hidden' ? 'listings.hidden' : 'listings.deleted'),
            )
            router.replace(basePath as never)
          } catch (error) {
            handleApiError(error, t('listings.deleteFailed'))
          } finally {
            setIsDeleting(false)
          }
        })()
      },
    })
  }

  return (
    <FormScreen
      title={listing?.name ?? t('listings.listing')}
      subtitle={listing?.providerName ?? undefined}
      backHref={basePath}
      isLoading={remote.isLoading}
      error={remote.status === 'error' ? remote.error : undefined}
      onRetry={() => void remote.refetch()}
      loadingLabel={t('listings.loadingOne')}
      footer={
        listing ? (
          <>
            <Button
              className="flex-1"
              variant="destructive"
              onPress={onDelete}
              disabled={isDeleting}
              accessibilityState={{ busy: isDeleting }}
            >
              {isDeleting ? <ButtonSpinner /> : null}
              <ButtonText>{t('common.delete')}</ButtonText>
            </Button>
            <Button
              className="flex-[2]"
              onPress={() => router.push(`${basePath}/${listing.id}/edit` as never)}
            >
              <ButtonText>{t('common.edit')}</ButtonText>
            </Button>
          </>
        ) : undefined
      }
    >
      {listing ? (
        <View testID="e2e-provider-listing-detail" className="gap-4">
          <View className="aspect-[4/3] w-full overflow-hidden rounded-3xl bg-primary/10">
            {listing.mainImageUrl ? (
              <Image
                source={{ uri: listing.mainImageUrl }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <View className="size-full items-center justify-center">
                <IconTile icon={Package} size={72} />
              </View>
            )}
          </View>

          <Card className="gap-3">
            <View className="flex-row items-start justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className="text-xl font-bold text-foreground">{listing.name}</Text>
                <Text className="text-sm text-muted-foreground">
                  {[
                    listing.type ? enumLabel(t, 'listingType', listing.type) : null,
                    listing.categoryName,
                  ]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </Text>
              </View>
              <StatusPill
                label={listing.status === 'ACTIVE' ? t('common.active') : t('common.inactive')}
                tone={listing.status === 'ACTIVE' ? 'success' : 'neutral'}
              />
            </View>
            <Text className="text-2xl font-bold text-primary">{formatListingPrice(listing)}</Text>
          </Card>

          <Card className="py-1">
            <InfoRow icon={Tag} label={t('listings.brand')} value={listing.brand?.trim() || '—'} />
            <InfoRow
              icon={Boxes}
              label={t('listings.quantity')}
              value={listing.quantityAvailable?.trim() || '—'}
            />
            <InfoRow icon={Timer} label={t('listings.rental')} value={rental} />
            <InfoRow
              icon={FileText}
              label={t('common.description')}
              value={listing.description?.trim() || t('listings.noDescription')}
              last
            />
          </Card>
        </View>
      ) : null}
    </FormScreen>
  )
}
