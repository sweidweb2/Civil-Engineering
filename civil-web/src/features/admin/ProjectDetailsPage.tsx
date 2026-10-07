import { useCallback } from 'react'
import { useLocation, useParams } from 'react-router-dom'

import { AsyncState } from '@/components/feedback/async-state'
import { DetailCardSkeleton } from '@/components/feedback/skeletons'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { loadMock } from '@/hooks/loadMock'
import { useRemoteData } from '@/hooks/useRemoteData'
import { portalBaseFromPath } from '@/lib/homePath'

import { ellipsis } from './lib/text'
import { findProjectById } from './mock-data'

export function ProjectDetailsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const location = useLocation()
  const projectsPath = `${portalBaseFromPath(location.pathname)}/projects`

  const load = useCallback(() => loadMock(projectId ?? ''), [projectId])
  const remote = useRemoteData(load, { enabled: Boolean(projectId) })

  const project = projectId ? findProjectById(projectId) : undefined
  useDocumentTitle(project ? ellipsis(project.name, 24) : 'Project details')

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        breadcrumbs={[
          { label: 'Projects', to: projectsPath },
          { label: project?.name ?? 'Project details' },
        ]}
      />
      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<DetailCardSkeleton />}
      >
        <Card size="sm" className="min-w-0">
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {project
                ? `${project.location} · ${project.managerName} · ${project.status}. Full project UI will land later.`
                : 'Project not found in mock data.'}
            </p>
          </CardContent>
        </Card>
      </AsyncState>
    </div>
  )
}
