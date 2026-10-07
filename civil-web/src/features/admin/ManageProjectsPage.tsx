import { CheckCircle2, ClipboardList, FolderKanban, PlayCircle } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { AsyncState } from '@/components/feedback/async-state'
import { CardGridSkeleton, CivilCardMedia } from '@/components/feedback/skeletons'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useRemoteData } from '@/hooks/useRemoteData'

import type { ProjectStatus } from './admin.types'
import { ToolbarCard } from './components/DataPanel'
import { STAT_GRID_CLASS, StatCard } from './components/StatCard'
import { ellipsis } from './lib/text'
import { MOCK_PROJECTS } from './mock-data'

function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge variant={status === 'active' ? 'default' : 'outline'}>{status}</Badge>
}

export function ManageProjectsPage() {
  useDocumentTitle('Manage projects')
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 600))
    return MOCK_PROJECTS
  }, [])
  const remote = useRemoteData(load)

  const catalog = remote.status === 'success' ? remote.data : []

  const projects = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return catalog
    return catalog.filter((project) =>
      [project.name, project.location, project.managerName, project.status]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [catalog, query])

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Manage projects"
        description="Platform projects. Open a card to view project details."
      />

      <div className={STAT_GRID_CLASS}>
        <StatCard icon={FolderKanban} label="Projects" value={catalog.length} />
        <StatCard
          icon={PlayCircle}
          label="Active"
          value={catalog.filter((p) => p.status === 'active').length}
        />
        <StatCard
          icon={ClipboardList}
          label="Planning"
          value={catalog.filter((p) => p.status === 'planning').length}
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={catalog.filter((p) => p.status === 'completed').length}
        />
      </div>

      <ToolbarCard>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter projects…"
          aria-label="Filter projects"
          className="max-w-sm"
        />
      </ToolbarCard>

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<CardGridSkeleton />}
      >
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects match.</p>
          ) : (
            projects.map((project, index) => (
              <Link key={project.id} to={`/admin/projects/${project.id}`} className="min-w-0">
                <Card
                  size="sm"
                  className="h-full cursor-pointer overflow-hidden pt-0 transition-colors hover:bg-muted/40 hover:ring-primary/30"
                >
                  <CivilCardMedia variant={index} />
                  <CardHeader className="min-w-0">
                    <CardTitle className="truncate" title={project.name}>
                      {ellipsis(project.name, 36)}
                    </CardTitle>
                    <CardDescription className="truncate" title={project.location}>
                      {ellipsis(project.location, 32)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex min-w-0 flex-wrap items-center gap-2">
                    <ProjectStatusBadge status={project.status} />
                    <span className="truncate text-xs text-muted-foreground">
                      {ellipsis(project.managerName, 24)}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </AsyncState>
    </div>
  )
}
