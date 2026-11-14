import { useCallback, useState } from 'react'
import { Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
import { getProvider, type Provider } from '@/services/providers'

import { formFromProvider, ProviderFormDialog } from './components/ProviderFormDialog'
import { formatWhen } from './lib/text'
import { ListingsBrowser } from './ListingsPage'

function formatCoord(value: number | null) {
  return value == null ? '—' : String(value)
}

export function MarketDetailsPage() {
  const { t } = useTranslation(['admin', 'common'])
  const { providerId } = useParams<{ providerId: string }>()
  const location = useLocation()
  const providersPath = `${portalBaseFromPath(location.pathname)}/providers`
  const [editOpen, setEditOpen] = useState(false)
  const [updated, setUpdated] = useState<Provider | null>(null)

  const load = useCallback(async () => {
    if (!providerId) throw new Error(t('admin:markets.notFound'))
    const result = await getProvider(providerId)
    return result.data
  }, [providerId, t])
  const remote = useRemoteData(load, {
    enabled: Boolean(providerId),
    queryKey: ['providers', 'detail', providerId ?? ''],
  })
  const provider = updated ?? (remote.status === 'success' ? remote.data : undefined)
  useDocumentTitle(provider ? provider.name : t('admin:markets.providerDetails'))

  const breadcrumbs = [
    { label: t('admin:markets.providers'), to: providersPath },
    { label: provider?.name ?? t('admin:markets.providerDetails') },
  ]

  const fields = provider
    ? [
        {
          label: t('admin:markets.fields.owner'),
          value:
            provider.owner?.displayName ||
            provider.owner?.email ||
            t('admin:providers.form.noOwner'),
        },
        { label: t('admin:markets.fields.ownerEmail'), value: provider.owner?.email ?? '—' },
        { label: t('admin:markets.fields.name'), value: provider.name },
        { label: t('admin:markets.fields.description'), value: provider.description ?? '—' },
        {
          label: t('admin:markets.fields.status'),
          value: t(`admin:providerStatus.${provider.status}`),
        },
        { label: t('admin:markets.fields.logo'), value: provider.logoUrl ?? '—' },
        { label: t('admin:markets.fields.phone'), value: provider.phone ?? '—' },
        { label: t('admin:markets.fields.whatsapp'), value: provider.whatsapp ?? '—' },
        { label: t('admin:markets.fields.email'), value: provider.email ?? '—' },
        { label: t('admin:markets.fields.website'), value: provider.website ?? '—' },
        { label: t('admin:markets.fields.address'), value: provider.address ?? '—' },
        { label: t('admin:markets.fields.city'), value: provider.city ?? '—' },
        { label: t('admin:markets.fields.country'), value: provider.country ?? '—' },
        { label: t('admin:markets.fields.latitude'), value: formatCoord(provider.lat) },
        { label: t('admin:markets.fields.longitude'), value: formatCoord(provider.lng) },
        { label: t('admin:markets.fields.created'), value: formatWhen(provider.createdAt) },
        { label: t('admin:markets.fields.updated'), value: formatWhen(provider.updatedAt) },
      ]
    : []

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
                  {t(`admin:providerStatus.${provider.status}`)}
                </Badge>
              </div>
              <dl className="grid min-w-0 sm:grid-cols-2">
                {fields.map((field) => (
                  <div
                    key={field.label}
                    className="grid min-w-0 grid-cols-[minmax(0,8rem)_minmax(0,1fr)] border-b border-border sm:odd:border-e"
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
              <p className="text-sm text-muted-foreground">{t('admin:markets.notFound')}</p>
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
          ownerLabel={
            provider.owner?.displayName ||
            provider.owner?.email ||
            t('admin:providers.form.noOwner')
          }
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
