import { useCallback, useState } from 'react'
import { Box, HardHat, Layers, Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'

import { AsyncState } from '@/components/feedback/async-state'
import { CardGridSkeleton, CivilCardMedia, StatGridSkeleton } from '@/components/feedback/skeletons'
import { PageHeader, STAT_GRID_CLASS, StatCard, TablePager, ToolbarCard } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { usePagedQuery } from '@/hooks/usePagedQuery'
import { useRemoteData } from '@/hooks/useRemoteData'
import { ellipsis, PAGE_SIZE, pageCount } from '@/lib/text'
import {
  formatListingPrice,
  type Listing,
  type ListingType,
  listListings,
  localizedListingCategoryName,
} from '@/services/listings'
import { listVerifications, type User } from '@/services/users'
import type { AppLocale } from '@/stores/localeStore'
import { useLocaleStore } from '@/stores/localeStore'

import type { DirectoryItem, DirectoryKind } from './admin.types'
import { directoryWindows, readPageWindow } from './lib/directory-page'

type DirectorySource = 'materials' | 'equipment' | 'workers'
type DirectoryFilter = DirectoryKind | 'all'

type DirectoryStats = {
  materials: number
  equipment: number
  workers: number
}

function personName(user: User): string {
  const profile = user.profile
  const named =
    profile?.displayName?.trim() ||
    [profile?.firstName, profile?.lastName].filter(Boolean).join(' ')
  return named || user.email
}

function listingItem(listing: Listing, locale: AppLocale): DirectoryItem {
  return {
    id: listing.id,
    name: listing.name,
    kind: listing.type === 'EQUIPMENT' ? 'equipment' : 'material',
    category: localizedListingCategoryName(listing, locale) ?? '—',
    location: listing.providerName ?? '—',
    source: listing.providerName ?? '—',
    price: formatListingPrice(listing),
  }
}

function workerItem(user: User): DirectoryItem {
  const status =
    user.verificationStatus === 'VERIFIED'
      ? 'Verified'
      : user.verificationStatus === 'REQUESTED'
        ? 'Requested'
        : 'Unverified'
  return {
    id: user.id,
    name: personName(user),
    kind: 'worker',
    category: status,
    location: user.profile?.phone ?? '—',
    source: user.email,
    price: status,
  }
}

async function listingSlice(
  type: ListingType,
  page: number,
  limit: number,
  locale: AppLocale,
  q?: string,
) {
  const result = await listListings(page, limit, { type, status: 'ACTIVE', q, counts: false })
  return { total: result.meta.total, items: result.data.map((row) => listingItem(row, locale)) }
}

async function loadDirectory(input: {
  page: number
  query: string
  kind: DirectoryFilter
  includeWorkers: boolean
  locale: AppLocale
}): Promise<{ stats: DirectoryStats; items: DirectoryItem[]; total: number }> {
  const q = input.query || undefined
  const { locale } = input
  const materialIsList = !q && input.kind === 'material'
  const equipmentIsList = !q && input.kind === 'equipment'
  const workerIsList = !q && input.kind === 'worker'
  const materialLimit =
    materialIsList || (!q && input.kind === 'all' && input.page === 1) ? PAGE_SIZE : 1
  const materialPage = materialIsList ? input.page : 1

  const [materials, equipment, workers] = await Promise.all([
    listingSlice('MATERIAL', materialPage, materialLimit, locale),
    listingSlice(
      'EQUIPMENT',
      equipmentIsList ? input.page : 1,
      equipmentIsList ? PAGE_SIZE : 1,
      locale,
    ),
    input.includeWorkers
      ? listVerifications({
          page: workerIsList ? input.page : 1,
          limit: workerIsList ? PAGE_SIZE : 1,
        })
      : Promise.resolve(null),
  ])

  const stats: DirectoryStats = {
    materials: materials.total,
    equipment: equipment.total,
    workers: workers?.meta.counts.workers ?? 0,
  }

  if (materialIsList) return { stats, items: materials.items, total: materials.total }
  if (equipmentIsList) return { stats, items: equipment.items, total: equipment.total }
  if (workerIsList && workers) {
    return { stats, items: workers.data.map(workerItem), total: workers.meta.total }
  }

  if (q && (input.kind === 'material' || input.kind === 'equipment')) {
    const type: ListingType = input.kind === 'material' ? 'MATERIAL' : 'EQUIPMENT'
    const page = await listingSlice(type, input.page, PAGE_SIZE, locale, q)
    return { stats, items: page.items, total: page.total }
  }
  if (q && input.kind === 'worker') {
    const page = await listVerifications({ page: input.page, limit: PAGE_SIZE, q })
    return { stats, items: page.data.map(workerItem), total: page.meta.total }
  }

  const filtered = q
    ? await Promise.all([
        listingSlice('MATERIAL', 1, 1, locale, q),
        listingSlice('EQUIPMENT', 1, 1, locale, q),
        input.includeWorkers ? listVerifications({ page: 1, limit: 1, q }) : Promise.resolve(null),
      ])
    : null

  const totals: Array<{ source: DirectorySource; total: number }> = [
    { source: 'materials', total: filtered ? filtered[0].total : materials.total },
    { source: 'equipment', total: filtered ? filtered[1].total : equipment.total },
  ]
  if (input.includeWorkers) {
    totals.push({
      source: 'workers',
      total: filtered ? (filtered[2]?.meta.total ?? 0) : (workers?.meta.total ?? 0),
    })
  }

  const pageStart = (input.page - 1) * PAGE_SIZE
  const combinedTotal = totals.reduce((sum, entry) => sum + entry.total, 0)
  if (!q && input.page === 1 && materials.total >= PAGE_SIZE) {
    return { stats, items: materials.items.slice(0, PAGE_SIZE), total: combinedTotal }
  }

  const plan = directoryWindows(totals, pageStart, PAGE_SIZE)
  const chunks = await Promise.all(
    plan.map(async (window) => {
      if (!q && input.page === 1 && window.source === 'materials') {
        return materials.items.slice(window.skip, window.skip + window.take)
      }
      if (window.source === 'workers') {
        const users = await readPageWindow(
          async (page, limit) => (await listVerifications({ page, limit, q })).data,
          window.skip,
          window.take,
        )
        return users.map(workerItem)
      }
      const type: ListingType = window.source === 'materials' ? 'MATERIAL' : 'EQUIPMENT'
      const listings = await readPageWindow(
        async (page, limit) =>
          (await listListings(page, limit, { type, status: 'ACTIVE', q, counts: false })).data,
        window.skip,
        window.take,
      )
      return listings.map((row) => listingItem(row, locale))
    }),
  )
  return { stats, items: chunks.flat(), total: combinedTotal }
}

function DirectoryCards({ items }: { items: DirectoryItem[] }) {
  const { t } = useTranslation('admin')
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('directory.noMatch')}</p>
  }

  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item, index) => (
        <Card key={`${item.kind}-${item.id}`} size="sm" className="min-w-0 overflow-hidden pt-0">
          <CivilCardMedia variant={index} className="h-44" />
          <CardHeader className="min-w-0">
            <CardTitle className="truncate" title={item.name}>
              {ellipsis(item.name, 36)}
            </CardTitle>
            <CardDescription className="truncate" title={item.location}>
              {ellipsis(item.location, 32)}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-w-0 flex-wrap items-center gap-2">
            <Badge variant="outline">{ellipsis(item.category, 16)}</Badge>
            <span className="truncate text-xs text-muted-foreground">
              {ellipsis(item.source, 22)}
            </span>
            <span className="text-xs font-medium text-primary">{item.price}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function DirectoryPage() {
  const { t } = useTranslation(['admin', 'common'])
  useDocumentTitle(t('admin:directory.documentTitle'))
  const locale = useLocaleStore((state) => state.locale)
  const location = useLocation()
  const includeWorkers = !location.pathname.startsWith('/pm')
  const { query, setQuery, debouncedQuery, page, setPage } = usePagedQuery()
  const [kind, setKind] = useState<DirectoryFilter>('all')

  const kinds: Array<{ value: DirectoryFilter; label: string }> = includeWorkers
    ? [
        { value: 'all', label: t('admin:directory.all') },
        { value: 'material', label: t('admin:directory.materials') },
        { value: 'equipment', label: t('admin:directory.equipment') },
        { value: 'worker', label: t('admin:directory.workers') },
      ]
    : [
        { value: 'all', label: t('admin:directory.all') },
        { value: 'material', label: t('admin:directory.materials') },
        { value: 'equipment', label: t('admin:directory.equipment') },
      ]
  const activeKind = kinds.some((tab) => tab.value === kind) ? kind : 'all'

  const [heldStats, setHeldStats] = useState<DirectoryStats | null>(null)

  const load = useCallback(
    () => loadDirectory({ page, query: debouncedQuery, kind: activeKind, includeWorkers, locale }),
    [activeKind, debouncedQuery, includeWorkers, locale, page],
  )
  const remote = useRemoteData(load, {
    queryKey: ['directory', includeWorkers, activeKind, page, debouncedQuery, locale],
  })

  if (remote.status === 'success' && heldStats !== remote.data.stats) {
    setHeldStats(remote.data.stats)
  }

  const stats = remote.status === 'success' ? remote.data.stats : heldStats
  const items = remote.status === 'success' ? remote.data.items : []
  const total = remote.status === 'success' ? remote.data.total : 0

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title={t('admin:directory.title')}
        description={
          includeWorkers
            ? 'Active materials and equipment from listings, plus worker accounts. Directory-only — no checkout.'
            : 'Active materials and equipment from listings. Directory-only — no checkout.'
        }
      />

      {stats ? (
        <div className={STAT_GRID_CLASS}>
          <StatCard
            icon={Layers}
            label={t('admin:directory.title')}
            value={stats.materials + stats.equipment + stats.workers}
          />
          <StatCard icon={Box} label={t('admin:directory.materials')} value={stats.materials} />
          <StatCard icon={Wrench} label={t('admin:directory.equipment')} value={stats.equipment} />
          {includeWorkers ? (
            <StatCard icon={HardHat} label={t('admin:directory.workers')} value={stats.workers} />
          ) : null}
        </div>
      ) : remote.isLoading ? (
        <StatGridSkeleton count={includeWorkers ? 4 : 3} />
      ) : null}

      <Tabs
        value={activeKind}
        onValueChange={(value) => {
          if (
            value === 'all' ||
            value === 'material' ||
            value === 'equipment' ||
            value === 'worker'
          ) {
            setKind(value)
            setPage(1)
          }
        }}
        className="min-w-0 gap-3"
      >
        <ToolbarCard>
          <TabsList>
            {kinds.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('admin:directory.filterPlaceholder')}
            aria-label={t('admin:directory.filterAria')}
            className="max-w-sm"
          />
        </ToolbarCard>
        <TabsContent value={activeKind}>
          <AsyncState
            isLoading={remote.isLoading}
            error={remote.isError ? remote.error : undefined}
            onRetry={() => void remote.refetch()}
            loadingFallback={
              <CardGridSkeleton className="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />
            }
          >
            <DirectoryCards items={items} />
            <TablePager
              page={page}
              totalPages={pageCount(total)}
              total={total}
              onPageChange={setPage}
            />
          </AsyncState>
        </TabsContent>
      </Tabs>
    </div>
  )
}
