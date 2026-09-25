import { Box, HardHat, Layers, Wrench } from 'lucide-react'
import { useMemo, useState } from 'react'

import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

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
      {items.map((item) => (
        <Card key={item.id} size="sm" className="min-w-0">
          <CardHeader className="min-w-0">
            <div className="mb-1 flex h-16 items-end rounded-lg bg-muted px-3 py-2">
              <span className="text-xs capitalize text-muted-foreground">{item.kind}</span>
            </div>
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

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return MOCK_DIRECTORY.filter((item) => {
      if (kind !== 'all' && item.kind !== kind) return false
      if (!q) return true
      return [item.name, item.category, item.location, item.source, item.kind]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [kind, query])

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Directory"
        description="Materials, equipment, and workers. Directory-only — no checkout."
      />

      <div className={STAT_GRID_CLASS}>
        <StatCard icon={Layers} label="Items" value={MOCK_DIRECTORY.length} />
        <StatCard
          icon={Box}
          label="Materials"
          value={MOCK_DIRECTORY.filter((item) => item.kind === 'material').length}
        />
        <StatCard
          icon={Wrench}
          label="Equipment"
          value={MOCK_DIRECTORY.filter((item) => item.kind === 'equipment').length}
        />
        <StatCard
          icon={HardHat}
          label="Workers"
          value={MOCK_DIRECTORY.filter((item) => item.kind === 'worker').length}
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
          <DirectoryCards items={visible} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
