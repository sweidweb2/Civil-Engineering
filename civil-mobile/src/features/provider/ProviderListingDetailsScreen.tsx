import { useCallback, useState } from 'react'
import { Text, View } from 'react-native'
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { Package } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import {
  DangerZone,
  FactGroup,
  FormScreen,
  InfoRow,
  SectionLabel,
  StatusPill,
} from '@/components/kit'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { useRemoteData } from '@/hooks/useRemoteData'
import { useThemeColors } from '@/hooks/useThemeColors'
import { enumLabel } from '@/i18n/labels'
import { invalidateListingCaches } from '@/lib/cacheKeys'
import { showBlockingAlert } from '@/services/feedback'
import { deleteListing, formatListingPrice, getListingById } from '@/services/listings'
import { useToastSuccess } from '@/services/toast'
import { sizes } from '@/theme/sizes'
import { NUM_STYLE, TYPE } from '@/theme/typography'

type ProviderListingDetailsScreenProps = {
  basePath?: string
}

export function ProviderListingDetailsScreen({
  basePath = '/provider/listings',
}: ProviderListingDetailsScreenProps) {
  const { t } = useTranslation()
  const colors = useThemeColors()
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
      destructive: true,
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
              onPress={() => router.push(`${basePath}/${listing.id}/edit` as never)}
            >
              <ButtonText>{t('common.edit')}</ButtonText>
            </Button>
          </>
        ) : undefined
      }
    >
      {listing ? (
        <View testID="e2e-provider-listing-detail" className="gap-7">
          <View className="aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-card">
            {listing.mainImageUrl ? (
              <Image
                source={{ uri: listing.mainImageUrl }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <Package size={sizes.icon} color={colors.muted} strokeWidth={sizes.iconStroke} />
            )}
          </View>

          <View className="gap-1.5">
            <View className="flex-row items-center gap-2">
              <Text className={`${TYPE.caption} min-w-0 flex-1 text-muted-foreground`}>
                {[
                  listing.type ? enumLabel(t, 'listingType', listing.type) : null,
                  listing.categoryName,
                ]
                  .filter(Boolean)
                  .join(' · ') || '—'}
              </Text>
              {listing.status !== 'ACTIVE' ? (
                <StatusPill label={t('common.inactive')} tone="neutral" />
              ) : null}
            </View>
            <Text className={`${TYPE.title} text-foreground`}>{listing.name}</Text>
            <Text className={`${TYPE.displaySub} text-foreground`} style={NUM_STYLE}>
              {formatListingPrice(listing)}
            </Text>
          </View>

          <FactGroup>
            <InfoRow label={t('listings.brand')} value={listing.brand?.trim() || '—'} />
            <InfoRow
              label={t('listings.quantity')}
              value={listing.quantityAvailable?.trim() || '—'}
            />
            <InfoRow label={t('listings.rental')} value={rental} last />
          </FactGroup>

          <View className="gap-2">
            <SectionLabel>{t('common.description')}</SectionLabel>
            <Text className={`${TYPE.body} text-ink-2`}>
              {listing.description?.trim() || t('listings.noDescription')}
            </Text>
          </View>
        </View>
      ) : null}
      {listing ? (
        <DangerZone title={t('common.dangerZone')} hint={t('listings.deleteBody')}>
          <Button
            variant="destructive"
            onPress={onDelete}
            disabled={isDeleting}
            accessibilityState={{ busy: isDeleting }}
          >
            {isDeleting ? <ButtonSpinner /> : null}
            <ButtonText>{t('common.delete')}</ButtonText>
          </Button>
        </DangerZone>
      ) : null}
    </FormScreen>
  )
}
