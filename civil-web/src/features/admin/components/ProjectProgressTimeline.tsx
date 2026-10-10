import { useCallback, useEffect, useMemo, useState } from 'react'
import { cn } from 'cn'
import { format } from 'date-fns'
import { ChevronUp } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Skeleton } from '@/components/ui/skeleton'
import { useRemoteData } from '@/hooks/useRemoteData'
import { portalBaseFromPath } from '@/lib/homePath'
import { listProjects, type Project } from '@/services/projects'

const DAY_MS = 24 * 60 * 60 * 1000
const EMPTY_PROJECTS: Project[] = []
const ROW_CLASS = 'h-10'
const AXIS_CLASS = 'h-8'

const LANES = [
  {
    dot: 'bg-emerald-400',
    bar: 'bg-emerald-200 text-emerald-950 dark:bg-emerald-400/25 dark:text-emerald-50',
    fill: 'bg-emerald-400/80 dark:bg-emerald-300/40',
  },
  {
    dot: 'bg-sky-400',
    bar: 'bg-sky-200 text-sky-950 dark:bg-sky-400/25 dark:text-sky-50',
    fill: 'bg-sky-400/80 dark:bg-sky-300/40',
  },
  {
    dot: 'bg-lime-300',
    bar: 'bg-lime-200 text-lime-950 dark:bg-lime-400/25 dark:text-lime-50',
    fill: 'bg-lime-400/80 dark:bg-lime-300/40',
  },
  {
    dot: 'bg-violet-400',
    bar: 'bg-violet-200 text-violet-950 dark:bg-violet-400/25 dark:text-violet-50',
    fill: 'bg-violet-400/75 dark:bg-violet-300/40',
  },
  {
    dot: 'bg-teal-400',
    bar: 'bg-teal-200 text-teal-950 dark:bg-teal-400/25 dark:text-teal-50',
    fill: 'bg-teal-400/80 dark:bg-teal-300/40',
  },
  {
    dot: 'bg-amber-400',
    bar: 'bg-amber-200 text-amber-950 dark:bg-amber-400/25 dark:text-amber-50',
    fill: 'bg-amber-400/80 dark:bg-amber-300/40',
  },
  {
    dot: 'bg-fuchsia-400',
    bar: 'bg-fuchsia-200 text-fuchsia-950 dark:bg-fuchsia-400/25 dark:text-fuchsia-50',
    fill: 'bg-fuchsia-400/75 dark:bg-fuchsia-300/40',
  },
] as const

type TimelineLane = {
  id: string
  name: string
  progress: number
  start: number
  end: number
  endIsEstimated: boolean
  lane: (typeof LANES)[number]
}

type AxisTick = {
  at: number
  label: string
}

function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}

function parseTime(iso: string | null | undefined) {
  if (!iso) return null
  const time = new Date(iso).getTime()
  return Number.isNaN(time) ? null : time
}

function toLane(project: Project, now: number): Omit<TimelineLane, 'lane'> | null {
  const start = parseTime(project.startDate) ?? parseTime(project.actualStartDate) ?? parseTime(project.createdAt)
  if (start == null) return null

  const progress = clampProgress(project.progress)
  const scheduledEnd = parseTime(project.endDate) ?? parseTime(project.actualEndDate)
  let end = scheduledEnd
  let endIsEstimated = false

  if (end == null || end <= start) {
    endIsEstimated = true
    if (progress > 0 && progress < 100 && start < now) {
      const elapsed = now - start
      end = start + elapsed / (progress / 100)
    } else {
      end = Math.max(start, now) + 60 * DAY_MS
    }
  }

  return {
    id: project.id,
    name: project.name,
    progress,
    start,
    end,
    endIsEstimated,
  }
}

function edgeShift(percent: number) {
  if (percent < 8) return 'translateX(0)'
  if (percent > 92) return 'translateX(-100%)'
  return 'translateX(-50%)'
}

