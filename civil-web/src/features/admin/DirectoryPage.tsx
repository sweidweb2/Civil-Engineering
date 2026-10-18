import { useCallback, useState } from 'react'
import { Box, HardHat, Layers, Wrench } from 'lucide-react'
import { useLocation } from 'react-router-dom'

import { AsyncState } from '@/components/feedback/async-state'
import { CardGridSkeleton, CivilCardMedia, StatGridSkeleton } from '@/components/feedback/skeletons'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { usePagedSearch } from '@/hooks/usePagedSearch'
import { useRemoteData } from '@/hooks/useRemoteData'
import { type Listing, type ListingType,listListings } from '@/services/listings'
import { listVerifications, type User } from '@/services/users'

import type { DirectoryItem, DirectoryKind } from './admin.types'
import { ToolbarCard } from './components/DataPanel'
import { STAT_GRID_CLASS, StatCard } from './components/StatCard'
import { TablePager } from './components/TablePager'
import { directoryWindows, readPageWindow } from './lib/directory-page'
import { ellipsis, PAGE_SIZE, pageCount } from './lib/text'

type DirectorySource = 'materials' | 'equipment' | 'workers'
type DirectoryFilter = DirectoryKind | 'all'

type DirectoryStats = {
  materials: number
  equipment: number
  workers: number
}

function personName(user: User): string {
  const profile = user.profile
  const named = profile?.displayName?.trim() || [profile?.firstName, profile?.lastName].filter(Boolean).join(' ')
  return named || user.email
}

