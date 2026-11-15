import { useMemo } from 'react'
import { router } from 'expo-router'
import { Store } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { ListCard, ListScreen, StandardListRow, Thumbnail, toneForStatus } from '@/components/kit'
import { useResourceList } from '@/hooks/useResourceList'
import { enumLabel, enumOptions } from '@/i18n/labels'
import { listProviders, PROVIDER_STATUS_OPTIONS, type ProviderStatus } from '@/services/providers'

const PAGE_SIZE = 20
const BASE = '/admin/providers'

export function AdminProvidersScreen() {
  const { t } = useTranslation()
  const { view, listProps } = useResourceList(
    ({ page, query, filter }) =>
      listProviders(
        page,
        PAGE_SIZE,
        query || undefined,
        (filter || undefined) as ProviderStatus | undefined,
      ),
    { pageSize: PAGE_SIZE, cacheKeyPrefix: 'providers:list' },
  )
  const statusOptions = useMemo(
    () => enumOptions(t, 'providerStatus', PROVIDER_STATUS_OPTIONS),
    [t],
  )

  return (
    <ListScreen
      title={t('providers.title')}
      subtitle={view.total ? t('common.total', { count: view.total }) : undefined}
      searchPlaceholder={t('providers.search')}
      filterOptions={statusOptions}
      allLabel={t('common.all')}
      addLabel={t('providers.add')}
      onAdd={() => router.push(`${BASE}/new` as never)}
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
            subtitle={[item.city, item.email, item.phone].filter(Boolean).join(' · ') || '—'}
          />
        </ListCard>
      )}
      loadingLabel={t('providers.loading')}
      emptyTitle={t('providers.empty')}
      {...listProps}
    />
  )
}
