import { Children, createContext, Fragment, useContext } from 'react'
import { FlatList, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native'
import {
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
  Plus,
  Search,
  SearchX,
  X,
} from 'lucide-react-native'
import type { ReactElement, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import Animated, { FadeIn } from 'react-native-reanimated'

import { AsyncState } from '@/components/feedback/AsyncState'
import { Button, ButtonText } from '@/components/ui/button'
import { Pressable } from '@/components/ui/pressable'
import { useThemeColors } from '@/hooks/useThemeColors'
import { sizes } from '@/theme/sizes'
import { motion } from '@/theme/spacing'
import { TYPE } from '@/theme/typography'

import { DirectionalIcon, SkeletonBlock, StatusPill } from './primitives'
import type { Tone } from './tones'

/** True inside a grouped list: rows render flat and the group draws the surface. */
const GroupedContext = createContext(false)

type SearchBarProps = {
  value: string
  onChangeText: (value: string) => void
  /** Called with the trimmed query on submit, and with '' on clear. */
  onSubmit: (query: string) => void
  placeholder?: string
}

/** Search field: 52 tall, radius 14, surface + 1px line. */
export function SearchBar({ value, onChangeText, onSubmit, placeholder }: SearchBarProps) {
  const { t } = useTranslation()
  const colors = useThemeColors()
  return (
    <View
      className="flex-row items-center gap-3 rounded-md border border-border bg-card ps-4 pe-1"
      style={{ height: sizes.inputHeight }}
    >
      <Search size={sizes.iconSm} color={colors.muted} strokeWidth={sizes.iconStroke} />
      <TextInput
        className={`${TYPE.body} h-full min-w-0 flex-1 text-foreground`}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={() => onSubmit(value.trim())}
        placeholder={placeholder ?? t('common.search')}
        placeholderTextColor={colors.muted2}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={placeholder ?? t('common.search')}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.clearSearch')}
          className="items-center justify-center rounded-full active:bg-muted"
          style={{ width: sizes.touch, height: sizes.touch }}
          onPress={() => {
            onChangeText('')
            onSubmit('')
          }}
        >
          <X size={sizes.iconSm} color={colors.muted} strokeWidth={sizes.iconStroke} />
        </Pressable>
      ) : null}
    </View>
  )
}

export type ChipOption = { value: string; label: string }

type FilterChipsProps = {
  options: ChipOption[]
  value: string
  onChange: (value: string) => void
  /** When set, prepends a chip that clears the filter (value ''). */
  allLabel?: string
}

