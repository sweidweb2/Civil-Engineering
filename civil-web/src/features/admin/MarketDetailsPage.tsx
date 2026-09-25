import { useLocation, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { portalBaseFromPath } from '@/lib/homePath'

import { ellipsis } from './lib/text'
import { findProviderShopById } from './mock-data'

export function MarketDetailsPage() {
  const { providerId } = useParams<{ providerId: string }>()
  const location = useLocation()
  const providersPath = `${portalBaseFromPath(location.pathname)}/providers`
  const shop = providerId ? findProviderShopById(providerId) : undefined
  useDocumentTitle(shop ? ellipsis(shop.name, 24) : 'Market details')

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        breadcrumbs={[
          { label: 'Providers', to: providersPath },
          { label: shop?.name ?? 'Market details' },
        ]}
      />
      <Card size="sm" className="min-w-0">
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {shop
              ? `${shop.location} · ${shop.category} · ${shop.listingCount} listings. Full market UI will land later.`
              : 'Provider not found in mock data.'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
