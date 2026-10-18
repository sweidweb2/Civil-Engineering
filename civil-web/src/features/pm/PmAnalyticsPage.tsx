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
  getProjectSummary,
  PROJECT_STATUS_OPTIONS,
  type ProjectSummary,
  projectStatusLabel,
} from '@/services/projects'

export function PmAnalyticsPage() {
  useDocumentTitle('Analytics')
  const load = useCallback(() => getProjectSummary(), [])
  const remote = useRemoteData(load, { queryKey: ['project-summary'] })
  const summary: ProjectSummary | null = remote.status === 'success' ? remote.data.data : null
  const total = summary?.total ?? 0

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
          <StatCard icon={FolderKanban} label="Projects" value={total} />
          <StatCard
            icon={TrendingUp}
            label="In progress"
            value={summary?.counts.IN_PROGRESS ?? 0}
          />
          <StatCard
            icon={CheckCircle2}
            label="Completed"
            value={summary?.counts.COMPLETED ?? 0}
          />
          <StatCard icon={PauseCircle} label="Average progress" value={`${summary?.averageProgress ?? 0}%`} />
        </div>

        <Card size="sm">
          <CardHeader>
            <CardTitle>By status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {total === 0 ? (
              <p className="text-sm text-muted-foreground">No projects yet.</p>
            ) : (
              PROJECT_STATUS_OPTIONS.map((option) => {
                const count = summary?.counts[option.value] ?? 0
                const width = total ? Math.round((count / total) * 100) : 0
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
