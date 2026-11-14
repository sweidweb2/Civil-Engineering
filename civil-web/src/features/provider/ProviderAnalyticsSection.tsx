import { useCallback, useMemo, useState } from 'react'
import { Boxes, CircleDollarSign, PackageCheck, Percent, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AsyncState } from '@/components/feedback/async-state'
import { ContentSkeleton } from '@/components/feedback/skeletons'
import { useLocaleFormat } from '@/hooks/useLocaleFormat'
import { useRemoteData } from '@/hooks/useRemoteData'
import { cn } from '@/lib/utils'
import { type Listing, listListings } from '@/services/listings'
import { getMyProvider } from '@/services/providers'
import { colors } from '@/theme'

type MetricKey = 'listings' | 'value'
type PeriodKey = '7' | '30'

type DayPoint = {
  key: string
  label: string
  current: number
  prior: number
}

function parsePrice(listing: Listing) {
  if (listing.price != null && listing.price !== '') {
    const n = Number.parseFloat(listing.price)
    return Number.isFinite(n) ? n : 0
  }
  if (listing.priceMin != null && listing.priceMax != null) {
    const min = Number.parseFloat(listing.priceMin)
    const max = Number.parseFloat(listing.priceMax)
    if (Number.isFinite(min) && Number.isFinite(max)) return (min + max) / 2
  }
  return 0
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
  listings: Listing[],
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
    for (const listing of listings) {
      const createdKey = dayKey(new Date(listing.createdAt))
      const amount = metric === 'value' ? parsePrice(listing) : 1
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

function CatalogBarChart({
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

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    ratio,
    value: max * ratio,
    y: pad.top + innerH * (1 - ratio),
  }))

  const labelEvery = Math.max(1, Math.ceil(points.length / 8))

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
            {/* Prior (comparison) prism */}
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

            {/* Current (teal) prism */}
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

function StackHint({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute end-3 top-10 flex flex-col items-center',
        className,
      )}
      aria-hidden
    >
      <span className="size-8 rounded-full bg-primary/15" />
      <span className="-mt-2 size-9 rounded-full bg-primary/25" />
      <span className="-mt-2 size-10 rounded-full bg-primary/35" />
    </div>
  )
}

