import { Box, HardHat, Layers, Wrench } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { AsyncState } from '@/components/feedback/async-state'
import { CardGridSkeleton, CivilCardMedia, StatGridSkeleton } from '@/components/feedback/skeletons'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useRemoteData } from '@/hooks/useRemoteData'
import { listListings, type Listing, type ListingType } from '@/services/listings'
import { listVerifications, type User } from '@/services/users'

import type { DirectoryItem, DirectoryKind } from './admin.types'
import { ToolbarCard } from './components/DataPanel'
import { STAT_GRID_CLASS, StatCard } from './components/StatCard'
import { ellipsis } from './lib/text'

const PAGE_LIMIT = 100

type DirectoryPayload = {
  items: DirectoryItem[]
  materials: number
  equipment: number
  workers: number
  includeWorkers: boolean
}

async function allActiveListings(type: Extract<ListingType, 'MATERIAL' | 'EQUIPMENT'>): Promise<{
  items: Listing[]
  total: number
}> {
  const first = await listListings(1, PAGE_LIMIT, { type, status: 'ACTIVE' })
  const totalPages = Math.max(1, Math.ceil(first.meta.total / PAGE_LIMIT))
  if (totalPages <= 1) return { items: first.data, total: first.meta.total }
  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      listListings(index + 2, PAGE_LIMIT, { type, status: 'ACTIVE' }),
    ),
  )
  return { items: [first.data, ...rest.map((page) => page.data)].flat(), total: first.meta.total }
}

async function allWorkers(): Promise<{ users: User[]; total: number }> {
  const first = await listVerifications({ page: 1, limit: PAGE_LIMIT })
  if (first.meta.totalPages <= 1) return { users: first.data, total: first.meta.counts.workers }
  const rest = await Promise.all(
    Array.from({ length: first.meta.totalPages - 1 }, (_, index) =>
      listVerifications({ page: index + 2, limit: PAGE_LIMIT }),
    ),
  )
  return {
    users: [first.data, ...rest.map((page) => page.data)].flat(),
    total: first.meta.counts.workers,
  }
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
  const status = user.verificationStatus === 'VERIFIED' ? 'Verified' : user.verificationStatus === 'REQUESTED' ? 'Requested' : 'Unverified'
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
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<DirectoryKind | 'all'>('all')

  const load = useCallback(async (): Promise<DirectoryPayload> => {
    const [materials, equipment, workers] = await Promise.all([
      allActiveListings('MATERIAL'),
      allActiveListings('EQUIPMENT'),
      includeWorkers ? allWorkers() : Promise.resolve(null),
    ])
    return {
      includeWorkers,
      materials: materials.total,
      equipment: equipment.total,
      workers: workers?.total ?? 0,
      items: [
        ...materials.items.map(listingItem),
        ...equipment.items.map(listingItem),
        ...(workers?.users.map(workerItem) ?? []),
      ],
    }
  }, [includeWorkers])
  const remote = useRemoteData(load)

  const catalog = remote.status === 'success' ? remote.data : null
  const kinds: Array<{ value: DirectoryKind | 'all'; label: string }> = catalog?.includeWorkers
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

  const visible = useMemo(() => {
    const items = catalog?.items ?? []
    const q = query.trim().toLowerCase()
    return items.filter((item) => {
      if (activeKind !== 'all' && item.kind !== activeKind) return false
      if (!q) return true
      return [item.name, item.category, item.location, item.source, item.kind].join(' ').toLowerCase().includes(q)
    })
  }, [activeKind, catalog, query])

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

      {catalog ? (
        <div className={STAT_GRID_CLASS}>
          <StatCard icon={Layers} label="Items" value={catalog.materials + catalog.equipment + catalog.workers} />
          <StatCard icon={Box} label="Materials" value={catalog.materials} />
          <StatCard icon={Wrench} label="Equipment" value={catalog.equipment} />
          {catalog.includeWorkers ? <StatCard icon={HardHat} label="Workers" value={catalog.workers} /> : null}
        </div>
      ) : remote.isLoading ? (
        <StatGridSkeleton count={includeWorkers ? 4 : 3} />
      ) : null}

      <Tabs
        value={activeKind}
        onValueChange={(value) => {
          if (value === 'all' || value === 'material' || value === 'equipment' || value === 'worker') {
            setKind(value)
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
            <DirectoryCards items={visible} />
          </AsyncState>
        </TabsContent>
      </Tabs>
    </div>
  )
}
