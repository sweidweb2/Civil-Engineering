import { FlatList, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native'
import { Image } from 'expo-image'
import { ChevronRight, type LucideIcon, Plus, Search, Star, X } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useStatusBarStyle } from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { REMOTE_IMAGE_CACHE_POLICY, remoteImage } from '@/lib/imageSource'
import { initialsOf } from '@/lib/user'
import { errorMessage } from '@/services/feedback'
import { MONO_STYLE } from '@/theme/typography'

import { flipStyle, WkButton, WkError, WkPill, WkSkeletonCard, WkTopBar } from './kit'
import { useWorkerPalette, WK_TAB_SPACE, type WkTone } from './palette'
import type { PagedList } from './usePagedList'

export { type PagedList, type PageResult, usePagedList } from './usePagedList'

/**
 * Generic list screen on the green palette (the admin design's "generic
 * list"): search + optional add, filter chips with counts, paged rows,
 * skeleton, empty state, pull to refresh, "Show more".
 */

/* ─── Screen ───────────────────────────────────────────────────────────── */

export type WkFilterChip = { value: string; label: string; count?: number | null }

export function WkListScreen<T extends { id: string }>({
  list,
  renderItem,
  searchPlaceholder,
  title,
  backHref,
  onAdd,
  addLabel,
  filters,
  emptyIcon,
  emptyTitle,
  emptyBody,
  header,
  testID,
}: {
  list: PagedList<T>
  renderItem: (item: T, index: number) => ReactNode
  searchPlaceholder: string
  /** With `backHref`: pushed screen with a back header. */
  title?: string
  backHref?: string
  onAdd?: () => void
  addLabel?: string
  filters?: WkFilterChip[]
  emptyIcon: LucideIcon
  emptyTitle: string
  emptyBody?: string
  /** Extra content above the rows (banners). */
  header?: ReactNode
  testID?: string
}) {
  const pull = usePullToRefresh()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { c, shadow, isDark } = useWorkerPalette()
  useStatusBarStyle(isDark ? 'light' : 'dark')
  const EmptyIcon = emptyIcon

  const top = (
    <View className="gap-3 pb-3">
      <View className="flex-row gap-2.5">
        <View
          className="h-12 min-w-0 flex-1 flex-row items-center gap-2.5 rounded-[14px] border border-wk-line bg-wk-sf ps-3.5"
          style={shadow}
        >
          <Search size={18} color={c.ink3} strokeWidth={1.9} />
          <TextInput
            value={list.query}
            onChangeText={list.setQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor={c.ink3}
            accessibilityLabel={searchPlaceholder}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            className="h-full min-w-0 flex-1 text-[15px] text-wk-ink"
          />
          {list.query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.clearSearch')}
              onPress={() => list.setQuery('')}
              className="size-11 items-center justify-center"
            >
              <X size={16} color={c.ink3} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>
        {onAdd ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={addLabel}
            onPress={onAdd}
            className="size-12 items-center justify-center rounded-[14px] bg-wk-ink active:opacity-80"
          >
            <Plus size={22} color={c.bg} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>

      {filters && filters.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="-mx-5"
          contentContainerClassName="gap-2 px-5"
          accessibilityRole="tablist"
        >
          {filters.map((f) => {
            const on = f.value === list.filter
            return (
              <Pressable
                key={f.value || 'all'}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => list.setFilter(f.value)}
                className={`h-[38px] flex-row items-center gap-1.5 rounded-full border px-3.5 ${
                  on ? 'border-wk-ink bg-wk-ink' : 'border-wk-line bg-wk-sf'
                }`}
              >
                <Text className={`text-[13px] font-medium ${on ? 'text-wk-bg' : 'text-wk-ink2'}`}>
                  {f.label}
                </Text>
                {f.count != null ? (
                  <Text
                    className={`text-[11px] font-medium ${on ? 'text-wk-bg' : 'text-wk-ink2'}`}
                    style={[MONO_STYLE, { opacity: 0.6 }]}
                  >
                    {f.count}
                  </Text>
                ) : null}
              </Pressable>
            )
          })}
        </ScrollView>
      ) : null}

      {header}

      {list.error && list.rows.length === 0 ? (
        <WkError
          message={errorMessage(list.error, t('common.errorGeneric'))}
          onRetry={list.refresh}
        />
      ) : null}
      {list.isFirstLoad ? (
        <View className="gap-3">
          <WkSkeletonCard />
          <WkSkeletonCard />
          <WkSkeletonCard />
        </View>
      ) : null}
    </View>
  )

  const empty =
    !list.isFirstLoad && list.hasResult && list.rows.length === 0 ? (
      <Animated.View entering={FadeIn.duration(300)} className="items-center gap-2.5 px-6 py-10">
        <View
          className="size-[72px] items-center justify-center rounded-[22px] bg-wk-sf"
          style={shadow}
        >
          <EmptyIcon size={30} color={c.brand} strokeWidth={1.75} />
        </View>
        <Text className="mt-1.5 text-center text-[17px] font-semibold text-wk-ink">
          {list.applied ? t('pmPortal.noMatches') : emptyTitle}
        </Text>
        {list.applied || emptyBody ? (
          <Text className="max-w-[270px] text-center text-[15px] leading-[22px] text-wk-ink2">
            {list.applied ? t('pmPortal.noMatchesHint') : emptyBody}
          </Text>
        ) : null}
        {list.applied ? (
          <View className="mt-1.5">
            <WkButton
              compact
              variant="soft"
              height={44}
              label={t('common.clearSearch')}
              onPress={list.clear}
            />
          </View>
        ) : null}
      </Animated.View>
    ) : null

  return (
    <View className="flex-1 bg-wk-bg" testID={testID}>
      {backHref && title ? (
        <WkTopBar
          title={title}
          backHref={backHref}
          count={list.hasResult ? String(list.total) : undefined}
        />
      ) : null}
      <FlatList
        data={list.isFirstLoad ? [] : list.rows}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.duration(300).delay(Math.min(index, 8) * 25)}>
            {renderItem(item, index)}
          </Animated.View>
        )}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListHeaderComponent={top}
        ListEmptyComponent={empty}
        ListFooterComponent={
          list.hasMore && list.rows.length > 0 ? (
            <View className="pt-4">
              <WkButton
                variant="soft"
                height={48}
                label={t('providerPortal.loadMore')}
                loading={list.isFetching}
                onPress={list.loadMore}
              />
            </View>
          ) : null
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerClassName="px-5"
        contentContainerStyle={{
          paddingTop: backHref ? 8 : insets.top + 12,
          paddingBottom: backHref ? insets.bottom + 32 : WK_TAB_SPACE + insets.bottom,
        }}
        refreshControl={
          <RefreshControl
            refreshing={list.isFetching && list.rows.length > 0 && list.page === 1}
            onRefresh={() => pull(list.refresh)}
            tintColor={c.ink3}
            colors={[c.brand]}
          />
        }
      />
    </View>
  )
}

