import { RefreshControl, ScrollView, View } from 'react-native'
import type { ReactElement, ReactNode } from 'react'

import { AsyncState } from '@/components/feedback/AsyncState'
import { useThemeColors } from '@/hooks/useThemeColors'

import { FormScroll, StickyFooter } from './forms'
import { AppBar, ScreenHeader } from './headers'
import { type ChipOption, Fab, FilterChips, PagedList, SearchBar } from './lists'

type ListScreenProps<T> = {
  title: string
  /** Shows a back button (pushed screens). */
  backHref?: string
  searchPlaceholder?: string
  query?: string
  onQueryChange?: (value: string) => void
  onSearch?: (query: string) => void
  filterOptions?: ChipOption[]
  filterValue?: string
  onFilterChange?: (value: string) => void
  allLabel?: string
  addLabel?: string
  onAdd?: () => void
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
  emptyTitle: string
  emptyDescription?: string
}

/** List / feed page (archetype B): header + search, filter chips, grouped rows, add button. */
export function ListScreen<T>(props: ListScreenProps<T>) {
  const hasSearch = props.onSearch && props.onQueryChange
  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title={props.title} backHref={props.backHref}>
        {hasSearch ? (
          <SearchBar
            value={props.query ?? ''}
            onChangeText={props.onQueryChange!}
            onSubmit={props.onSearch!}
            placeholder={props.searchPlaceholder}
          />
        ) : null}
      </ScreenHeader>

      {props.filterOptions && props.onFilterChange ? (
        <FilterChips
          options={props.filterOptions}
          value={props.filterValue ?? ''}
          onChange={props.onFilterChange}
          allLabel={props.allLabel}
        />
      ) : null}

      <View className="flex-1">
        <PagedList
          data={props.data}
          keyExtractor={props.keyExtractor}
          renderItem={props.renderItem}
          isInitialLoading={props.isInitialLoading}
          isRefreshing={props.isRefreshing}
          error={props.error}
          onRefresh={props.onRefresh}
          loadingLabel={props.loadingLabel}
          page={props.page}
          totalPages={props.totalPages}
          onPageChange={props.onPageChange}
          hasFab={Boolean(props.onAdd)}
          empty={{ title: props.emptyTitle, description: props.emptyDescription }}
        />
        {props.onAdd && props.addLabel ? (
          <Fab label={props.addLabel} onPress={props.onAdd} />
        ) : null}
      </View>
    </View>
  )
}

type FormScreenProps = {
  title: string
  subtitle?: string
  backHref: string
  right?: ReactNode
  isLoading?: boolean
  error?: unknown
  onRetry?: () => void
  loadingLabel?: string
  children: ReactNode
  /** Pinned action buttons. */
  footer?: ReactNode
}

/** Detail / form page: app bar, load + error handling, scrollable body, pinned actions. */
export function FormScreen({
  title,
  subtitle,
  backHref,
  right,
  isLoading,
  error,
  onRetry,
  loadingLabel,
  children,
  footer,
}: FormScreenProps) {
  return (
    <View className="flex-1 bg-background">
      <AppBar title={title} subtitle={subtitle} backHref={backHref} right={right} />
      <AsyncState isLoading={isLoading} error={error} onRetry={onRetry} loadingLabel={loadingLabel}>
        <FormScroll insetBottom={!footer}>{children}</FormScroll>
        {footer ? <StickyFooter>{footer}</StickyFooter> : null}
      </AsyncState>
    </View>
  )
}

/** Scrollable dashboard body with pull-to-refresh and consistent section rhythm. */
export function DashboardScroll({
  refreshing,
  onRefresh,
  children,
}: {
  refreshing: boolean
  onRefresh: () => void
  children: ReactNode
}) {
  const colors = useThemeColors()
  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-7 px-5 pb-10 pt-3"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.muted}
          colors={[colors.ink]}
        />
      }
    >
      {children}
    </ScrollView>
  )
}
