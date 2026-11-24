import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { Image } from 'expo-image'
import {
  BadgeCheck,
  Banknote,
  Briefcase,
  HardHat,
  LayoutGrid,
  type LucideIcon,
  MapPin,
  Package,
  Store,
  Tag,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { BottomSheet } from '@/components/kit'
import { cardPrice, useCategoryName } from '@/features/provider/ui/kit'
import { specialtyLabel } from '@/features/worker/specialties'
import { useWorkerPalette } from '@/features/worker/ui/palette'
import { enumLabel } from '@/i18n/labels'
import { REMOTE_IMAGE_CACHE_POLICY, remoteImage } from '@/lib/imageSource'
import { ltr } from '@/lib/rtl'
import { initialsOf } from '@/lib/user'
import { type Listing } from '@/services/listings'
import { directoryWorkerName, type WorkerDirectoryItem } from '@/services/workers'

export type DirectoryEntry =
  | { kind: 'listing'; id: string; listing: Listing }
  | { kind: 'worker'; id: string; worker: WorkerDirectoryItem }

type Fact = { icon: LucideIcon; label: string; value: string; ltr?: boolean }

/** Bottom sheet with listing or worker facts for the PM / admin directory. */
export function DirectoryDetailSheet({
  entry,
  onClose,
}: {
  entry: DirectoryEntry | null
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const { c } = useWorkerPalette()
  const categoryName = useCategoryName()
  // Keep the last entry while the sheet animates closed.
  const [shown, setShown] = useState<DirectoryEntry | null>(entry)
  useEffect(() => {
    if (entry) setShown(entry)
  }, [entry])

  if (!shown) return null
  const isListing = shown.kind === 'listing'
  const name = isListing ? shown.listing.name : directoryWorkerName(shown.worker)
  // Worker `avatarImageUrl` is the loadable URL; `avatarUrl` (File id) is its stable cache key.
  const photo = isListing ? shown.listing.mainImageUrl : (shown.worker.avatarImageUrl ?? null)
  const photoKey = isListing ? shown.listing.mainImageKey : shown.worker.avatarUrl
  const verified = !isListing && shown.worker.isVerified

  let sub = ''
  let facts: Fact[] = []
  if (shown.kind === 'listing') {
    const l = shown.listing
    sub = [l.providerName, l.type ? enumLabel(t, 'listingType', l.type) : null]
      .filter(Boolean)
      .join(' · ')
    facts = [
      { icon: Banknote, label: t('listings.price'), value: cardPrice(t, l), ltr: true },
      { icon: LayoutGrid, label: t('listings.category'), value: categoryName(l) || '—' },
      { icon: Tag, label: t('listings.brand'), value: l.brand?.trim() || '—' },
      {
        icon: Package,
        label: t('listings.quantity'),
        value: l.quantityAvailable
          ? ltr([l.quantityAvailable, l.unit].filter(Boolean).join(' '))
          : '—',
        ltr: Boolean(l.quantityAvailable),
      },
      { icon: Store, label: t('listings.provider'), value: l.providerName || '—' },
    ]
  } else {
    const w = shown.worker
    const cur = w.currency?.trim() || ''
    const rate = w.hourlyRate
      ? t('worker.rateHour', { amount: ltr(String(w.hourlyRate)), currency: cur })
      : w.dailyRate
        ? t('worker.rateDay', { amount: ltr(String(w.dailyRate)), currency: cur })
        : '—'
    const specialty = specialtyLabel(w.specialty, i18n.language)
    sub = [w.headline, specialty].filter(Boolean).join(' · ')
    facts = [
      { icon: HardHat, label: t('worker.specialty'), value: specialty || '—' },
      {
        icon: Briefcase,
        label: t('worker.yearsExperience'),
        value: w.yearsExperience != null ? String(w.yearsExperience) : '—',
        ltr: w.yearsExperience != null,
      },
      { icon: Banknote, label: t('worker.pay'), value: rate, ltr: rate !== '—' },
      { icon: MapPin, label: t('common.city'), value: w.city || '—' },
    ]
  }

  return (
    <BottomSheet visible={Boolean(entry)} onClose={onClose} maxHeightRatio={0.85}>
      <View className="gap-3.5 pb-3">
        <View className="-mx-5 h-[150px] overflow-hidden bg-wk-hero">
          {isListing && photo ? (
            <Image
              source={remoteImage(photo, photoKey)}
              cachePolicy={REMOTE_IMAGE_CACHE_POLICY}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          ) : null}
        </View>
        <View
          className={`-mt-12 size-[68px] items-center justify-center overflow-hidden border-4 border-wk-sf ${
            isListing ? 'rounded-2xl bg-wk-sf2' : 'rounded-full bg-wk-hero'
          }`}
        >
          {photo ? (
            <Image
              source={remoteImage(photo, photoKey)}
              cachePolicy={REMOTE_IMAGE_CACHE_POLICY}
              style={{ position: 'absolute', inset: 0 }}
              contentFit="cover"
            />
          ) : isListing ? (
            <Package size={24} color={c.ink3} strokeWidth={1.7} />
          ) : (
            <Text className="text-[21px] font-semibold text-wk-lime">{initialsOf(name)}</Text>
          )}
        </View>
        <View className="gap-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="min-w-0 shrink text-[19px] font-semibold leading-6 text-wk-ink">
              {name}
            </Text>
            {verified ? <BadgeCheck size={18} color={c.brand} strokeWidth={2} /> : null}
          </View>
          {sub ? <Text className="text-[15px] text-wk-ink2">{sub}</Text> : null}
        </View>
        <View className="gap-px overflow-hidden rounded-2xl bg-wk-line">
          {facts.map((fact) => (
            <View
              key={fact.label}
              className="min-h-12 flex-row items-center gap-3 bg-wk-sf2 px-3.5"
            >
              <fact.icon size={16} color={c.ink3} strokeWidth={1.9} />
              <Text className="min-w-0 flex-1 text-[15px] text-wk-ink2">{fact.label}</Text>
              <Text
                className="max-w-[55%] text-end text-[15px] font-medium text-wk-ink"
                numberOfLines={2}
              >
                {fact.ltr ? ltr(fact.value) : fact.value}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </BottomSheet>
  )
}
