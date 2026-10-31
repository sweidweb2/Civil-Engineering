import { useCallback, useMemo } from 'react'
import { ArrowRight, MapPin, Package } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { AsyncState } from '@/components/feedback/async-state'
import { ContentSkeleton } from '@/components/feedback/skeletons'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { useLocaleFormat } from '@/hooks/useLocaleFormat'
import { useRemoteData } from '@/hooks/useRemoteData'
import { cn } from '@/lib/utils'
import { type Listing, listListings } from '@/services/listings'
import { getMyProvider, type Provider } from '@/services/providers'

type StepStatus = 'todo' | 'needs_input' | 'pending' | 'done'

type FocusStep = {
  id: string
  title: string
  description: string
  status: StepStatus
}

function shortListingCode(id: string) {
  return `LS-${id.slice(-4).toUpperCase()}`
}

function formatPrice(
  listing: Listing,
  formatNumber: (n: number, o?: Intl.NumberFormatOptions) => string,
) {
  const currency = listing.currency?.trim() || ''
  const unit = listing.unit?.trim()
  const suffix = unit ? `/${unit}` : ''
  if (listing.price != null && listing.price !== '') {
    const amount = Number.parseFloat(listing.price)
    const price = Number.isFinite(amount)
      ? formatNumber(amount, { maximumFractionDigits: 2 })
      : listing.price
    return `${currency} ${price}${suffix}`.trim()
  }
  if (listing.priceMin != null && listing.priceMax != null) {
    const min = Number.parseFloat(listing.priceMin)
    const max = Number.parseFloat(listing.priceMax)
    const minLabel = Number.isFinite(min)
      ? formatNumber(min, { maximumFractionDigits: 2 })
      : listing.priceMin
    const maxLabel = Number.isFinite(max)
      ? formatNumber(max, { maximumFractionDigits: 2 })
      : listing.priceMax
    return `${currency} ${minLabel}–${maxLabel}${suffix}`.trim()
  }
  return '—'
}

function pickFocusListing(listings: Listing[]): Listing | null {
  if (listings.length === 0) return null
  const inactive = listings.find((item) => item.status === 'INACTIVE')
  if (inactive) return inactive
  const missingDescription = listings.find(
    (item) => !item.description || item.description.trim().length < 20,
  )
  if (missingDescription) return missingDescription
  return (
    [...listings].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )[0] ?? null
  )
}

function profileIncomplete(provider: Provider) {
  return !provider.phone || !provider.city || !provider.description
}

function buildSteps(
  provider: Provider,
  listings: Listing[],
  focus: Listing | null,
  t: (key: string) => string,
): FocusStep[] {
  const profileDone = !profileIncomplete(provider)
  const hasActive = listings.some((item) => item.status === 'ACTIVE')
  const catalogReady = listings.length >= 3 && hasActive

  return [
    {
      id: 'profile',
      title: t('focus.steps.profileTitle'),
      description: t('focus.steps.profileDescription'),
      status: profileDone ? 'done' : 'todo',
    },
    {
      id: 'listing',
      title:
        focus?.status === 'INACTIVE'
          ? t('focus.steps.activateListingTitle')
          : t('focus.steps.publishListingTitle'),
      description:
        focus?.status === 'INACTIVE'
          ? t('focus.steps.activateListingDescription')
          : t('focus.steps.publishListingDescription'),
      status: hasActive ? 'done' : focus ? 'needs_input' : 'todo',
    },
    {
      id: 'catalog',
      title: t('focus.steps.catalogTitle'),
      description: t('focus.steps.catalogDescription'),
      status: catalogReady ? 'done' : hasActive ? 'pending' : 'pending',
    },
  ]
}