function buildTicks(domainStart: number, domainEnd: number): { ticks: AxisTick[]; minWidth: number } {
  const days = (domainEnd - domainStart) / DAY_MS
  const ticks: AxisTick[] = []

  if (days <= 100) {
    const cursor = new Date(domainStart)
    cursor.setHours(0, 0, 0, 0)
    const mondayOffset = (8 - cursor.getDay()) % 7
    cursor.setDate(cursor.getDate() + mondayOffset)
    if (cursor.getTime() < domainStart) cursor.setDate(cursor.getDate() + 7)
    while (cursor.getTime() <= domainEnd) {
      ticks.push({ at: cursor.getTime(), label: format(cursor, 'MMM d') })
      cursor.setDate(cursor.getDate() + 7)
    }
  } else {
    const step = days > 800 ? 3 : 1
    const cursor = new Date(domainStart)
    cursor.setHours(0, 0, 0, 0)
    cursor.setDate(1)
    if (step === 3) {
      cursor.setMonth(Math.ceil(cursor.getMonth() / 3) * 3)
    }
    if (cursor.getTime() < domainStart) cursor.setMonth(cursor.getMonth() + step)
    while (cursor.getTime() <= domainEnd) {
      ticks.push({ at: cursor.getTime(), label: format(cursor, 'MMM yyyy') })
      cursor.setMonth(cursor.getMonth() + step)
    }
  }

  if (ticks.length < 2) {
    return {
      ticks: [
        { at: domainStart, label: format(domainStart, 'MMM d') },
        { at: domainEnd, label: format(domainEnd, 'MMM d, yyyy') },
      ],
      minWidth: 560,
    }
  }

  return {
    ticks,
    minWidth: Math.max(640, ticks.length * (days > 800 ? 96 : 84)),
  }
}

type ProjectProgressTimelineProps = {
  /** Bump after a project mutation so the bars stay in sync with the list. */
  refreshKey?: number
}

