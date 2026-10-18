import { CheckCircle2, FolderKanban, PauseCircle, TrendingUp } from 'lucide-react'
import { useCallback } from 'react'

import { AsyncState } from '@/components/feedback/async-state'
import { StatGridSkeleton } from '@/components/feedback/skeletons'
import { PageHeader } from '@/components/layout/page-header'
import { STAT_GRID_CLASS, StatCard } from '@/components/layout/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useRemoteData } from '@/hooks/useRemoteData'
import {
  listProjects,
  PROJECT_STATUS_OPTIONS,
  type Project,
  type ProjectStatus,
  projectStatusLabel,
} from '@/services/projects'

async function loadProjects(): Promise<Project[]> {
  const first = await listProjects(1, 100)
  if (first.meta.totalPages <= 1) return first.data
  const rest = await Promise.all(
    Array.from({ length: first.meta.totalPages - 1 }, (_, index) => listProjects(index + 2, 100)),
  )
  return [first.data, ...rest.map((page) => page.data)].flat()
}

function countStatus(projects: Project[], status: ProjectStatus): number {
  return projects.filter((project) => project.status === status).length
}

export function PmAnalyticsPage() {
  useDocumentTitle('Analytics')
  const load = useCallback(() => loadProjects(), [])
  const remote = useRemoteData(load, { queryKey: ['projects', 'pm-analytics'] })
  const projects = remote.status === 'success' ? remote.data : []
  const averageProgress = projects.length
    ? Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / projects.length)
    : 0

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Analytics"
        description="Progress and status across your projects."
      />

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<StatGridSkeleton count={4} />}
      >
        <div className={STAT_GRID_CLASS}>
          <StatCard icon={FolderKanban} label="Projects" value={projects.length} />
          <StatCard
            icon={TrendingUp}
            label="In progress"
            value={countStatus(projects, 'IN_PROGRESS')}
          />
          <StatCard
            icon={CheckCircle2}
            label="Completed"
            value={countStatus(projects, 'COMPLETED')}
          />
          <StatCard icon={PauseCircle} label="Average progress" value={`${averageProgress}%`} />
        </div>

        <Card size="sm">
          <CardHeader>
            <CardTitle>By status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No projects yet.</p>
            ) : (
              PROJECT_STATUS_OPTIONS.map((option) => {
                const count = countStatus(projects, option.value)
                const width = projects.length ? Math.round((count / projects.length) * 100) : 0
                return (
                  <div key={option.value} className="grid grid-cols-[8rem_minmax(0,1fr)_2.5rem] items-center gap-3">
                    <span className="truncate text-sm text-muted-foreground">
                      {projectStatusLabel(option.value)}
                    </span>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${width}%` }} />
                    </div>
                    <span className="text-right text-sm tabular-nums">{count}</span>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </AsyncState>
    </div>
  )
}
