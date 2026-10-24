import { cn } from 'cn'

import { Skeleton } from '@/components/ui/skeleton'

type SkeletonPresetProps = {
  className?: string
}

/**
 * Card art: one calm isometric subject, centered, with a wide empty margin on warm
 * off-white (#fef8ef). Solid faces only — never a wireframe, blueprint, or see-through
 * walls. One even charcoal outline. Flat soft shading in warm stone, pale gray, and a
 * little clay. A single clear scene, no people, no text, no clutter.
 * Assets are padded top/bottom in-file so they do not read as a tight landscape strip.
 */
export const CIVIL_ILLUSTRATIONS = [
  '/illustrations/skeleton-building.jpg?v=4',
  '/illustrations/skeleton-crane.jpg?v=4',
  '/illustrations/skeleton-planning.jpg?v=4',
] as const

const PROVIDER_ILLUSTRATIONS = [
  '/illustrations/provider-shop.jpg?v=4',
  '/illustrations/provider-yard.jpg?v=4',
  '/illustrations/provider-warehouse.jpg?v=4',
] as const

const PROJECT_ILLUSTRATIONS = [
  '/illustrations/project-frame.jpg?v=4',
  '/illustrations/project-house.jpg?v=4',
  '/illustrations/project-site.jpg?v=4',
] as const

export function civilIllustrationSrc(variant = 0) {
  return CIVIL_ILLUSTRATIONS[variant % CIVIL_ILLUSTRATIONS.length]
}

function IllustrationFrame({
  src,
  className,
  pulsing = false,
}: SkeletonPresetProps & { src: string; pulsing?: boolean }) {
  return (
    <div
      className={cn(
        // Square cream canvas (assets are 1:1); keep frame square so art is not letterboxed.
        'relative aspect-square w-full overflow-hidden bg-[#fef8ef]',
        className,
      )}
    >
      <img
        src={src}
        alt=""
        aria-hidden
        decoding="async"
        className="size-full object-cover object-center"
      />
      {pulsing ? <div className="pointer-events-none absolute inset-0 animate-pulse bg-foreground/8" /> : null}
    </div>
  )
}

/** Provider card art: shop, supply yard, or warehouse. */
export function ProviderCardMedia({
  className,
  variant = 0,
  pulsing = false,
}: SkeletonPresetProps & { variant?: number; pulsing?: boolean }) {
  return (
    <IllustrationFrame
      className={className}
      pulsing={pulsing}
      src={PROVIDER_ILLUSTRATIONS[variant % PROVIDER_ILLUSTRATIONS.length]}
    />
  )
}

/** Shown on a project card when it has no main photo — short strip, zoomed to crop cream padding. */
export function ProjectCardMedia({
  className,
  variant = 0,
  pulsing = false,
}: SkeletonPresetProps & { variant?: number; pulsing?: boolean }) {
  return (
    <div
      className={cn(
        'relative aspect-[2/1] w-full overflow-hidden bg-[#fef8ef]',
        className,
      )}
    >
      <img
        src={PROJECT_ILLUSTRATIONS[variant % PROJECT_ILLUSTRATIONS.length]}
        alt=""
        aria-hidden
        decoding="async"
        className="size-full scale-[1.35] object-cover object-center"
      />
      {pulsing ? (
        <div className="pointer-events-none absolute inset-0 animate-pulse bg-foreground/8" />
      ) : null}
    </div>
  )
}

/** Project and directory card art: building, crane, or massing study. */
export function CivilCardMedia({
  className,
  variant = 0,
  pulsing = false,
}: SkeletonPresetProps & { variant?: number; pulsing?: boolean }) {
  return <IllustrationFrame className={className} pulsing={pulsing} src={civilIllustrationSrc(variant)} />
}

/** Default AsyncState fallback — generic content block. */
export function ContentSkeleton({ className }: SkeletonPresetProps) {
  return (
    <div
      className={cn('flex flex-col gap-3', className)}
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-24 w-full" />
    </div>
  )
}

/** Image strip with isometric civil art + pulse (loading only). */
export function CardImageSkeleton({
  className,
  variant = 0,
}: SkeletonPresetProps & { variant?: number }) {
  return <CivilCardMedia className={className} variant={variant} pulsing />
}