function listingItem(listing: Listing): DirectoryItem {
  return {
    id: listing.id,
    name: listing.name,
    kind: listing.type === 'EQUIPMENT' ? 'equipment' : 'material',
    category: listing.categoryName,
    location: listing.providerName,
    source: listing.providerName,
    price: `${listing.currency} ${listing.price} / ${listing.unit}`,
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

async function loadDirectoryStats(includeWorkers: boolean): Promise<DirectoryStats> {
  const [materials, equipment, workers] = await Promise.all([
    listListings(1, 1, { type: 'MATERIAL', status: 'ACTIVE' }),
    listListings(1, 1, { type: 'EQUIPMENT', status: 'ACTIVE' }),
    includeWorkers ? listVerifications({ page: 1, limit: 1 }) : Promise.resolve(null),
  ])
  return {
    materials: materials.meta.total,
    equipment: equipment.meta.total,
    workers: workers?.meta.counts.workers ?? 0,
  }
}

async function loadDirectoryPage(input: {
  page: number
  query: string
  kind: DirectoryFilter
  includeWorkers: boolean
}): Promise<{ items: DirectoryItem[]; total: number }> {
  const q = input.query || undefined
  if (input.kind === 'material' || input.kind === 'equipment') {
    const type: ListingType = input.kind === 'material' ? 'MATERIAL' : 'EQUIPMENT'
    const result = await listListings(input.page, PAGE_SIZE, { type, status: 'ACTIVE', q })
    return { items: result.data.map(listingItem), total: result.meta.total }
  }
  if (input.kind === 'worker') {
    const result = await listVerifications({ page: input.page, limit: PAGE_SIZE, q })
    return { items: result.data.map(workerItem), total: result.meta.total }
  }

  const [materials, equipment, workers] = await Promise.all([
    listListings(1, 1, { type: 'MATERIAL', status: 'ACTIVE', q }),
    listListings(1, 1, { type: 'EQUIPMENT', status: 'ACTIVE', q }),
    input.includeWorkers ? listVerifications({ page: 1, limit: 1, q }) : Promise.resolve(null),
  ])
  const totals: Array<{ source: DirectorySource; total: number }> = [
    { source: 'materials', total: materials.meta.total },
    { source: 'equipment', total: equipment.meta.total },
  ]
  if (workers) totals.push({ source: 'workers', total: workers.meta.total })
  const plan = directoryWindows(totals, (input.page - 1) * PAGE_SIZE, PAGE_SIZE)
  const chunks = await Promise.all(
    plan.map(async (window) => {
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
        async (page, limit) => (await listListings(page, limit, { type, status: 'ACTIVE', q })).data,
        window.skip,
        window.take,
      )
      return listings.map(listingItem)
    }),
  )
  return {
    items: chunks.flat(),
    total: totals.reduce((sum, entry) => sum + entry.total, 0),
  }
}

function DirectoryCards({ items }: { items: DirectoryItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No directory items match.</p>
  }

  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item, index) => (
        <Card key={`${item.kind}-${item.id}`} size="sm" className="min-w-0 overflow-hidden pt-0">
          <CivilCardMedia variant={index} />
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
            <span className="truncate text-xs text-muted-foreground">{ellipsis(item.source, 22)}</span>
            <span className="text-xs font-medium text-primary">{item.price}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function DirectoryPage() {
  useDocumentTitle('Directory')
  const location = useLocation()
  const includeWorkers = !location.pathname.startsWith('/pm')
  const { query, setQuery, debouncedQuery, page, setPage } = usePagedSearch()
  const [kind, setKind] = useState<DirectoryFilter>('all')

  const kinds: Array<{ value: DirectoryFilter; label: string }> = includeWorkers
    ? [
        { value: 'all', label: 'All' },
        { value: 'material', label: 'Materials' },
        { value: 'equipment', label: 'Equipment' },
        { value: 'worker', label: 'Workers' },
      ]
    : [
        { value: 'all', label: 'All' },
        { value: 'material', label: 'Materials' },
        { value: 'equipment', label: 'Equipment' },
      ]
  const activeKind = kinds.some((tab) => tab.value === kind) ? kind : 'all'

  const loadStats = useCallback(() => loadDirectoryStats(includeWorkers), [includeWorkers])
  const statsRemote = useRemoteData(loadStats, { queryKey: ['directory', 'stats', includeWorkers] })
  const loadPage = useCallback(
    () => loadDirectoryPage({ page, query: debouncedQuery, kind: activeKind, includeWorkers }),
    [activeKind, debouncedQuery, includeWorkers, page],
  )
  const remote = useRemoteData(loadPage, {
    queryKey: ['directory', 'page', includeWorkers, activeKind, page, debouncedQuery],
  })

  const stats = statsRemote.status === 'success' ? statsRemote.data : null
  const items = remote.status === 'success' ? remote.data.items : []
  const total = remote.status === 'success' ? remote.data.total : 0

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Directory"
        description={
          includeWorkers
            ? 'Active materials and equipment from listings, plus worker accounts. Directory-only — no checkout.'
            : 'Active materials and equipment from listings. Directory-only — no checkout.'
        }
      />

      {stats ? (
        <div className={STAT_GRID_CLASS}>
          <StatCard icon={Layers} label="Items" value={stats.materials + stats.equipment + stats.workers} />
          <StatCard icon={Box} label="Materials" value={stats.materials} />
          <StatCard icon={Wrench} label="Equipment" value={stats.equipment} />
          {includeWorkers ? <StatCard icon={HardHat} label="Workers" value={stats.workers} /> : null}
        </div>
      ) : statsRemote.isLoading ? (
        <StatGridSkeleton count={includeWorkers ? 4 : 3} />
      ) : null}

      <Tabs
        value={activeKind}
        onValueChange={(value) => {
          if (value === 'all' || value === 'material' || value === 'equipment' || value === 'worker') {
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
            placeholder="Filter directory…"
            aria-label="Filter directory"
            className="max-w-sm"
          />
        </ToolbarCard>
        <TabsContent value={activeKind}>
          <AsyncState
            isLoading={remote.isLoading}
            error={remote.isError ? remote.error : undefined}
            onRetry={() => void remote.refetch()}
            loadingFallback={<CardGridSkeleton />}
          >
            <DirectoryCards items={items} />
            <TablePager page={page} totalPages={pageCount(total)} total={total} onPageChange={setPage} />
          </AsyncState>
        </TabsContent>
      </Tabs>
    </div>
  )
}
