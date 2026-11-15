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

import { AsyncState } from '@/components/feedback/AsyncState'
import { Button, ButtonText } from '@/components/ui/button'
import { Pressable } from '@/components/ui/pressable'
import { useThemeColors } from '@/hooks/useThemeColors'
import { glow, softShadows } from '@/theme/shadows'

import { PressableScale, StatusPill } from './primitives'
import type { Tone } from './tones'

type SearchBarProps = {
  value: string
  onChangeText: (value: string) => void
  /** Called with the trimmed query on submit, and with '' on clear. */
  onSubmit: (query: string) => void
  placeholder?: string
}

/** Pill search field, designed to sit inside the hero header. */
export function SearchBar({ value, onChangeText, onSubmit, placeholder }: SearchBarProps) {
  const { t } = useTranslation()
  const colors = useThemeColors()
  return (
    <View
      className="h-14 flex-row items-center gap-3 rounded-full bg-card px-5"
      style={softShadows.float}
    >
      <Search size={20} color={colors.textMuted} />
      <TextInput
        className="h-full flex-1 text-base text-foreground"
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={() => onSubmit(value.trim())}
        placeholder={placeholder ?? t('common.search')}
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={placeholder ?? t('common.search')}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.clearSearch')}
          hitSlop={10}
          className="size-6 items-center justify-center rounded-full bg-muted"
          onPress={() => {
            onChangeText('')
            onSubmit('')
          }}
        >
          <X size={14} color={colors.textMuted} />
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

/** Horizontally scrolling single-select filter pills. */
export function FilterChips({ options, value, onChange, allLabel }: FilterChipsProps) {
  const all: ChipOption[] = allLabel ? [{ value: '', label: allLabel }, ...options] : options
  return (
    <View className="shrink-0">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-5 py-3"
        style={{ flexGrow: 0 }}
      >
        {all.map((option) => {
          const active = option.value === value
          return (
            <Pressable
              key={option.value || '__all'}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={`h-10 items-center justify-center rounded-full border px-4 ${
                active ? 'border-primary bg-primary' : 'border-border/40 bg-card'
              }`}
              onPress={() => onChange(option.value)}
            >
              <Text
                className={`text-sm font-semibold ${
                  active ? 'text-primary-foreground' : 'text-muted-foreground'
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

export function EmptyState({
  icon: Icon = SearchX,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const colors = useThemeColors()
  return (
    <View className="items-center gap-3 px-8 py-16">
      <View className="size-32 items-center justify-center rounded-full bg-primary/5">
        <View className="size-24 items-center justify-center rounded-full bg-primary/10">
          <View
            className="size-16 items-center justify-center rounded-full bg-card"
            style={glow(colors.primary, 0.25)}
          >
            <Icon size={28} color={colors.primary} />
          </View>
        </View>
      </View>
      <Text className="mt-2 text-center text-xl font-bold text-foreground">{title}</Text>
      {description ? (
        <Text className="text-center text-sm leading-5 text-muted-foreground">{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button size="sm" className="mt-2" onPress={onAction}>
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
  return (
    <View className="flex-row items-center justify-center gap-4 py-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.previousPage')}
        disabled={atStart}
        className={`size-10 items-center justify-center rounded-full border border-border/60 bg-card ${
          atStart ? 'opacity-40' : ''
        }`}
        onPress={() => onChange(page - 1)}
      >
        <ChevronLeft size={18} color={colors.text} />
      </Pressable>
      <Text className="text-sm font-semibold text-muted-foreground">
        {t('common.pageOf', { page, total: totalPages })}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.nextPage')}
        disabled={atEnd}
        className={`size-10 items-center justify-center rounded-full border border-border/60 bg-card ${
          atEnd ? 'opacity-40' : ''
        }`}
        onPress={() => onChange(page + 1)}
      >
        <ChevronRight size={18} color={colors.text} />
      </Pressable>
    </View>
  )
}

/** Floating "create" button, anchored bottom-right of its parent. */
export function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useThemeColors()
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      scaleTo={0.94}
      className="absolute bottom-4 right-5 h-14 flex-row items-center gap-2 rounded-full bg-primary px-6"
      style={glow(colors.primary, 0.45)}
      onPress={onPress}
    >
      <Plus size={20} color={colors.onPrimary} />
      <Text className="text-base font-bold text-primary-foreground">{label}</Text>
    </PressableScale>
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

/** Card list with loading, error, empty, pull-to-refresh and paging built in. */
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
  return (
    <AsyncState
      isLoading={isInitialLoading}
      error={error}
      onRetry={onRefresh}
      loadingLabel={loadingLabel}
    >
      <FlatList
        className="flex-1"
        data={data}
        keyExtractor={keyExtractor}
        renderItem={({ item }) => renderItem(item)}
        contentContainerClassName={`gap-4 px-5 pt-1 ${hasFab ? 'pb-28' : 'pb-8'}`}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={header ? <>{header}</> : null}
        ListEmptyComponent={<EmptyState {...empty} />}
        ListFooterComponent={<Pager page={page} totalPages={totalPages} onChange={onPageChange} />}
      />
    </AsyncState>
  )
}

/** Pressable card row: leading visual, body, trailing chevron. */
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
  const body = (
    <>
      {leading}
      <View className="min-w-0 flex-1 gap-1">{children}</View>
      {onPress && showChevron ? <ChevronRight size={18} color={colors.disabled} /> : null}
    </>
  )
  const className = 'flex-row items-center gap-4 rounded-3xl border border-border/40 bg-card p-4'
  if (!onPress) {
    return (
      <View className={className} style={softShadows.card}>
        {body}
      </View>
    )
  }
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={className}
      style={softShadows.card}
      onPress={onPress}
    >
      {body}
    </PressableScale>
  )
}

/** Title + optional status pill + muted subtitle (+ optional trailing block). */
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
      <View className="flex-row items-start justify-between gap-2">
        <Text className="min-w-0 flex-1 text-base font-bold text-foreground" numberOfLines={1}>
          {title}
        </Text>
        {statusLabel ? <StatusPill label={statusLabel} tone={statusTone} /> : null}
      </View>
      {subtitle ? (
        <Text className="text-sm text-muted-foreground" numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
      {extra}
    </>
  )
}