export function ProjectProgressTimeline({ refreshKey = 0 }: ProjectProgressTimelineProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(true)
  const [snapshot, setSnapshot] = useState<{ projects: Project[]; total: number } | null>(null)
  const [now, setNow] = useState<number | null>(null)

  const load = useCallback(() => listProjects(1, 100, 'IN_PROGRESS'), [])
  const remote = useRemoteData(load)
  const refetch = remote.refetch

  useEffect(() => {
    setNow(Date.now())
  }, [])

  useEffect(() => {
    if (refreshKey === 0) return
    void refetch()
  }, [refreshKey, refetch])

  if (remote.status === 'success' && snapshot?.projects !== remote.data.data) {
    setSnapshot({ projects: remote.data.data, total: remote.data.meta.total })
  }

  const projects = snapshot?.projects ?? EMPTY_PROJECTS
  const total = snapshot?.total ?? 0

  const chart = useMemo(() => {
    if (now == null) return null
    const lanes = projects
      .filter((project) => project.status === 'IN_PROGRESS')
      .map((project) => toLane(project, now))
      .filter((lane): lane is Omit<TimelineLane, 'lane'> => lane != null)
      .sort((a, b) => a.start - b.start || a.name.localeCompare(b.name))
      .map((lane, index) => ({ ...lane, lane: LANES[index % LANES.length]! }))

    if (lanes.length === 0) return null

    const min = Math.min(...lanes.map((lane) => lane.start), now)
    const max = Math.max(...lanes.map((lane) => lane.end), now)
    const pad = Math.max((max - min) * 0.06, 2 * DAY_MS)
    const domainStart = min - pad
    const domainEnd = max + pad
    const span = domainEnd - domainStart
    const position = (time: number) => ((time - domainStart) / span) * 100
    const axis = buildTicks(domainStart, domainEnd)

    return {
      lanes,
      position,
      today: position(now),
      ...axis,
    }
  }, [now, projects])

  const isFirstLoad = remote.isLoading && projects.length === 0

  return (
    <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
        aria-expanded={open}
        aria-controls="in-progress-timeline"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold tracking-tight">In progress timeline</span>
          <span className="mt-0.5 block text-sm text-muted-foreground">
            Current projects on a shared date axis. Today is marked so you can see where you are.
          </span>
        </span>
        <ChevronUp
          className={cn(
            'mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-500 ease-in-out motion-reduce:transition-none',
            open ? 'rotate-0' : 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      <div
        id="in-progress-timeline"
        className={cn(
          'grid transition-[grid-template-rows] duration-500 ease-in-out motion-reduce:transition-none',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="min-h-0 overflow-hidden" inert={!open}>
          <div className="border-t border-border/70">
            {isFirstLoad ? (
              <div className="flex flex-col gap-3 px-4 py-4" role="status" aria-label="Loading timeline">
                <Skeleton className="h-7 w-2/3" />
                <Skeleton className="h-7 w-1/2" />
                <Skeleton className="h-7 w-3/4" />
              </div>
            ) : remote.isError && !chart ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                Could not load the timeline.{' '}
                <button
                  type="button"
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                  onClick={() => void remote.refetch()}
                >
                  Retry
                </button>
              </p>
            ) : !chart ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">No projects are currently in progress.</p>
            ) : (
              <TimelineChart
                chart={chart}
                hiddenCount={Math.max(0, total - projects.length)}
                onOpen={(id) => navigate(`${portalBaseFromPath(location.pathname)}/projects/${id}`)}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function TimelineChart({
  chart,
  hiddenCount,
  onOpen,
}: {
  chart: {
    lanes: TimelineLane[]
    position: (time: number) => number
    today: number
    ticks: AxisTick[]
    minWidth: number
  }
  hiddenCount: number
  onOpen: (id: string) => void
}) {
  return (
    <div className="px-2 pt-2 pb-3 sm:px-3">
      <div className="max-h-[34rem] overflow-auto">
        <div className="flex w-max min-w-full">
          <div className="sticky left-0 z-40 w-44 shrink-0 border-r border-border/70 bg-card sm:w-52">
            <div className={cn(AXIS_CLASS, 'sticky top-0 z-10 bg-card')} />
            <ul>
              {chart.lanes.map((lane) => (
                <li key={lane.id}>
                  <button
                    type="button"
                    className={cn(
                      ROW_CLASS,
                      'flex w-full items-center gap-2 pr-3 text-left transition-colors hover:bg-muted/60',
                    )}
                    onClick={() => onOpen(lane.id)}
                  >
                    <span className={cn('size-2.5 shrink-0 rounded-full', lane.lane.dot)} aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-sm">{lane.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{lane.progress}%</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className={cn(AXIS_CLASS, 'sticky bottom-0 z-10 bg-card')} />
          </div>

          <div className="relative min-w-0 flex-1 px-3" style={{ minWidth: chart.minWidth }}>
            <div className={cn(AXIS_CLASS, 'sticky top-0 z-30 bg-card')}>
              <span
                className="absolute top-1 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-medium tracking-wide text-background"
                style={{ left: `${chart.today}%`, transform: edgeShift(chart.today) }}
              >
                Today
              </span>
            </div>

            <div className="relative">
              {chart.ticks.map((tick) => (
                <div
                  key={tick.at}
                  className="pointer-events-none absolute inset-y-0 w-px bg-border/80"
                  style={{ left: `${chart.position(tick.at)}%` }}
                />
              ))}
              {chart.lanes.map((lane) => {
                const left = chart.position(lane.start)
                const width = Math.max(chart.position(lane.end) - left, 1.25)
                return (
                  <div key={lane.id} className={cn(ROW_CLASS, 'relative')}>
                    <button
                      type="button"
                      className={cn(
                        '@container/bar absolute top-1/2 flex h-7 -translate-y-1/2 items-center overflow-hidden rounded-md text-xs font-medium transition-shadow hover:ring-2 hover:ring-foreground/15',
                        lane.lane.bar,
                      )}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      title={`${lane.name} · ${lane.progress}% · ${format(lane.start, 'MMM d, yyyy')} – ${format(lane.end, 'MMM d, yyyy')}${lane.endIsEstimated ? ' (end estimated from progress)' : ''}`}
                      onClick={() => onOpen(lane.id)}
                    >
                      <span
                        className={cn('absolute inset-y-0 left-0', lane.lane.fill)}
                        style={{ width: `${lane.progress}%` }}
                      />
                      <span className="relative z-10 flex w-full items-center justify-between gap-2 px-2">
                        <span className="hidden min-w-0 truncate @[6.5rem]/bar:inline">{lane.name}</span>
                        <span className="shrink-0 tabular-nums">{lane.progress}%</span>
                      </span>
                    </button>
                  </div>
                )
              })}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 z-20 w-px"
                style={{
                  left: `${chart.today}%`,
                  background:
                    'repeating-linear-gradient(to bottom, var(--foreground) 0 4px, transparent 4px 8px)',
                  opacity: 0.7,
                }}
              />
            </div>

            <div className={cn(AXIS_CLASS, 'sticky bottom-0 z-30 bg-card')}>
              {chart.ticks.map((tick) => {
                const percent = chart.position(tick.at)
                return (
                  <span
                    key={tick.at}
                    className="absolute top-1.5 text-[11px] whitespace-nowrap text-muted-foreground"
                    style={{ left: `${percent}%`, transform: edgeShift(percent) }}
                  >
                    {tick.label}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      {hiddenCount > 0 ? (
        <p className="px-2 pt-2 text-xs text-muted-foreground">
          Showing the first {chart.lanes.length} in-progress projects.
        </p>
      ) : null}
    </div>
  )
}
