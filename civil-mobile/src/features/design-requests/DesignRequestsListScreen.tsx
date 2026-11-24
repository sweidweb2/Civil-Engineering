import { router } from 'expo-router'
import { PenTool } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { usePagedList, WkListRow, WkListScreen } from '@/features/worker/ui/list'
import { cacheKeys } from '@/lib/cacheKeys'
import {
  DESIGN_REQUEST_STATUS_OPTIONS,
  designCategoryLabel,
  type DesignRequestStatus,
  designRequestStatusLabel,
  listDesignRequests,
} from '@/services/design-requests'

const PAGE_SIZE = 20

type DesignRequestsListScreenProps = {
  basePath: '/pm/design-requests' | '/admin/design-requests'
  backHref?: string
  isAdmin?: boolean
  /** Inside PM Designs hub — skip the duplicate top bar. */
  hubEmbedded?: boolean
}

const STATUS_TONE: Record<DesignRequestStatus, 'green' | 'amber' | 'red' | 'neutral' | 'teal'> = {
  PENDING: 'amber',
  IN_PROGRESS: 'teal',
  COMPLETED: 'green',
  REJECTED: 'red',
  CANCELLED: 'neutral',
}

/** PM or admin inbox of design requests. */
export function DesignRequestsListScreen({
  basePath,
  backHref,
  isAdmin = false,
  hubEmbedded = false,
}: DesignRequestsListScreenProps) {
  const { t } = useTranslation()
  const list = usePagedList({
    cacheKeyPrefix: `${cacheKeys.designRequests}:${basePath}`,
    initialFilter: isAdmin ? 'PENDING' : '',
    fetcher: ({ page, filter }) =>
      listDesignRequests({
        page,
        limit: PAGE_SIZE,
        status: (filter || undefined) as DesignRequestStatus | undefined,
      }),
  })

  return (
    <WkListScreen
      list={list}
      title={hubEmbedded ? undefined : t('designRequests.title')}
      backHref={hubEmbedded ? undefined : backHref}
      searchPlaceholder={t('designRequests.title')}
      onAdd={isAdmin ? undefined : () => router.push(`${basePath}/new` as never)}
      addLabel={t('designRequests.newRequest')}
      filters={[
        { value: '', label: t('common.all') },
        ...DESIGN_REQUEST_STATUS_OPTIONS.map((o) => ({
          value: o.value,
          label: designRequestStatusLabel(o.value),
        })),
      ]}
      emptyIcon={PenTool}
      emptyTitle={t('designRequests.empty')}
      renderItem={(row) => (
        <WkListRow
          title={row.subject}
          pill={{
            label: designRequestStatusLabel(row.status),
            tone: STATUS_TONE[row.status],
          }}
          sub={[
            designCategoryLabel(row.category),
            new Date(row.neededBy).toLocaleDateString(),
            row.projectName,
            row.designOfferTitle,
            isAdmin ? row.requestedByName : null,
          ]
            .filter(Boolean)
            .join(' · ')}
          onPress={() => router.push(`${basePath}/${row.id}` as never)}
        />
      )}
    />
  )
}