/* ─── Row pieces ───────────────────────────────────────────────────────── */

/** Photo, initials or icon in a rounded square / circle. */
export function WkMedia({
  photo,
  photoKey,
  name,
  icon: Icon,
  size = 52,
  round,
  hero,
}: {
  photo?: string | null
  /** Stable cache key for `photo` (storage key / file id) — see `remoteImage`. */
  photoKey?: string | null
  /** Initials source when there's no photo. */
  name?: string
  icon?: LucideIcon
  size?: number
  round?: boolean
  /** Dark green tile with lime initials (people). */
  hero?: boolean
}) {
  const { c } = useWorkerPalette()
  return (
    <View
      className={`items-center justify-center overflow-hidden ${hero ? 'bg-wk-hero' : 'bg-wk-sf2'}`}
      style={{ width: size, height: size, borderRadius: round ? size / 2 : size * 0.3 }}
    >
      {photo ? (
        <Image
          source={remoteImage(photo, photoKey)}
          style={{ position: 'absolute', inset: 0 }}
          contentFit="cover"
          cachePolicy={REMOTE_IMAGE_CACHE_POLICY}
          recyclingKey={photoKey ?? photo}
        />
      ) : Icon ? (
        <Icon size={Math.round(size * 0.4)} color={hero ? c.lime : c.ink2} strokeWidth={1.8} />
      ) : (
        <Text
          className={`font-semibold ${hero ? 'text-wk-lime' : 'text-wk-ink2'}`}
          style={{ fontSize: Math.round(size * 0.32) }}
        >
          {initialsOf(name ?? '') || '·'}
        </Text>
      )}
    </View>
  )
}