/** Listing card: square thumb on the left, price and actions on one row. */
function ListingCardItemSkeleton() {
  return (
    <div className="flex min-w-0 items-stretch gap-3 rounded-lg border border-border bg-card p-3">
      <Skeleton className="size-16 shrink-0 self-center rounded-md" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
        <div className="min-w-0 space-y-1.5">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-24" />
          <div className="flex gap-1">
            <Skeleton className="size-7 rounded-lg" />
            <Skeleton className="size-7 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}

/** One directory/provider/project card — bones only, no real Card chrome. */
function CardItemSkeleton({
  variant,
  media,
}: {
  variant: number
  media: 'civil' | 'plain' | 'logo' | 'provider' | 'listing'
}) {
  if (media === 'listing') return <ListingCardItemSkeleton />

  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
      {media === 'plain' ? (
        <Skeleton className="aspect-video w-full rounded-none" />
      ) : media === 'provider' || media === 'logo' ? (
        <ProviderCardMedia variant={variant} pulsing />
      ) : (
        <CardImageSkeleton variant={variant} />
      )}
      <div className="flex flex-col gap-3 p-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
    </div>
  )
}

/** Card grid pages (projects list, providers, directory). */
export function CardGridSkeleton({
  className,
  count = 6,
  media = 'civil',
}: SkeletonPresetProps & { count?: number; media?: 'civil' | 'plain' | 'logo' | 'provider' | 'listing' }) {
  return (
    <div
      className={cn(
        'grid min-w-0',
        media === 'plain'
          ? 'gap-4 md:grid-cols-2 lg:grid-cols-3'
          : media === 'listing'
            ? 'gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3'
            : 'gap-3 sm:grid-cols-2 xl:grid-cols-3',
        className,
      )}
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: count }, (_, i) => (
        <CardItemSkeleton key={i} variant={i} media={media} />
      ))}
    </div>
  )
}

/** Stat card strip (dashboard / list page headers). */
export function StatGridSkeleton({
  className,
  count = 4,
}: SkeletonPresetProps & { count?: number }) {
  return (
    <div
      className={cn('grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-4', className)}
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-xl border border-border bg-card p-3"
        >
          <Skeleton className="size-9 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-12" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Table / DataPanel pages (logs, admin notification list). */
export function TableSkeleton({
  className,
  rows = 8,
  columns = 5,
}: SkeletonPresetProps & { rows?: number; columns?: number }) {
  return (
    <div
      className={cn('overflow-hidden rounded-xl border border-border bg-card', className)}
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="border-b border-border px-4 py-3">
        <div className="flex gap-4">
          {Array.from({ length: columns }, (_, i) => (
            <Skeleton key={i} className="h-3 w-20" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="flex items-center gap-4 px-4 py-3">
            {Array.from({ length: columns }, (_, col) => (
              <Skeleton
                key={col}
                className={cn(
                  'h-4',
                  col === 0 ? 'w-28' : col === columns - 1 ? 'w-16' : 'w-24 flex-1',
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Detail / form pages (project detail, provider detail). */
export function DetailSkeleton({ className }: SkeletonPresetProps) {
  return (
    <div
      className={cn('grid gap-6 md:grid-cols-2', className)}
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: 2 }, (_, card) => (
        <div key={card} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56" />
          {Array.from({ length: 4 }, (_, field) => (
            <div key={field} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/** Single detail card (provider market details). */
export function DetailCardSkeleton({ className }: SkeletonPresetProps) {
  return (
    <div
      className={cn('overflow-hidden rounded-xl border border-border bg-card', className)}
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="grid sm:grid-cols-2">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] border-b border-border sm:odd:border-r"
          >
            <div className="px-3 py-2.5">
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="px-3 py-2.5">
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Stacked list pages (notifications inbox). */
export function ListSkeleton({
  className,
  count = 5,
}: SkeletonPresetProps & { count?: number }) {
  return (
    <div
      className={cn('space-y-2', className)}
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex items-start gap-4 rounded-xl border border-border bg-card p-4"
        >
          <Skeleton className="size-9 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-3 w-16 shrink-0" />
        </div>
      ))}
    </div>
  )
}

/** Image gallery block. */
export function GallerySkeleton({ className }: SkeletonPresetProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-xl border border-border bg-card p-4 md:col-span-2',
        className,
      )}
      role="status"
      aria-busy="true"
      aria-label="Loading gallery"
    >
      <Skeleton className="h-5 w-36" />
      <Skeleton className="h-3 w-64" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}