export function ProviderAnalyticsSection() {
  const { t } = useTranslation('provider')
  const { intlLocale, formatShortDay } = useLocaleFormat()
  const [metric, setMetric] = useState<MetricKey>('listings')
  const [period, setPeriod] = useState<PeriodKey>('30')
  const periodDays = period === '7' ? 7 : 30

  const loadProvider = useCallback(() => getMyProvider(), [])
  const providerRemote = useRemoteData(loadProvider, {
    queryKey: ['providers', 'me', 'analytics'],
  })
  const provider = providerRemote.status === 'success' ? providerRemote.data.data : null

  const loadListings = useCallback(() => {
    if (!provider) return Promise.reject(new Error('Provider not loaded'))
    return listListings(1, 100, { providerId: provider.id, counts: false })
  }, [provider])
  const listingsRemote = useRemoteData(loadListings, {
    queryKey: ['listings', 'provider-analytics', provider?.id ?? ''],
    enabled: Boolean(provider),
  })
  const listings = useMemo(
    () => (listingsRemote.status === 'success' ? listingsRemote.data.data : []),
    [listingsRemote],
  )

  const currency = listings[0]?.currency ?? 'USD'
  const active = listings.filter((item) => item.status === 'ACTIVE')
  const inactive = listings.filter((item) => item.status === 'INACTIVE')
  const materials = listings.filter((item) => item.type === 'MATERIAL').length
  const equipment = listings.filter((item) => item.type === 'EQUIPMENT').length
  const services = listings.filter((item) => item.type === 'SERVICE').length
  const catalogValue = listings.reduce((sum, item) => sum + parsePrice(item), 0)
  const activeValue = active.reduce((sum, item) => sum + parsePrice(item), 0)
  const categories = new Set(listings.map((item) => item.categoryId)).size
  const liveRate =
    listings.length === 0 ? 0 : Math.round((active.length / listings.length) * 1000) / 10

  const monthStart = startOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const addedThisMonth = listings.filter((item) => new Date(item.createdAt) >= monthStart).length

  const series = useMemo(
    () => buildSeries(listings, metric, periodDays, formatShortDay),
    [listings, metric, periodDays, formatShortDay],
  )
  const periodTotal = series.reduce((sum, point) => sum + point.current, 0)
  const priorTotal = series.reduce((sum, point) => sum + point.prior, 0)
  const deltaPct =
    priorTotal === 0 ? (periodTotal > 0 ? 100 : 0) : ((periodTotal - priorTotal) / priorTotal) * 100

  const isLoading = providerRemote.isLoading || (Boolean(provider) && listingsRemote.isLoading)
  const error = providerRemote.isError
    ? providerRemote.error
    : listingsRemote.isError
      ? listingsRemote.error
      : undefined

  const kpis = [
    {
      title: t('analytics.activeListings'),
      subtitle: t('analytics.liveInDirectory'),
      value: String(active.length),
      footer: t('analytics.inactiveTotal', {
        inactive: inactive.length,
        total: listings.length,
      }),
      icon: PackageCheck,
      iconClass: 'from-primary to-primary-deep',
    },
    {
      title: t('analytics.catalogValue'),
      subtitle: t('analytics.listedUnitPrices'),
      value: formatCompact(catalogValue, intlLocale, currency),
      footer: t('analytics.liveCategories', {
        amount: formatCompact(activeValue, intlLocale, currency),
        categories,
      }),
      icon: CircleDollarSign,
      iconClass: 'from-success to-primary',
    },
    {
      title: t('analytics.addedThisMonth'),
      subtitle: t('analytics.newListings'),
      value: String(addedThisMonth),
      footer: t('analytics.typeMix', { materials, equipment, services }),
      icon: Boxes,
      iconClass: 'from-primary-soft to-primary',
    },
    {
      title: t('analytics.liveRate'),
      subtitle: t('analytics.activeShare'),
      value: `${liveRate}%`,
      footer: liveRate >= 70 ? t('analytics.healthyVisibility') : t('analytics.activateMore'),
      icon: Percent,
      iconClass: 'from-primary/80 to-primary-dark',
    },
  ]

  return (
    <AsyncState
      isLoading={isLoading}
      error={error}
      onRetry={() => {
        void providerRemote.refetch()
        void listingsRemote.refetch()
      }}
      loadingFallback={<ContentSkeleton className="min-h-72" />}
    >
      <section aria-labelledby="provider-analytics-title" className="flex flex-col gap-5">
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

        <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h2 id="provider-analytics-title" className="text-sm font-semibold text-foreground">
                {t('analytics.performance')}
              </h2>
              <p className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
                {metric === 'value'
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
                  {t('analytics.vsPrior', {
                    amount:
                      metric === 'value'
                        ? formatCompact(priorTotal, intlLocale, currency)
                        : priorTotal,
                  })}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
                {t('analytics.showing')}
                <select
                  className="bg-transparent font-medium text-foreground outline-none"
                  value={metric}
                  onChange={(event) => setMetric(event.target.value as MetricKey)}
                >
                  <option value="listings">{t('analytics.newListingsMetric')}</option>
                  <option value="value">{t('analytics.listedValue')}</option>
                </select>
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
                {t('analytics.period')}
                <select
                  className="bg-transparent font-medium text-foreground outline-none"
                  value={period}
                  onChange={(event) => setPeriod(event.target.value as PeriodKey)}
                >
                  <option value="7">{t('analytics.last7Days')}</option>
                  <option value="30">{t('analytics.last30Days')}</option>
                </select>
              </label>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-muted" />
              {t('analytics.priorPeriod')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-primary" />
              {t('analytics.thisPeriod')}
            </span>
          </div>

          <div className="mt-2 overflow-x-auto">
            <CatalogBarChart
              points={series}
              intlLocale={intlLocale}
              chartAria={t('analytics.chartAria')}
            />
          </div>
        </article>
      </section>
    </AsyncState>
  )
}
