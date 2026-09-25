import { CheckCircle2, Package, Store } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

import { StatusBadge } from './components/UserCells'
import { ToolbarCard } from './components/DataPanel'
import { STAT_GRID_CLASS, StatCard } from './components/StatCard'
import { ellipsis } from './lib/text'
import { MOCK_PROVIDER_SHOPS } from './mock-data'

export function ManageProvidersPage() {
  useDocumentTitle('Manage providers')
  const [query, setQuery] = useState('')

  const shops = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return MOCK_PROVIDER_SHOPS
    return MOCK_PROVIDER_SHOPS.filter((shop) =>
      [shop.name, shop.location, shop.category, shop.status].join(' ').toLowerCase().includes(q),
    )
  }, [query])

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title="Manage providers"
        description="Directory shops. Open a card to view market details."
      />

      <div className={STAT_GRID_CLASS}>
        <StatCard icon={Store} label="Providers" value={MOCK_PROVIDER_SHOPS.length} />
        <StatCard
          icon={CheckCircle2}
          label="Active"
          value={MOCK_PROVIDER_SHOPS.filter((s) => s.status === 'ACTIVE').length}
        />
        <StatCard
          icon={Package}
          label="Listings"
          value={MOCK_PROVIDER_SHOPS.reduce((sum, shop) => sum + shop.listingCount, 0)}
        />
      </div>

      <ToolbarCard>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter shops…"
          aria-label="Filter providers"
          className="max-w-sm"
        />
      </ToolbarCard>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shops.length === 0 ? (
          <p className="text-sm text-muted-foreground">No providers match.</p>
        ) : (
          shops.map((shop) => (
            <Link key={shop.id} to={`/admin/providers/${shop.id}`} className="min-w-0">
              <Card size="sm" className="h-full cursor-pointer transition-colors hover:bg-muted/40 hover:ring-primary/30">
                <CardHeader className="min-w-0">
                  <div className="mb-1 flex h-16 items-end rounded-lg bg-muted px-3 py-2">
                    <span className="text-xs text-muted-foreground">Shop</span>
                  </div>
                  <CardTitle className="truncate" title={shop.name}>
                    {ellipsis(shop.name, 36)}
                  </CardTitle>
                  <CardDescription className="truncate" title={shop.location}>
                    {ellipsis(shop.location, 32)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex min-w-0 flex-wrap items-center gap-2">
                  <Badge variant="outline">{ellipsis(shop.category, 16)}</Badge>
                  <StatusBadge status={shop.status} />
                  <span className="text-xs text-muted-foreground">{shop.listingCount} listings</span>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