function recommendedAction(
  provider: Provider,
  focus: Listing | null,
  listings: Listing[],
  t: (key: string) => string,
) {
  if (!focus) {
    return {
      title: t('focus.actions.createFirstTitle'),
      description: t('focus.actions.createFirstDescription'),
      cta: t('focus.actions.createFirstCta'),
      href: '/provider/listings',
    }
  }
  if (focus.status === 'INACTIVE') {
    return {
      title: t('focus.actions.activateTitle'),
      description: t('focus.actions.activateDescription'),
      cta: t('focus.actions.activateCta'),
      href: '/provider/listings',
    }
  }
  if (!focus.description || focus.description.trim().length < 20) {
    return {
      title: t('focus.actions.improveTitle'),
      description: t('focus.actions.improveDescription'),
      cta: t('focus.actions.improveCta'),
      href: '/provider/listings',
    }
  }
  if (profileIncomplete(provider)) {
    return {
      title: t('focus.actions.shopTitle'),
      description: t('focus.actions.shopDescription'),
      cta: t('focus.actions.shopCta'),
      href: '/provider/listings',
    }
  }
  if (listings.length < 3) {
    return {
      title: t('focus.actions.expandTitle'),
      description: t('focus.actions.expandDescription'),
      cta: t('focus.actions.expandCta'),
      href: '/provider/listings',
    }
  }
  return {
    title: t('focus.actions.reviewTitle'),
    description: t('focus.actions.reviewDescription'),
    cta: t('focus.actions.reviewCta'),
    href: '/provider/listings',
  }
}

function statusBadgeClass(status: StepStatus) {
  if (status === 'done') return 'border-transparent bg-primary/10 text-primary'
  if (status === 'needs_input')
    return 'border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400'
  if (status === 'todo') return 'border-border bg-muted text-foreground'
  return 'border-border bg-muted/60 text-muted-foreground'
}

function statusLabel(status: StepStatus, t: (key: string) => string) {
  return t(`focus.status.${status}`)
}

function listingAttentionLabel(listing: Listing, t: (key: string) => string) {
  if (listing.status === 'INACTIVE') return t('focus.needsReview')
  if (!listing.description || listing.description.trim().length < 20) return t('focus.needsDetails')
  return t('focus.live')
}