/** Horizontally scrolling single-select filter chips (rectangular, radius 14). */
export function FilterChips({ options, value, onChange, allLabel }: FilterChipsProps) {
  const all: ChipOption[] = allLabel ? [{ value: '', label: allLabel }, ...options] : options
  return (
    <View className="shrink-0">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-5 pb-3"
        style={{ flexGrow: 0 }}
      >
        {all.map((option) => {
          const active = option.value === value
          return (
            <Pressable
              key={option.value || '__all'}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={`h-11 items-center justify-center rounded-md border px-4 ${
                active ? 'border-foreground bg-foreground' : 'border-border bg-card active:bg-muted'
              }`}
              onPress={() => onChange(option.value)}
            >
              <Text
                className={`${TYPE.caption} font-medium ${
                  active ? 'text-background' : 'text-ink-2'
                }`}
              >
                {option.label}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

type EmptyStateProps = {
  icon?: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

/**
 * Empty state (section 8): left-aligned in the content's place. Line icon,
 * a sentence on what will appear here, how to get there, optional action.
 */
export function EmptyState({
  icon: Icon = SearchX,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const colors = useThemeColors()
  return (
    <View className="items-start gap-2 py-6">
      <Icon size={sizes.icon} color={colors.muted} strokeWidth={sizes.iconStroke} />
      <Text className={`${TYPE.bodyStrong} text-foreground`}>{title}</Text>
      {description ? (
        <Text className={`${TYPE.bodySm} text-muted-foreground`}>{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button variant="outline" className="mt-2 self-stretch" onPress={onAction}>
          <ButtonText>{actionLabel}</ButtonText>
        </Button>
      ) : null}
    </View>
  )
}

type PagerProps = {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

export function Pager({ page, totalPages, onChange }: PagerProps) {
  const { t } = useTranslation()
  const colors = useThemeColors()
  if (totalPages <= 1) return null
  const atStart = page <= 1
  const atEnd = page >= totalPages
  const btn =
    'items-center justify-center rounded-full border border-border bg-card active:bg-muted'
  return (
    <View className="flex-row items-center justify-center gap-4 py-5">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.previousPage')}
        disabled={atStart}
        className={`${btn} ${atStart ? 'opacity-40' : ''}`}
        style={{ width: sizes.iconButton, height: sizes.iconButton }}
        onPress={() => onChange(page - 1)}
      >
        <DirectionalIcon icon={ChevronLeft} size={sizes.iconSm} color={colors.ink} />
      </Pressable>
      <Text
        className={`${TYPE.caption} text-muted-foreground`}
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {t('common.pageOf', { page, total: totalPages })}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.nextPage')}
        disabled={atEnd}
        className={`${btn} ${atEnd ? 'opacity-40' : ''}`}
        style={{ width: sizes.iconButton, height: sizes.iconButton }}
        onPress={() => onChange(page + 1)}
      >
        <DirectionalIcon icon={ChevronRight} size={sizes.iconSm} color={colors.ink} />
      </Pressable>
    </View>
  )
}

/** Primary "create" action floating at the bottom-end of its parent. No shadow. */
export function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useThemeColors()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      className="absolute bottom-4 end-5 flex-row items-center gap-2 rounded-full bg-primary px-5 active:opacity-90"
      style={{ height: sizes.buttonHeight }}
      onPress={onPress}
    >
      <Plus size={sizes.icon} color={colors.onAccent} strokeWidth={sizes.iconStrokeActive} />
      <Text className="text-lg font-semibold text-primary-foreground">{label}</Text>
    </Pressable>
  )
}

/** Skeleton rows matching the grouped list layout. */
export function ListSkeleton({ label, count = 6 }: { label?: string; count?: number }) {
  return (
    <View className="flex-1 px-5 pt-1" accessibilityRole="progressbar" accessibilityLabel={label}>
      <View className="overflow-hidden rounded-lg border border-border bg-card">
        {Array.from({ length: count }, (_, index) => (
          <View
            key={index}
            className={`flex-row items-center gap-3 px-4 py-3.5 ${
              index < count - 1 ? 'border-b border-line-subtle' : ''
            }`}
          >
            <SkeletonBlock className="size-10 rounded-full" />
            <View className="flex-1 gap-2">
              <SkeletonBlock className="h-3.5 w-3/5 rounded-sm" />
              <SkeletonBlock className="h-3 w-2/5 rounded-sm" />
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

/**
 * Grouped list container: one surface, rows split by `line-subtle` hairlines
 * (none after the last). Rows inside (ListCard) render flat.
 */
export function ListGroup({ children }: { children: ReactNode }) {
  const items = Children.toArray(children).filter(Boolean)
  return (
    <GroupedContext.Provider value>
      <View className="overflow-hidden rounded-lg border border-border bg-card">
        {items.map((child, index) => (
          <Fragment key={index}>
            {child}
            {index < items.length - 1 ? <View className="h-px bg-line-subtle" /> : null}
          </Fragment>
        ))}
      </View>
    </GroupedContext.Provider>
  )
}

type PagedListProps<T> = {
  data: T[]
  keyExtractor: (item: T) => string
  renderItem: (item: T) => ReactElement
  isInitialLoading: boolean
  isRefreshing: boolean
  error?: unknown
  onRefresh: () => void
  loadingLabel?: string
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  empty: EmptyStateProps
  /** Leaves room under the list for a floating action button. */
  hasFab?: boolean
  header?: ReactNode
}

/** Grouped list with loading, error, empty, pull-to-refresh and paging built in. */
export function PagedList<T>({
  data,
  keyExtractor,
  renderItem,
  isInitialLoading,
  isRefreshing,
  error,
  onRefresh,
  loadingLabel,
  page,
  totalPages,
  onPageChange,
  empty,
  hasFab = false,
  header,
}: PagedListProps<T>) {
  const colors = useThemeColors()
  const last = data.length - 1
  return (
    <AsyncState
      isLoading={isInitialLoading}
      error={error}
      onRetry={onRefresh}
      loadingLabel={loadingLabel}
      loadingFallback={<ListSkeleton label={loadingLabel} />}
    >
      <GroupedContext.Provider value>
        <FlatList
          className="flex-1"
          data={data}
          keyExtractor={keyExtractor}
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeIn.duration(motion.base)}
              className={`border-x border-border bg-card ${
                index === 0 ? 'rounded-t-lg border-t' : ''
              } ${index === last ? 'rounded-b-lg border-b' : 'border-b-0'}`}
            >
              {renderItem(item)}
              {index < last ? <View className="mx-4 h-px bg-line-subtle" /> : null}
            </Animated.View>
          )}
          contentContainerClassName={`px-5 pt-1 ${hasFab ? 'pb-28' : 'pb-8'}`}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.muted}
              colors={[colors.ink]}
            />
          }
          ListHeaderComponent={header ? <>{header}</> : undefined}
          ListEmptyComponent={<EmptyState {...empty} />}
          ListFooterComponent={
            <Pager page={page} totalPages={totalPages} onChange={onPageChange} />
          }
        />
      </GroupedContext.Provider>
    </AsyncState>
  )
}

/**
 * List row: optional leading mark, body, trailing chevron. Flat inside a
 * grouped list (PagedList / ListGroup); its own surface when standalone.
 */
export function ListCard({
  leading,
  children,
  onPress,
  accessibilityLabel,
  showChevron = true,
}: {
  leading?: ReactNode
  children: ReactNode
  onPress?: () => void
  accessibilityLabel?: string
  showChevron?: boolean
}) {
  const colors = useThemeColors()
  const grouped = useContext(GroupedContext)
  const body = (
    <>
      {leading}
      <View className="min-w-0 flex-1 gap-0.5">{children}</View>
      {onPress && showChevron ? (
        <DirectionalIcon icon={ChevronRight} size={sizes.iconSm} color={colors.deEmphasis} />
      ) : null}
    </>
  )
  const className = `min-h-[60px] flex-row items-center gap-3 px-4 py-3.5 ${
    grouped ? '' : 'rounded-lg border border-border bg-card'
  }`
  if (!onPress) return <View className={className}>{body}</View>
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={`${className} active:bg-background`}
      onPress={onPress}
    >
      {body}
    </Pressable>
  )
}

/** Primary label + optional state pill + muted metadata (+ optional block). */
export function StandardListRow({
  title,
  subtitle,
  statusLabel,
  statusTone = 'neutral',
  extra,
}: {
  title: string
  subtitle?: string | null
  statusLabel?: string
  statusTone?: Tone
  extra?: ReactNode
}) {
  return (
    <>
      <View className="flex-row items-center justify-between gap-2">
        <Text className={`${TYPE.bodyStrong} min-w-0 flex-1 text-foreground`} numberOfLines={1}>
          {title}
        </Text>
        {statusLabel ? <StatusPill label={statusLabel} tone={statusTone} /> : null}
      </View>
      {subtitle ? (
        <Text className={`${TYPE.micro} text-muted-2`} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
      {extra}
    </>
  )
}
