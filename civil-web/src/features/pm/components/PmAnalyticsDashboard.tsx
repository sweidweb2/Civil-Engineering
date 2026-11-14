import { useCallback, useMemo, useState } from 'react'
import { CheckCircle2, CircleDollarSign, FolderKanban, PauseCircle, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { AsyncState } from '@/components/feedback/async-state'
import { ContentSkeleton } from '@/components/feedback/skeletons'
import { buttonVariants } from '@/components/ui/button'
import { useLocaleFormat } from '@/hooks/useLocaleFormat'
import { useRemoteData } from '@/hooks/useRemoteData'
import { cn } from '@/lib/utils'
import {
  getProjectSummary,
  listProjects,
  type Project,
  type ProjectStatus,
  type ProjectSummary,
} from '@/services/projects'
import { colors, withAlpha } from '@/theme'

type MetricKey = 'projects' | 'budget'
type PeriodKey = '7' | '30'

type DayPoint = {
  key: string
  label: string
  current: number
  prior: number
}

function parseMoney(value: string | null | undefined) {
  if (!value) return 0
  const n = Number.parseFloat(value)
  return Number.isFinite(n) ? n : 0
}

function formatCompact(value: number, intlLocale: string, currency?: string) {
  const formatted = new Intl.NumberFormat(intlLocale, {
    notation: value >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value)
  return currency ? `${currency} ${formatted}` : formatted
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function dayKey(date: Date) {
  return startOfDay(date).toISOString().slice(0, 10)
}

function buildSeries(
  projects: Project[],
  metric: MetricKey,
  periodDays: number,
  formatShortDay: (date: Date) => string,
): DayPoint[] {
  const today = startOfDay(new Date())
  const points: DayPoint[] = []

  for (let i = periodDays - 1; i >= 0; i -= 1) {
    const currentDay = addDays(today, -i)
    const priorDay = addDays(currentDay, -periodDays)
    const currentKey = dayKey(currentDay)
    const priorKey = dayKey(priorDay)

    let current = 0
    let prior = 0
    for (const project of projects) {
      const createdKey = dayKey(new Date(project.createdAt))
      const amount = metric === 'budget' ? parseMoney(project.budget) : 1
      if (createdKey === currentKey) current += amount
      if (createdKey === priorKey) prior += amount
    }

    points.push({
      key: currentKey,
      label: formatShortDay(currentDay),
      current,
      prior,
    })
  }

  return points
}

function PerformanceBarChart({
  points,
  intlLocale,
  chartAria,
}: {
  points: DayPoint[]
  intlLocale: string
  chartAria: string
}) {
  const width = 920
  const height = 320
  const pad = { top: 24, right: 16, bottom: 36, left: 48 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const max = Math.max(...points.flatMap((p) => [p.current, p.prior]), 1)
  const step = innerW / Math.max(points.length, 1)
  const barW = Math.min(18, Math.max(8, step * 0.42))
  const skewX = 5
  const skewY = 4
  const labelEvery = Math.max(1, Math.ceil(points.length / 8))

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    ratio,
    value: max * ratio,
    y: pad.top + innerH * (1 - ratio),
  }))

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-[300px] w-full sm:h-[340px]"
      role="img"
      aria-label={chartAria}
    >
      {ticks.map((tick) => (
        <g key={tick.ratio}>
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={tick.y}
            y2={tick.y}
            className="stroke-border"
            strokeWidth={1}
          />
          <text
            x={pad.left - 8}
            y={tick.y + 3}
            textAnchor="end"
            className="fill-muted-foreground"
            fontSize="10"
          >
            {formatCompact(tick.value, intlLocale)}
          </text>
        </g>
      ))}

      {points.map((point, index) => {
        const x = pad.left + index * step + step / 2
        const priorH = (point.prior / max) * innerH
        const currentH = (point.current / max) * innerH
        const priorTop = pad.top + innerH - priorH
        const currentTop = pad.top + innerH - currentH
        const frontX = x - barW / 2

        return (
          <g key={point.key}>
            <path
              d={[
                `M ${frontX} ${priorTop + priorH}`,
                `L ${frontX} ${priorTop}`,
                `L ${frontX + barW} ${priorTop}`,
                `L ${frontX + barW} ${priorTop + priorH}`,
                'Z',
              ].join(' ')}
              className="fill-muted/80"
              opacity={0.55}
            />
            <path
              d={[
                `M ${frontX} ${priorTop}`,
                `L ${frontX + skewX} ${priorTop - skewY}`,
                `L ${frontX + barW + skewX} ${priorTop - skewY}`,
                `L ${frontX + barW} ${priorTop}`,
                'Z',
              ].join(' ')}
              className="fill-muted"
              opacity={0.45}
            />
            <path
              d={[
                `M ${frontX + barW} ${priorTop}`,
                `L ${frontX + barW + skewX} ${priorTop - skewY}`,
                `L ${frontX + barW + skewX} ${priorTop + priorH - skewY}`,
                `L ${frontX + barW} ${priorTop + priorH}`,
                'Z',
              ].join(' ')}
              className="fill-border"
              opacity={0.55}
            />

            <path
              d={[
                `M ${frontX} ${currentTop + currentH}`,
                `L ${frontX} ${currentTop}`,
                `L ${frontX + barW} ${currentTop}`,
                `L ${frontX + barW} ${currentTop + currentH}`,
                'Z',
              ].join(' ')}
              className="fill-primary"
            />
            <path
              d={[
                `M ${frontX} ${currentTop}`,
                `L ${frontX + skewX} ${currentTop - skewY}`,
                `L ${frontX + barW + skewX} ${currentTop - skewY}`,
                `L ${frontX + barW} ${currentTop}`,
                'Z',
              ].join(' ')}
              fill={colors.light.primarySoft}
            />
            <path
              d={[
                `M ${frontX + barW} ${currentTop}`,
                `L ${frontX + barW + skewX} ${currentTop - skewY}`,
                `L ${frontX + barW + skewX} ${currentTop + currentH - skewY}`,
                `L ${frontX + barW} ${currentTop + currentH}`,
                'Z',
              ].join(' ')}
              fill={colors.light.primaryDeep}
            />

            {index % labelEvery === 0 || index === points.length - 1 ? (
              <text
                x={x}
                y={height - 12}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize="10"
              >
                {point.label}
              </text>
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}

function StackHint() {
  return (
    <div
      className="pointer-events-none absolute top-10 end-3 flex flex-col items-center"
      aria-hidden
    >
      <span className="size-8 rounded-full bg-primary/15" />
      <span className="-mt-2 size-9 rounded-full bg-primary/25" />
      <span className="-mt-2 size-10 rounded-full bg-primary/35" />
    </div>
  )
}

type MixBucket = {
  id: string
  label: string
  count: number
  pct: number
  monthDeltaPct: number
  fill: string
  stroke: string
  cx: number
  cy: number
  r: number
  tx: number
  ty: number
}

function countCreatedInRange(projects: Project[], statuses: ProjectStatus[], from: Date, to: Date) {
  return projects.filter((project) => {
    if (!statuses.includes(project.status)) return false
    const created = new Date(project.createdAt)
    return created >= from && created < to
  }).length
}

function buildPortfolioMix(
  counts: Record<ProjectStatus, number>,
  total: number,
  projects: Project[],
  labels: { inProgress: string; pipeline: string; completed: string },
): { buckets: MixBucket[]; activeTotal: number; growthPct: number } {
  const inProgress = counts.IN_PROGRESS ?? 0
  const pipeline = (counts.DRAFT ?? 0) + (counts.PLANNING ?? 0) + (counts.APPROVED ?? 0)
  const completed = counts.COMPLETED ?? 0
  const activeTotal = inProgress + pipeline + completed
  const safeTotal = activeTotal > 0 ? activeTotal : Math.max(total, 1)

  const today = startOfDay(new Date())
  const monthStart = startOfDay(new Date(today.getFullYear(), today.getMonth(), 1))
  const priorMonthStart = startOfDay(new Date(today.getFullYear(), today.getMonth() - 1, 1))
  const nextMonthStart = startOfDay(new Date(today.getFullYear(), today.getMonth() + 1, 1))

  const thisMonthAll = projects.filter((project) => {
    const created = new Date(project.createdAt)
    return created >= monthStart && created < nextMonthStart
  }).length
  const priorMonthAll = projects.filter((project) => {
    const created = new Date(project.createdAt)
    return created >= priorMonthStart && created < monthStart
  }).length
  const growthPct =
    priorMonthAll === 0
      ? thisMonthAll > 0
        ? 100
        : 0
      : ((thisMonthAll - priorMonthAll) / priorMonthAll) * 100

  const defs = [
    {
      id: 'active',
      label: labels.inProgress,
      count: inProgress,
      statuses: ['IN_PROGRESS'] as ProjectStatus[],
      fill: withAlpha(colors.light.primary, 0.22),
      stroke: colors.light.primary,
      cx: 188,
      cy: 132,
      r: 74,
      /** Label sits in the open right side, away from overlaps */
      tx: 228,
      ty: 148,
    },
    {
      id: 'pipeline',
      label: labels.pipeline,
      count: pipeline,
      statuses: ['DRAFT', 'PLANNING', 'APPROVED'] as ProjectStatus[],
      fill: withAlpha(colors.light.warning, 0.18),
      stroke: colors.light.warning,
      cx: 108,
      cy: 142,
      r: 64,
      /** Label sits in the open left side */
      tx: 72,
      ty: 158,
    },
    {
      id: 'completed',
      label: labels.completed,
      count: completed,
      statuses: ['COMPLETED'] as ProjectStatus[],
      fill: withAlpha(colors.light.chartMint, 0.28),
      stroke: colors.light.success,
      cx: 148,
      cy: 78,
      r: 50,
      /** Label sits in the open top lobe */
      tx: 148,
      ty: 52,
    },
  ]

  const buckets: MixBucket[] = defs.map((item) => {
    const thisMonth = countCreatedInRange(projects, item.statuses, monthStart, nextMonthStart)
    const priorMonth = countCreatedInRange(projects, item.statuses, priorMonthStart, monthStart)
    const monthDeltaPct =
      priorMonth === 0 ? (thisMonth > 0 ? 100 : 0) : ((thisMonth - priorMonth) / priorMonth) * 100
    return {
      id: item.id,
      label: item.label,
      count: item.count,
      pct: Math.round((item.count / safeTotal) * 1000) / 10,
      monthDeltaPct,
      fill: item.fill,
      stroke: item.stroke,
      cx: item.cx,
      cy: item.cy,
      r: item.r,
      tx: item.tx,
      ty: item.ty,
    }
  })

  return { buckets, activeTotal, growthPct }
}

function PortfolioMixCard({
  counts,
  total,
  projects,
}: {
  counts: Record<ProjectStatus, number>
  total: number
  projects: Project[]
}) {
  const { t } = useTranslation('pm')
  const { formatNumber } = useLocaleFormat()
  const { buckets, activeTotal, growthPct } = buildPortfolioMix(counts, total, projects, {
    inProgress: t('dashboard.mixInProgress'),
    pipeline: t('dashboard.mixPipeline'),
    completed: t('dashboard.mixCompleted'),
  })

  return (
    <article className="flex h-full flex-col rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            {t('dashboard.activeProjects')}
          </p>
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
              {formatNumber(activeTotal)}
            </p>
            <span
              className={cn(
                'text-xs font-medium',
                growthPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive',
              )}
            >
              {growthPct >= 0 ? '+' : ''}
              {growthPct.toFixed(1)}%
            </span>
          </div>
        </div>
        <Link
          to="/pm/projects"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'shrink-0')}
        >
          {t('dashboard.details')}
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center py-2">
        <svg
          viewBox="0 0 300 230"
          className="h-full min-h-[210px] w-full"
          role="img"
          aria-label={t('dashboard.mixAria')}
          preserveAspectRatio="xMidYMid meet"
        >
          {buckets
            .slice()
            .sort((a, b) => b.r - a.r)
            .map((bucket) => (
              <circle
                key={`${bucket.id}-shape`}
                cx={bucket.cx}
                cy={bucket.cy}
                r={bucket.r}
                fill={bucket.fill}
                stroke={bucket.stroke}
                strokeWidth={0.6}
              />
            ))}
          {buckets.map((bucket) => (
            <text
              key={`${bucket.id}-label`}
              x={bucket.tx}
              y={bucket.ty}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="10"
              fontWeight="500"
              fill={bucket.stroke}
              opacity={0.85}
            >
              {bucket.pct.toFixed(0)}%
            </text>
          ))}
        </svg>
      </div>

      <ul className="divide-y divide-border border-t border-border">
        {buckets.map((bucket) => (
          <li key={bucket.id} className="flex items-center gap-2 py-2.5 text-xs">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: bucket.stroke }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{bucket.label}</span>
            <span className="tabular-nums font-medium text-foreground">
              {formatNumber(bucket.count)}
            </span>
            <span
              className={cn(
                'w-12 text-end tabular-nums font-medium',
                bucket.monthDeltaPct >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-destructive',
              )}
            >
              {bucket.monthDeltaPct >= 0 ? '+' : ''}
              {bucket.monthDeltaPct.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </article>
  )
}

export function PmAnalyticsDashboard() {
  const { t } = useTranslation('pm')
  const { intlLocale, formatShortDay } = useLocaleFormat()
  const [metric, setMetric] = useState<MetricKey>('projects')
  const [period, setPeriod] = useState<PeriodKey>('30')
  const periodDays = period === '7' ? 7 : 30

  const loadSummary = useCallback(() => getProjectSummary(), [])
  const summaryRemote = useRemoteData(loadSummary, { queryKey: ['project-summary'] })
  const summary: ProjectSummary | null =
    summaryRemote.status === 'success' ? summaryRemote.data.data : null

  const loadProjects = useCallback(() => listProjects({ page: 1, limit: 100 }), [])
  const projectsRemote = useRemoteData(loadProjects, { queryKey: ['projects', 'analytics'] })
  const projects = useMemo(
    () => (projectsRemote.status === 'success' ? projectsRemote.data.data : []),
    [projectsRemote],
  )

  const currency = projects.find((project) => project.currency)?.currency ?? 'USD'
  const inProgress = summary?.counts.IN_PROGRESS ?? 0
  const completed = summary?.counts.COMPLETED ?? 0
  const onHold = summary?.counts.ON_HOLD ?? 0
  const total = summary?.total ?? projects.length
  const averageProgress = summary?.averageProgress ?? 0
  const budgetTotal = projects.reduce((sum, project) => sum + parseMoney(project.budget), 0)
  const actualCostTotal = projects.reduce((sum, project) => sum + parseMoney(project.actualCost), 0)
  const planning = (summary?.counts.PLANNING ?? 0) + (summary?.counts.APPROVED ?? 0)

  const series = useMemo(
    () => buildSeries(projects, metric, periodDays, formatShortDay),
    [projects, metric, periodDays, formatShortDay],
  )
  const periodTotal = series.reduce((sum, point) => sum + point.current, 0)
  const priorTotal = series.reduce((sum, point) => sum + point.prior, 0)
  const deltaPct =
    priorTotal === 0 ? (periodTotal > 0 ? 100 : 0) : ((periodTotal - priorTotal) / priorTotal) * 100

  const isLoading = summaryRemote.isLoading || projectsRemote.isLoading
  const error = summaryRemote.isError
    ? summaryRemote.error
    : projectsRemote.isError
      ? projectsRemote.error
      : undefined

  const kpis = [
    {
      title: t('dashboard.projects'),
      subtitle: t('dashboard.portfolioTotal'),
      value: String(total),
      footer: t('dashboard.planningOnHold', { planning, onHold }),
      icon: FolderKanban,
      iconClass: 'from-primary to-primary-deep',
    },
    {
      title: t('dashboard.inProgress'),
      subtitle: t('dashboard.activeSites'),
      value: String(inProgress),
      footer: t('dashboard.completedMomentum', { completed }),
      icon: TrendingUp,
      iconClass: 'from-primary-soft to-primary',
    },
    {
      title: t('dashboard.portfolioBudget'),
      subtitle: t('dashboard.plannedCapital'),
      value: formatCompact(budgetTotal, intlLocale, currency),
      footer: t('dashboard.actualLogged', {
        amount: formatCompact(actualCostTotal, intlLocale, currency),
      }),
      icon: CircleDollarSign,
      iconClass: 'from-success to-primary',
    },
    {
      title: t('dashboard.averageProgress'),
      subtitle: t('dashboard.acrossProjects'),
      value: `${averageProgress}%`,
      footer: averageProgress >= 60 ? t('dashboard.trackingWell') : t('dashboard.pushStalled'),
      icon: averageProgress >= 50 ? CheckCircle2 : PauseCircle,
      iconClass: 'from-primary/80 to-primary-dark',
    },
  ]

  return (
    <AsyncState
      isLoading={isLoading}
      error={error}
      onRetry={() => {
        void summaryRemote.refetch()
        void projectsRemote.refetch()
      }}
      loadingFallback={<ContentSkeleton className="min-h-72" />}
    >
      <section aria-labelledby="pm-analytics-title" className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon
            return (
              <article
                key={kpi.title}
                className="relative overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/25"
              >
                <div className="relative space-y-3 p-4 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        'flex size-9 items-center justify-center rounded-lg bg-linear-to-br text-primary-foreground',
                        kpi.iconClass,
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <h3 className="text-sm font-medium text-foreground">{kpi.title}</h3>
                  </div>
                  <div className="pe-12">
                    <p className="text-xs text-muted-foreground">{kpi.subtitle}</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-foreground sm:text-[1.7rem]">
                      {kpi.value}
                    </p>
                  </div>
                  <StackHint />
                </div>
                <div className="border-t border-border bg-muted/40 px-4 py-2">
                  <p className="text-[11px] leading-4 text-muted-foreground">{kpi.footer}</p>
                </div>
              </article>
            )
          })}
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:items-stretch">
          <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h2 id="pm-analytics-title" className="text-sm font-semibold text-foreground">
                  {t('dashboard.performance')}
                </h2>
                <p className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
                  {metric === 'budget'
                    ? formatCompact(periodTotal, intlLocale, currency)
                    : periodTotal}
                </p>
                <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 font-medium',
                      deltaPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive',
                    )}
                  >
                    <TrendingUp className={cn('size-3.5', deltaPct < 0 && 'rotate-180')} />
                    {deltaPct >= 0 ? '+' : ''}
                    {deltaPct.toFixed(1)}%
                  </span>
                  <span>
                    {t('dashboard.vsPrior', {
                      amount:
                        metric === 'budget'
                          ? formatCompact(priorTotal, intlLocale, currency)
                          : priorTotal,
                    })}
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
                  {t('dashboard.showing')}
                  <select
                    className="bg-transparent font-medium text-foreground outline-none"
                    value={metric}
                    onChange={(event) => setMetric(event.target.value as MetricKey)}
                  >
                    <option value="projects">{t('dashboard.newProjects')}</option>
                    <option value="budget">{t('dashboard.budgetAdded')}</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
                  {t('dashboard.period')}
                  <select
                    className="bg-transparent font-medium text-foreground outline-none"
                    value={period}
                    onChange={(event) => setPeriod(event.target.value as PeriodKey)}
                  >
                    <option value="7">{t('dashboard.last7Days')}</option>
                    <option value="30">{t('dashboard.last30Days')}</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-end gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-muted" />
                {t('dashboard.priorPeriod')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-primary" />
                {t('dashboard.thisPeriod')}
              </span>
            </div>

            <div className="mt-2 overflow-x-auto">
              <PerformanceBarChart
                points={series}
                intlLocale={intlLocale}
                chartAria={t('dashboard.chartAria')}
              />
            </div>
          </article>

          <PortfolioMixCard
            counts={
              summary?.counts ?? {
                DRAFT: 0,
                PLANNING: 0,
                APPROVED: 0,
                IN_PROGRESS: 0,
                ON_HOLD: 0,
                COMPLETED: 0,
                CANCELLED: 0,
              }
            }
            total={total}
            projects={projects}
          />
        </div>
      </section>
    </AsyncState>
  )
}
