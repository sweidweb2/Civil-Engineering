import { useLocation, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { portalBaseFromPath } from '@/lib/homePath'

import { ellipsis } from './lib/text'
import { findProjectById } from './mock-data'

export function ProjectDetailsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const location = useLocation()
  const projectsPath = `${portalBaseFromPath(location.pathname)}/projects`
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
      <Card size="sm" className="min-w-0">
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {project
              ? `${project.location} · ${project.managerName} · ${project.status}. Full project UI will land later.`
              : 'Project not found in mock data.'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
