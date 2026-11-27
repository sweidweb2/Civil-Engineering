import { useState } from 'react'
import { router } from 'expo-router'
import { Store } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { PROVIDER_TONE } from '@/features/admin/ui'
import { usePagedList, WkListRow, WkListScreen, WkMedia } from '@/components/wk/list'
import { enumLabel } from '@/i18n/labels'
import { cacheKeys } from '@/lib/cacheKeys'
import { isHttpUrl } from '@/lib/imageSource'
import { ltr } from '@/lib/rtl'
import {
  listProviders,
  type Provider,
  PROVIDER_STATUS_OPTIONS,
  type ProviderStatus,
  type ProviderStatusCounts,
} from '@/services/providers'

const PAGE_SIZE = 20
const BASE = '/admin/providers'

/** Admin "Providers" tab: status chips with counts. */
export function AdminProvidersScreen() {
  const { t } = useTranslation()
  const [counts, setCounts] = useState<ProviderStatusCounts | null>(null)
  const list = usePagedList<Provider>({
    cacheKeyPrefix: cacheKeys.providers,
    fetcher: async ({ page, query, filter }) => {
      const r = await listProviders(
        page,
        PAGE_SIZE,
        query || undefined,
        (filter || undefined) as ProviderStatus | undefined,
        true,
      )
      if (r.meta.statusCounts) setCounts(r.meta.statusCounts)
      return r
    },
  })

  const all = counts ? counts.PENDING + counts.APPROVED + counts.SUSPENDED : null
  return (
    <WkListScreen
      testID="e2e-admin-providers"
      list={list}
      searchPlaceholder={t('providers.search')}
      onAdd={() => router.push(`${BASE}/new` as never)}
      addLabel={t('providers.new')}
      filters={[
        { value: '', label: t('providerPortal.all'), count: all },
        ...PROVIDER_STATUS_OPTIONS.map((o) => ({
          value: o.value,
          label: enumLabel(t, 'providerStatus', o.value),
          count: counts?.[o.value] ?? null,
        })),
      ]}
      emptyIcon={Store}
      emptyTitle={t('providers.empty')}
      renderItem={(p) => (
        <WkListRow
          media={
            // List rows only have the stored logo ref (usually an R2 key, not a URL).
            <WkMedia photo={isHttpUrl(p.logoUrl) ? p.logoUrl : null} name={p.name} hero />
          }
          title={p.name}
          pill={{ label: enumLabel(t, 'providerStatus', p.status), tone: PROVIDER_TONE[p.status] }}
          sub={[p.city, p.country].filter(Boolean).join(', ') || null}
          sub2={p.email ? ltr(p.email) : p.phone ? ltr(p.phone) : null}
          onPress={() => router.push(`${BASE}/${p.id}` as never)}
        />
      )}
    />
  )
}
