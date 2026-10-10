import { cn } from 'cn'

import { Skeleton } from '@/components/ui/skeleton'

type SkeletonPresetProps = {
  className?: string
}

export const CIVIL_ILLUSTRATIONS = [
  '/illustrations/skeleton-building.jpg?v=wireframe',
  '/illustrations/skeleton-crane.jpg?v=wireframe',
  '/illustrations/skeleton-planning.jpg?v=wireframe',
] as const

export function civilIllustrationSrc(variant = 0) {
  return CIVIL_ILLUSTRATIONS[variant % CIVIL_ILLUSTRATIONS.length]
}

/** Tall civil media block — used on loaded cards and skeleton cards. */
export function CivilCardMedia({
  className,
  variant = 0,
  pulsing = false,
}: SkeletonPresetProps & { variant?: number; pulsing?: boolean }) {
  return (
    <div
      className={cn(
        'relative aspect-[16/10] w-full overflow-hidden bg-muted',
        className,
      )}
    >
      <img
        src={civilIllustrationSrc(variant)}
        alt=""
        aria-hidden
        className="size-full object-cover object-center opacity-70 grayscale"
      />
      {pulsing ? <div className="absolute inset-0 animate-pulse bg-foreground/10" /> : null}
    </div>
  )
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

/** One directory/provider/project card — bones only, no real Card chrome. */
function CardItemSkeleton({
  variant,
  media,
}: {
  variant: number
  media: 'civil' | 'plain' | 'logo'
}) {
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
      {media === 'plain' ? (
        <Skeleton className="aspect-video w-full rounded-none" />
      ) : media === 'logo' ? null : (
        <CardImageSkeleton variant={variant} />
      )}
      <div className="flex flex-col gap-3 p-3">
        {media === 'logo' ? <Skeleton className="h-40 w-full rounded-lg" /> : null}
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
}: SkeletonPresetProps & { count?: number; media?: 'civil' | 'plain' | 'logo' }) {
  return (
    <div
      className={cn(
        'grid min-w-0',
        media === 'plain'
          ? 'gap-4 md:grid-cols-2 lg:grid-cols-3'
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