export function WkStars({ rating }: { rating: number }) {
  return (
    <View className="flex-row gap-0.5" accessibilityLabel={`${rating}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={13}
          color="#E0A33A"
          fill="#E0A33A"
          strokeWidth={1.5}
          opacity={n <= rating ? 1 : 0.25}
        />
      ))}
    </View>
  )
}

export type WkRowAction = {
  key: string
  label: string
  icon?: LucideIcon
  onPress: () => void
  variant?: 'brand' | 'soft' | 'dangerSoft'
  disabled?: boolean
  loading?: boolean
  /** Relative width; the main action is usually wider. */
  flex?: number
}

/** Card row: media, title + pill, sub lines, optional body and actions. */
export function WkListRow({
  media,
  title,
  pill,
  sub,
  subLtr,
  sub2,
  rating,
  body,
  extra,
  actions,
  onPress,
  accessibilityLabel,
}: {
  media?: ReactNode
  title: string
  pill?: { label: string; tone: WkTone }
  sub?: string | null
  /** Emails, phones: keep left-to-right in Arabic. */
  subLtr?: boolean
  /** Small mono line (dates, ids). */
  sub2?: string | null
  rating?: number
  body?: string | null
  extra?: ReactNode
  actions?: WkRowAction[]
  onPress?: () => void
  accessibilityLabel?: string
}) {
  const { c, shadow } = useWorkerPalette()
  return (
    <View className="overflow-hidden rounded-[20px] bg-wk-sf" style={shadow}>
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={accessibilityLabel ?? title}
        disabled={!onPress}
        onPress={onPress}
        className="flex-row items-center gap-3.5 py-3 pe-3.5 ps-3 active:bg-wk-sf2"
      >
        {media}
        <View className="min-w-0 flex-1 gap-[5px]">
          <View className="flex-row items-center gap-2">
            <Text
              className="min-w-0 flex-1 text-[15px] font-semibold leading-5 text-wk-ink"
              numberOfLines={1}
            >
              {title}
            </Text>
            {pill ? <WkPill label={pill.label} tone={pill.tone} /> : null}
          </View>
          {sub ? (
            <Text
              className="text-[13px] text-wk-ink2"
              numberOfLines={1}
              style={subLtr ? { writingDirection: 'ltr' } : undefined}
            >
              {sub}
            </Text>
          ) : null}
          {sub2 ? (
            <Text
              className="text-[11px] font-medium text-wk-ink3"
              style={MONO_STYLE}
              numberOfLines={1}
            >
              {sub2}
            </Text>
          ) : null}
          {rating != null ? <WkStars rating={rating} /> : null}
          {extra}
        </View>
        {onPress ? (
          <View style={flipStyle()}>
            <ChevronRight size={18} color={c.ink3} strokeWidth={1.9} />
          </View>
        ) : null}
      </Pressable>
      {body ? (
        <Text className="px-4 pb-3 text-[15px] leading-[22px] text-wk-ink2">{body}</Text>
      ) : null}
      {actions && actions.length > 0 ? (
        <View className="flex-row gap-2 px-3 pb-3">
          {actions.map((a) => (
            <View key={a.key} style={{ flex: a.flex ?? 1 }}>
              <WkButton
                label={a.label}
                icon={a.icon}
                variant={a.variant ?? 'soft'}
                height={44}
                disabled={a.disabled}
                loading={a.loading}
                onPress={a.onPress}
              />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}
