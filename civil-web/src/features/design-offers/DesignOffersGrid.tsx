import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { AsyncState } from '@/components/feedback/async-state'
import { CardGridSkeleton } from '@/components/feedback/skeletons'
import { TablePager } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useRemoteData } from '@/hooks/useRemoteData'
import { PAGE_SIZE, pageCount } from '@/lib/text'
import { formatOfferPrice, listDesignOffers, type DesignOffer } from '@/services/design-offers'

type DesignOffersGridProps = {
  mode: 'admin' | 'pm'
  onSelect?: (offer: DesignOffer) => void
}

/** Shared two-column-ish card grid for admin manage + PM browse. */
export function DesignOffersGrid({ mode, onSelect }: DesignOffersGridProps) {
  const { t } = useTranslation(['designOffers', 'common'])
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [applied, setApplied] = useState('')

  const load = useCallback(
    () =>
      listDesignOffers({
        page,
        limit: PAGE_SIZE,
        q: applied || undefined,
        activeOnly: mode === 'pm' ? true : undefined,
      }),
    [page, applied, mode],
  )

  const remote = useRemoteData(load, {
    queryKey: ['design-offers', mode, page, applied],
  })

  const rows = remote.status === 'success' ? remote.data.data : []
  const total = remote.status === 'success' ? remote.data.meta.total : 0

  return (
    <div className="space-y-4">
      <Input
        value={q}
        placeholder={t('designOffers:search')}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            setPage(1)
            setApplied(q.trim())
          }
        }}
        className="max-w-sm"
      />

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<CardGridSkeleton count={6} />}
      >
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('designOffers:empty')}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((offer) => (
              <button
                key={offer.id}
                type="button"
                className="overflow-hidden rounded-xl border bg-card text-start transition hover:border-foreground/30"
                onClick={() => {
                  if (onSelect) {
                    onSelect(offer)
                    return
                  }
                  if (mode === 'admin') {
                    navigate(`/admin/design-offers/${offer.id}`)
                    return
                  }
                  navigate(`/pm/design-requests/new?designOfferId=${offer.id}`)
                }}
              >
                <div className="aspect-[4/3] bg-muted">
                  {offer.imageUrl ? (
                    <img src={offer.imageUrl} alt="" className="size-full object-cover" />
                  ) : null}
                </div>
                <div className="space-y-1 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium leading-snug">{offer.title}</p>
                    {mode === 'admin' && !offer.isActive ? (
                      <Badge variant="secondary">{t('designOffers:inactive')}</Badge>
                    ) : null}
                  </div>
                  <p className="text-sm font-semibold text-primary">{formatOfferPrice(offer)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </AsyncState>

      <TablePager
        page={page}
        totalPages={pageCount(total, PAGE_SIZE)}
        total={total}
        onPageChange={setPage}
      />
    </div>
  )
}
