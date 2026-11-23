import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

import { AsyncState } from '@/components/feedback/async-state'
import { ListSkeleton } from '@/components/feedback/skeletons'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useRemoteData } from '@/hooks/useRemoteData'
import { portalBaseFromPath } from '@/lib/homePath'
import {
  designCategoryLabel,
  designRequestStatusLabel,
  listDesignRequests,
} from '@/services/design-requests'

import { StageSection } from '../projects/components/stages/StageSection'

type DesignStageRequestsSectionProps = {
  projectId: string
}

export function DesignStageRequestsSection({ projectId }: DesignStageRequestsSectionProps) {
  const { t } = useTranslation('designRequests')
  const location = useLocation()
  const portal = portalBaseFromPath(location.pathname)
  const isPm = portal === '/pm'

  const remote = useRemoteData(() => listDesignRequests({ projectId, page: 1, limit: 50 }), {
    queryKey: ['design-requests', 'project', projectId],
  })

  const rows = remote.status === 'success' ? remote.data.data : []

  return (
    <StageSection title={t('stageSection')}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {isPm ? (
          <Link
            to={`${portal}/design-requests/new?projectId=${projectId}`}
            className={cn(buttonVariants({ size: 'sm' }), 'inline-flex items-center gap-1.5')}
          >
            <Plus className="size-4" />
            {t('stageNew')}
          </Link>
        ) : null}
      </div>

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<ListSkeleton count={3} />}
      >
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('stageEmpty')}</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  to={`${portal}/design-requests/${row.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.subject}</p>
                    <p className="text-muted-foreground">
                      {designCategoryLabel(row.category)} ·{' '}
                      {new Date(row.neededBy).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline">{designRequestStatusLabel(row.status)}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </AsyncState>
    </StageSection>
  )
}