export function ProviderFocusSection() {
  const { t } = useTranslation(['provider', 'admin'])
  const { formatNumber } = useLocaleFormat()
  const loadProvider = useCallback(() => getMyProvider(), [])
  const providerRemote = useRemoteData(loadProvider, { queryKey: ['providers', 'me', 'home'] })
  const provider = providerRemote.status === 'success' ? providerRemote.data.data : null

  const loadListings = useCallback(() => {
    if (!provider) return Promise.reject(new Error('Provider not loaded'))
    return listListings(1, 20, { providerId: provider.id, counts: false })
  }, [provider])
  const listingsRemote = useRemoteData(loadListings, {
    queryKey: ['listings', 'provider-home', provider?.id ?? ''],
    enabled: Boolean(provider),
  })
  const listings = useMemo(
    () => (listingsRemote.status === 'success' ? listingsRemote.data.data : []),
    [listingsRemote],
  )

  const focus = useMemo(() => pickFocusListing(listings), [listings])
  const steps = useMemo(
    () => (provider ? buildSteps(provider, listings, focus, t) : []),
    [provider, listings, focus, t],
  )
  const action = useMemo(
    () => (provider ? recommendedAction(provider, focus, listings, t) : null),
    [provider, focus, listings, t],
  )

  const isLoading = providerRemote.isLoading || (Boolean(provider) && listingsRemote.isLoading)
  const error = providerRemote.isError
    ? providerRemote.error
    : listingsRemote.isError
      ? listingsRemote.error
      : undefined

  return (
    <AsyncState
      isLoading={isLoading}
      error={error}
      onRetry={() => {
        void providerRemote.refetch()
        void listingsRemote.refetch()
      }}
      loadingFallback={<ContentSkeleton className="min-h-64" />}
    >
      {provider && action ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:items-start">
          <article className="flex min-w-0 flex-col gap-5 rounded-xl border border-border bg-card p-5 transition-colors hover:border-border/80 sm:p-6">
            <header className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground sm:text-base">
                {t('focus.currentListing')}
              </h2>
              <Link
                to="/provider/listings"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                {t('focus.viewAllListings')}
              </Link>
            </header>

            <div className="h-px bg-border" />

            {focus ? (
              <div className="grid gap-5 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">
                      {focus.name}
                    </h3>
                    <Badge
                      className={cn(
                        'rounded-md',
                        focus.status === 'INACTIVE' ||
                          !focus.description ||
                          focus.description.trim().length < 20
                          ? 'border-transparent bg-primary/10 text-primary'
                          : 'border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
                      )}
                    >
                      {listingAttentionLabel(focus, t)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {shortListingCode(focus.id)} · {t(`admin:listingType.${focus.type}`)} ·{' '}
                    {focus.categoryName}
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {focus.description?.trim() || t('focus.noDescription')}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
                  <div className="flex items-start gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground">
                      <Package className="size-3.5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('focus.price')}</p>
                      <p className="text-sm font-medium text-foreground">
                        {formatPrice(focus, formatNumber)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground">
                      <MapPin className="size-3.5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('focus.location')}</p>
                      <p className="text-sm font-medium text-foreground">
                        {[provider.city, provider.country].filter(Boolean).join(', ') ||
                          t('focus.notSet')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold tracking-tight text-foreground">
                  {t('focus.noListingsTitle')}
                </h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  {t('focus.noListingsBody')}
                </p>
              </div>
            )}

            <div className="relative mt-auto min-h-[11rem] overflow-hidden rounded-xl sm:min-h-[12.5rem]">
              <img
                src="/illustrations/provider-next-step-banner.jpg?v=2"
                alt=""
                aria-hidden
                className="absolute inset-0 size-full object-cover object-right"
              />
              <div className="relative z-10 flex h-full min-h-[11rem] flex-col items-start justify-start gap-4 p-5 sm:min-h-[12.5rem] sm:flex-row sm:items-start sm:justify-between sm:p-6">
                <div className="min-w-0 max-w-md space-y-2">
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-white/75 uppercase">
                    {t('focus.recommendedNext')}
                  </p>
                  <h3 className="text-xl font-semibold tracking-tight text-white">
                    {action.title}
                  </h3>
                  <p className="whitespace-pre-line text-sm leading-6 text-white/85">
                    {action.description}
                  </p>
                </div>
                <Link
                  to={action.href}
                  className={cn(
                    buttonVariants({ size: 'sm' }),
                    'shrink-0 bg-white text-primary hover:bg-white/90',
                  )}
                >
                  {action.cta}
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </article>

          <aside className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-border/80 sm:p-6">
            <header className="space-y-1">
              <h2 className="text-sm font-semibold text-foreground sm:text-base">
                {t('focus.nextStepsTitle')}
              </h2>
              <p className="text-sm text-muted-foreground">{t('focus.nextStepsSubtitle')}</p>
            </header>

            <div className="h-px bg-border" />

            <ol className="flex flex-1 flex-col gap-0">
              {steps.map((step, index) => {
                const isLast = index === steps.length - 1
                const isActive = step.status === 'needs_input' || step.status === 'todo'
                const isDone = step.status === 'done'
                return (
                  <li key={step.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {!isLast ? (
                      <span
                        className="absolute top-7 bottom-0 start-[11px] w-px bg-border"
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className={cn(
                        'relative z-10 flex size-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                        isDone || isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1 pt-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            'text-sm font-semibold',
                            step.status === 'pending' ? 'text-muted-foreground' : 'text-foreground',
                          )}
                        >
                          {step.title}
                        </p>
                        <Badge className={cn('shrink-0 rounded-md', statusBadgeClass(step.status))}>
                          {statusLabel(step.status, t)}
                        </Badge>
                      </div>
                      <p
                        className={cn(
                          'text-xs leading-5',
                          step.status === 'pending'
                            ? 'text-muted-foreground/80'
                            : 'text-muted-foreground',
                        )}
                      >
                        {step.description}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>

            <Link
              to="/provider/listings"
              className={cn(buttonVariants({ variant: 'outline' }), 'mt-auto w-full')}
            >
              {t('focus.openListingsManager')}
            </Link>
          </aside>
        </div>
      ) : null}
    </AsyncState>
  )
}
