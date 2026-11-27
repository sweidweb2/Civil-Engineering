import { View } from 'react-native'
import { useTranslation } from 'react-i18next'

import { errorMessage } from '@/services/feedback'

import { WkButton, WkError } from './kit'

type PagedListFooterProps = {
  rowCount: number
  hasMore: boolean
  isFetching: boolean
  error?: unknown
  onLoadMore: () => void
}

/**
 * Shared "Show more" / load-more-error footer for paged FlatLists.
 * Keeps retry-on-error next to the load-more control in one place.
 */
export function PagedListFooter({
  rowCount,
  hasMore,
  isFetching,
  error,
  onLoadMore,
}: PagedListFooterProps) {
  const { t } = useTranslation()
  if (rowCount === 0 || (!hasMore && !error)) return null

  return (
    <View className="gap-3 pt-4">
      {error ? (
        <WkError message={errorMessage(error, t('common.errorGeneric'))} onRetry={onLoadMore} />
      ) : (
        <WkButton
          variant="soft"
          height={48}
          label={t('providerPortal.loadMore')}
          loading={isFetching}
          onPress={onLoadMore}
        />
      )}
    </View>
  )
}
