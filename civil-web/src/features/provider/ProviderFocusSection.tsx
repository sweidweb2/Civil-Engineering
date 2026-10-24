import { useCallback, useMemo } from 'react'
import { ArrowRight, MapPin, Package } from 'lucide-react'
import { Link } from 'react-router-dom'

import { AsyncState } from '@/components/feedback/async-state'
import { ContentSkeleton } from '@/components/feedback/skeletons'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { useRemoteData } from '@/hooks/useRemoteData'
import { cn } from '@/lib/utils'
import {
  type Listing,
  listingTypeLabel,
  listListings,
} from '@/services/listings'
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

function formatPrice(listing: Listing) {
  const amount = Number.parseFloat(listing.price)
  const price = Number.isFinite(amount)
    ? amount.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : listing.price
  return `${listing.currency} ${price}/${listing.unit}`
}

function pickFocusListing(listings: Listing[]): Listing | null {
  if (listings.length === 0) return null
  const inactive = listings.find((item) => item.status === 'INACTIVE')
  if (inactive) return inactive
  const missingDescription = listings.find(
    (item) => !item.description || item.description.trim().length < 20,
  )
  if (missingDescription) return missingDescription
  return [...listings].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )[0] ?? null
}

function profileIncomplete(provider: Provider) {
  return !provider.phone || !provider.city || !provider.description
}

function buildSteps(provider: Provider, listings: Listing[], focus: Listing | null): FocusStep[] {
  const profileDone = !profileIncomplete(provider)
  const hasActive = listings.some((item) => item.status === 'ACTIVE')
  const catalogReady = listings.length >= 3 && hasActive

  return [
    {
      id: 'profile',
      title: 'Complete your shop profile',
      description: 'Add phone, city, and a short supplier description.',
      status: profileDone ? 'done' : 'todo',
    },
    {
      id: 'listing',
      title: focus?.status === 'INACTIVE' ? 'Activate your listing' : 'Publish a live listing',
      description:
        focus?.status === 'INACTIVE'
          ? 'Review details and set the listing to active for project managers.'
          : 'Add materials, equipment, or services to your catalog.',
      status: hasActive ? 'done' : focus ? 'needs_input' : 'todo',
    },
    {
      id: 'catalog',
      title: 'Grow your catalog',
      description: 'Keep at least a few active listings so PMs can find you.',
      status: catalogReady ? 'done' : hasActive ? 'pending' : 'pending',
    },
  ]
}

function recommendedAction(provider: Provider, focus: Listing | null, listings: Listing[]) {
  if (!focus) {
    return {
      title: 'Create your first listing',
      description:
        'Publish a material, equipment, or service so it appears when project managers search the directory.',
      cta: 'Add listing',
      href: '/provider/listings',
    }
  }
  if (focus.status === 'INACTIVE') {
    return {
      title: 'Activate this listing',
      description:
        'Review pricing and details, then set the listing to active so it\nshows up for project managers.',
      cta: 'Continue listing',
      href: '/provider/listings',
    }
  }
  if (!focus.description || focus.description.trim().length < 20) {
    return {
      title: 'Improve listing details',
      description:
        'Add a clearer description and check unit pricing so buyers understand exactly what you supply.',
      cta: 'Edit listing',
      href: '/provider/listings',
    }
  }
  if (profileIncomplete(provider)) {
    return {
      title: 'Keep your shop details accurate',
      description:
        'Make sure phone, city, and your supplier description are filled in so project managers can trust your catalog.',
      cta: 'Review listings',
      href: '/provider/listings',
    }
  }
  if (listings.length < 3) {
    return {
      title: 'Expand your catalog',
      description:
        'Add a few more products or services so project managers see a fuller picture of what you offer.',
      cta: 'Add listing',
      href: '/provider/listings',
    }
  }
  return {
    title: 'Review your live catalog',
    description:
      'Confirm prices and availability stay accurate so project managers can rely on your listings.',
    cta: 'View listings',
    href: '/provider/listings',
  }
}

function statusBadgeClass(status: StepStatus) {
  if (status === 'done') return 'border-transparent bg-primary/10 text-primary'
  if (status === 'needs_input') return 'border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400'
  if (status === 'todo') return 'border-border bg-muted text-foreground'
  return 'border-border bg-muted/60 text-muted-foreground'
}

function statusLabel(status: StepStatus) {
  if (status === 'done') return 'Done'
  if (status === 'needs_input') return 'Needs input'
  if (status === 'todo') return 'To do'
  return 'Pending'
}

function listingAttentionLabel(listing: Listing) {
  if (listing.status === 'INACTIVE') return 'Needs review'
  if (!listing.description || listing.description.trim().length < 20) return 'Needs details'
  return 'Live'
}

export function ProviderFocusSection() {
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
    () => (provider ? buildSteps(provider, listings, focus) : []),
    [provider, listings, focus],
  )
  const action = useMemo(
    () => (provider ? recommendedAction(provider, focus, listings) : null),
    [provider, focus, listings],
  )

  const isLoading =
    providerRemote.isLoading || (Boolean(provider) && listingsRemote.isLoading)
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
                Your current listing
              </h2>
              <Link
                to="/provider/listings"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                View all listings
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
                      {listingAttentionLabel(focus)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {shortListingCode(focus.id)} · {listingTypeLabel(focus.type)} ·{' '}
                    {focus.categoryName}
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {focus.description?.trim() ||
                      'No description yet. Add details so project managers know what you supply.'}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
                  <div className="flex items-start gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground">
                      <Package className="size-3.5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Price</p>
                      <p className="text-sm font-medium text-foreground">{formatPrice(focus)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground">
                      <MapPin className="size-3.5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-sm font-medium text-foreground">
                        {[provider.city, provider.country].filter(Boolean).join(', ') ||
                          'Not set'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold tracking-tight text-foreground">
                  No listings yet
                </h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  You have not published materials, equipment, or services. Create a listing to
                  appear in the project manager directory.
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
                    Recommended next step
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
                Your next steps
              </h2>
              <p className="text-sm text-muted-foreground">
                A few things to move your catalog forward.
              </p>
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
                        className="absolute top-7 bottom-0 left-[11px] w-px bg-border"
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
                          {statusLabel(step.status)}
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
              Open listings manager
            </Link>
          </aside>
        </div>
      ) : null}
    </AsyncState>
  )
}
