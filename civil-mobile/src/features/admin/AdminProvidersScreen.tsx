import { useMemo } from 'react'
import { router } from 'expo-router'
import { Store } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { ListCard, ListScreen, StandardListRow, Thumbnail, toneForStatus } from '@/components/kit'
import { useResourceList } from '@/hooks/useResourceList'
import { enumLabel, enumOptions } from '@/i18n/labels'
import { cacheKeys } from '@/lib/cacheKeys'
import { ltr } from '@/lib/rtl'
import { listProviders, PROVIDER_STATUS_OPTIONS, type ProviderStatus } from '@/services/providers'

const PAGE_SIZE = 20
const BASE = '/admin/providers'

export function AdminProvidersScreen() {
  const { t } = useTranslation()
  const { listProps } = useResourceList(
    ({ page, query, filter }) =>
      listProviders(
        page,
        PAGE_SIZE,
        query || undefined,
        (filter || undefined) as ProviderStatus | undefined,
        false,
      ),
    { pageSize: PAGE_SIZE, cacheKeyPrefix: cacheKeys.providers },
  )
  const statusOptions = useMemo(
    () => enumOptions(t, 'providerStatus', PROVIDER_STATUS_OPTIONS),
    [t],
  )

  return (
    <ListScreen
      title={t('providers.title')}
      searchPlaceholder={t('providers.search')}
      filterOptions={statusOptions}
      allLabel={t('common.all')}
      keyExtractor={(item) => item.id}
      renderItem={(item) => (
        <ListCard
          accessibilityLabel={item.name}
          leading={<Thumbnail imageUrl={item.logoUrl} icon={Store} />}
          onPress={() => router.push(`${BASE}/${item.id}` as never)}
        >
          <StandardListRow
            title={item.name}
            statusLabel={enumLabel(t, 'providerStatus', item.status)}
            statusTone={toneForStatus(item.status)}
            subtitle={
              [item.city, ltr(item.email), ltr(item.phone)].filter(Boolean).join(' · ') || '—'
            }
          />
        </ListCard>
      )}
      loadingLabel={t('providers.loading')}
      emptyTitle={t('providers.empty')}
      {...listProps}
    />
  )
}
