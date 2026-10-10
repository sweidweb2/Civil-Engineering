import { Pencil } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'

import { AsyncState } from '@/components/feedback/async-state'
import { DetailCardSkeleton } from '@/components/feedback/skeletons'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useRemoteData } from '@/hooks/useRemoteData'
import { portalBaseFromPath } from '@/lib/homePath'
import { getProvider, providerStatusLabel, type Provider } from '@/services/providers'

import { formFromProvider, ProviderFormDialog } from './components/ProviderFormDialog'
import { formatWhen } from './lib/text'
import { ListingsBrowser } from './ListingsPage'

function formatCoord(value: number | null) {
  return value == null ? '—' : String(value)
}

function providerFields(provider: Provider): Array<{ label: string; value: string }> {
  return [
    { label: 'Owner', value: provider.owner.displayName || provider.owner.email },
    { label: 'Owner email', value: provider.owner.email },
    { label: 'Name', value: provider.name },
    { label: 'Description', value: provider.description ?? '—' },
    { label: 'Status', value: providerStatusLabel(provider.status) },
    { label: 'Logo', value: provider.logoUrl ?? '—' },
    { label: 'Phone', value: provider.phone ?? '—' },
    { label: 'WhatsApp', value: provider.whatsapp ?? '—' },
    { label: 'Email', value: provider.email ?? '—' },
    { label: 'Website', value: provider.website ?? '—' },
    { label: 'Address', value: provider.address ?? '—' },
    { label: 'City', value: provider.city ?? '—' },
    { label: 'Country', value: provider.country ?? '—' },
    { label: 'Latitude', value: formatCoord(provider.lat) },
    { label: 'Longitude', value: formatCoord(provider.lng) },
    { label: 'Created', value: formatWhen(provider.createdAt) },
    { label: 'Updated', value: formatWhen(provider.updatedAt) },
  ]
}

export function MarketDetailsPage() {
  const { providerId } = useParams<{ providerId: string }>()
  const location = useLocation()
  const providersPath = `${portalBaseFromPath(location.pathname)}/providers`
  const [editOpen, setEditOpen] = useState(false)
  const [updated, setUpdated] = useState<Provider | null>(null)

  const load = useCallback(async () => {
    if (!providerId) throw new Error('Missing provider id')
    const result = await getProvider(providerId)
    return result.data
  }, [providerId])
  const remote = useRemoteData(load, { enabled: Boolean(providerId) })
  const provider = updated ?? (remote.status === 'success' ? remote.data : undefined)
  useDocumentTitle(provider ? provider.name : 'Provider details')

  const breadcrumbs = [
    { label: 'Providers', to: providersPath },
    { label: provider?.name ?? 'Provider details' },
  ]

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        breadcrumbs={breadcrumbs}
        actions={
          provider ? (
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label={`Edit ${provider.name}`}
              onClick={() => setEditOpen(true)}
            >
              <Pencil />
            </Button>
          ) : null
        }
      />

      <AsyncState
        isLoading={remote.isLoading && !provider}
        error={!provider && remote.isError ? remote.error : undefined}
        onRetry={() => {
          setUpdated(null)
          void remote.refetch()
        }}
        loadingFallback={<DetailCardSkeleton />}
      >
        {provider ? (
          <Card size="sm" className="min-w-0 gap-0 overflow-hidden py-0">
            <CardContent className="p-0">
              <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5">
                <p className="truncate text-sm font-medium">{provider.name}</p>
                <Badge variant={provider.status === 'APPROVED' ? 'default' : 'outline'}>
                  {providerStatusLabel(provider.status)}
                </Badge>
              </div>
              <dl className="grid min-w-0 sm:grid-cols-2">
                {providerFields(provider).map((field) => (
                  <div
                    key={field.label}
                    className="grid min-w-0 grid-cols-[minmax(0,8rem)_minmax(0,1fr)] border-b border-border sm:odd:border-r"
                  >
                    <dt className="bg-muted/50 px-3 py-2.5 text-xs font-medium text-muted-foreground">
                      {field.label}
                    </dt>
                    <dd className="break-all px-3 py-2.5 text-sm text-foreground">{field.value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ) : (
          <Card size="sm" className="min-w-0">
            <CardContent>
              <p className="text-sm text-muted-foreground">Provider not found.</p>
            </CardContent>
          </Card>
        )}
      </AsyncState>

      {provider ? <ListingsBrowser providerId={provider.id} /> : null}

      {provider ? (
        <ProviderFormDialog
          open={editOpen}
          mode="edit"
          providerId={provider.id}
          initial={formFromProvider(provider)}
          ownerLabel={provider.owner.displayName || provider.owner.email}
          onOpenChange={setEditOpen}
          onSaved={(saved) => {
            setUpdated(saved)
            void remote.refetch()
          }}
        />
      ) : null}
    </div>
  )
}
