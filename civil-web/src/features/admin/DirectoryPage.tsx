import { Box, HardHat, Layers, Wrench } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import { AsyncState } from '@/components/feedback/async-state'
import { CardGridSkeleton, CivilCardMedia } from '@/components/feedback/skeletons'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useRemoteData } from '@/hooks/useRemoteData'

import type { DirectoryItem, DirectoryKind } from './admin.types'
import { ToolbarCard } from './components/DataPanel'
import { STAT_GRID_CLASS, StatCard } from './components/StatCard'
import { ellipsis } from './lib/text'
import { MOCK_DIRECTORY } from './mock-data'

const KINDS: Array<{ value: DirectoryKind | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'material', label: 'Materials' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'worker', label: 'Workers' },
]

function DirectoryCards({ items }: { items: DirectoryItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No directory items match.</p>
  }

  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item, index) => (
        <Card key={item.id} size="sm" className="min-w-0 overflow-hidden pt-0">
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
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<DirectoryKind | 'all'>('all')

  const load = useCallback(async () => {
    // Mock latency so CardGridSkeleton is visible (replace when API is wired).
    await new Promise((resolve) => window.setTimeout(resolve, 600))
    return MOCK_DIRECTORY
  }, [])
  const remote = useRemoteData(load)

  const catalog = remote.status === 'success' ? remote.data : []

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return catalog.filter((item) => {
      if (kind !== 'all' && item.kind !== kind) return false
      if (!q) return true
      return [item.name, item.category, item.location, item.source, item.kind]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [catalog, kind, query])

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Directory"
        description="Materials, equipment, and workers. Directory-only — no checkout."
      />

      <div className={STAT_GRID_CLASS}>
        <StatCard icon={Layers} label="Items" value={catalog.length} />
        <StatCard
          icon={Box}
          label="Materials"
          value={catalog.filter((item) => item.kind === 'material').length}
        />
        <StatCard
          icon={Wrench}
          label="Equipment"
          value={catalog.filter((item) => item.kind === 'equipment').length}
        />
        <StatCard
          icon={HardHat}
          label="Workers"
          value={catalog.filter((item) => item.kind === 'worker').length}
        />
      </div>

      <Tabs
        value={kind}
        onValueChange={(value) => {
          if (value === 'all' || value === 'material' || value === 'equipment' || value === 'worker') {
            setKind(value)
          }
        }}
        className="min-w-0 gap-3"
      >
        <ToolbarCard>
          <TabsList>
            {KINDS.map((tab) => (
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
        <TabsContent value={kind}>
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
