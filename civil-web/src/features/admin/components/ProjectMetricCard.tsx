import { cn } from 'cn'
import type { LucideIcon } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import type { Project } from '@/services/projects'

/** Bar heights cloned from the reference metric card, left to right. */
const BAR_HEIGHTS = [28, 34, 30, 42, 38, 50, 46, 58, 54, 66, 62, 74, 48, 80, 70, 88, 78, 94]

function barHeights(shift: number): number[] {
  const count = 32
  return Array.from({ length: count }, (_, index) => {
    const position = (index + shift) % count
    const sourceIndex = Math.round((position / (count - 1)) * (BAR_HEIGHTS.length - 1)) % BAR_HEIGHTS.length
    return BAR_HEIGHTS[sourceIndex]
  })
}

type ProjectMetricCardProps = {
  icon: LucideIcon
  label: string
  value: string
  change: number
  barShift?: number
}

export function ProjectMetricCard({ icon: Icon, label, value, change, barShift = 0 }: ProjectMetricCardProps) {
  const positive = change >= 0
  const bars = barHeights(barShift)

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-foreground/10">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground ring-1 ring-foreground/10">
          <Icon className="size-3.5" aria-hidden />
        </span>
        <p className="truncate text-sm text-muted-foreground">{label}</p>
      </div>
      <p className="text-[1.75rem] leading-none font-semibold tracking-tight text-foreground">{value}</p>
      <p className="text-sm leading-none">
        <span className={cn('font-medium', positive ? 'text-success' : 'text-destructive')}>
          {positive ? '+' : ''}
          {change.toFixed(1)}%
        </span>
        <span className="text-muted-foreground"> vs last month</span>
      </p>
      <div className="flex h-8 items-end gap-px" aria-hidden>
        {bars.map((height, index) => (
          <span
            key={index}
            className="min-w-0 flex-1 rounded-full bg-chart-1"
            style={{ height: `${Math.max(height, 55)}%` }}
          />
        ))}
      </div>
    </div>
  )
}

export function ProjectMetricCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <Skeleton className="h-7 w-28" />
      <Skeleton className="h-7 w-16" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-7 w-full rounded-full" />
    </div>
  )
}

function monthWindow(offset: number): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1)
  return { start, end }
}

function createdIn(project: Project, start: Date, end: Date): boolean {
  const created = new Date(project.createdAt).getTime()
  return created >= start.getTime() && created < end.getTime()
}

/** Percent change of a count from last month to this month. */
export function monthOverMonth(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100
  return ((current - previous) / previous) * 100
}

export function datesMonthChange(dates: string[]): number {
  const current = monthWindow(0)
  const previous = monthWindow(-1)
  const inWindow = (iso: string, start: Date, end: Date) => {
    const created = new Date(iso).getTime()
    return created >= start.getTime() && created < end.getTime()
  }
  const thisMonth = dates.filter((iso) => inWindow(iso, current.start, current.end)).length
  const lastMonth = dates.filter((iso) => inWindow(iso, previous.start, previous.end)).length
  return monthOverMonth(thisMonth, lastMonth)
}

export function monthlyCountChange(projects: Project[], match: (project: Project) => boolean): number {
  const current = monthWindow(0)
  const previous = monthWindow(-1)
  const thisMonth = projects.filter((project) => match(project) && createdIn(project, current.start, current.end)).length
  const lastMonth = projects.filter((project) => match(project) && createdIn(project, previous.start, previous.end)).length
  return monthOverMonth(thisMonth, lastMonth)
}

export function monthlyAverageChange(projects: Project[]): number {
  const current = monthWindow(0)
  const previous = monthWindow(-1)
  const average = (window: { start: Date; end: Date }) => {
    const rows = projects.filter((project) => createdIn(project, window.start, window.end))
    if (rows.length === 0) return 0
    return rows.reduce((sum, project) => sum + project.progress, 0) / rows.length
  }
  return monthOverMonth(average(current), average(previous))
}
