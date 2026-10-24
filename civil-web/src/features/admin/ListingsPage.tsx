import { useCallback, useState } from 'react'
import { Box, Briefcase, Eye, Layers, LayoutGrid, Pencil, Plus, Table2, Trash2, Wrench } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import {
  CardGridSkeleton,
  civilIllustrationPair,
  ContentSkeleton,
  TableSkeleton,
  ThemeIllustration,
} from '@/components/feedback/skeletons'
import { DataPanel, PageHeader, RowActions, TablePager } from '@/components/layout'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { usePagedQuery } from '@/hooks/usePagedQuery'
import { usePermissions } from '@/hooks/usePermissions'
import { useRemoteData } from '@/hooks/useRemoteData'
import { portalBaseFromPath } from '@/lib/homePath'
import { ApiError } from '@/services/api'
import {
  deleteListing,
  type Listing,
  type ListingType,
  type ListingTypeCounts,
  listingTypeLabel,
  listListings,
} from '@/services/listings'
import { getMyProvider } from '@/services/providers'

import { ListingFormDialog } from './components/ListingFormDialog'
import { STAT_GRID_CLASS, StatCard } from './components/StatCard'
import { ellipsis, PAGE_SIZE, pageCount } from './lib/text'

const EMPTY_COUNTS: ListingTypeCounts = { MATERIAL: 0, EQUIPMENT: 0, SERVICE: 0 }

type ListingView = 'cards' | 'table'

function formatPrice(listing: Pick<Listing, 'currency' | 'price' | 'unit'>): string {
  return `${listing.currency} ${listing.price} / ${listing.unit}`
}

function listingThumbVariant(type: ListingType): number {
  if (type === 'EQUIPMENT') return 1
  if (type === 'SERVICE') return 2
  return 0
}

function ListingThumb({
  type,
  mainImageUrl,
  name,
}: {
  type: ListingType
  mainImageUrl?: string | null
  name: string
}) {
  if (mainImageUrl) {
    return (
      <div className="relative size-16 shrink-0 self-center overflow-hidden rounded-md bg-muted">
        <img
          src={mainImageUrl}
          alt=""
          aria-hidden
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />
      </div>
    )
  }
  const { light, dark } = civilIllustrationPair(listingThumbVariant(type))
  return (
    <div
      className="relative size-16 shrink-0 self-center overflow-hidden rounded-md bg-[#f4f1eb] dark:bg-[#121916]"
      title={name}
    >
      <ThemeIllustration lightSrc={light} darkSrc={dark} objectFit="contain" />
    </div>
  )
}

function ListingActions({
  listing,
  detailsPath,
  busy,
  canManage,
  onOpen,
  onEdit,
  onDelete,
}: {
  listing: Listing
  detailsPath: string
  busy: boolean
  canManage: boolean
  onOpen: (path: string) => void
  onEdit: (listing: Listing) => void
  onDelete: (listing: Listing) => void
}) {
  return (
    <RowActions>
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        aria-label={`Open ${listing.name}`}
        onClick={() => onOpen(detailsPath)}
      >
        <Eye />
      </Button>
      {canManage ? (
        <>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label={`Edit ${listing.name}`}
            disabled={busy}
            onClick={() => onEdit(listing)}
          >
            <Pencil />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="destructive"
            aria-label={`Delete ${listing.name}`}
            disabled={busy}
            onClick={() => onDelete(listing)}
          >
            <Trash2 />
          </Button>
        </>
      ) : null}
    </RowActions>
  )
}

export function ListingsPage() {
  useDocumentTitle('Listings')
  const { isAdmin, role } = usePermissions()
  const isProvider = role === 'PROVIDER'

  const loadMine = useCallback(() => getMyProvider(), [])
  const mineRemote = useRemoteData(loadMine, {
    queryKey: ['providers', 'me'],
    enabled: isProvider && !isAdmin,
  })

  if (isProvider && !isAdmin) {
    return (
      <AsyncState
        isLoading={mineRemote.isLoading}
        error={mineRemote.isError ? mineRemote.error : undefined}
        onRetry={() => void mineRemote.refetch()}
        loadingFallback={<ContentSkeleton />}
      >
        {mineRemote.status === 'success' ? (
          <ListingsBrowser providerId={mineRemote.data.data.id} manageOwn />
        ) : null}
      </AsyncState>
    )
  }

  return <ListingsBrowser />
}

export function ListingsBrowser({
  providerId,
  manageOwn = false,
}: {
  providerId?: string
  /** Provider portal: manage own listings (create/edit/delete). */
  manageOwn?: boolean
}) {
  const embedded = Boolean(providerId) && !manageOwn
  const location = useLocation()
  const navigate = useNavigate()
  const listingsBase = `${portalBaseFromPath(location.pathname)}/listings`
  const { isAdmin } = usePermissions()
  const canManage = isAdmin || manageOwn
  const { query, setQuery, debouncedQuery, page, setPage } = usePagedQuery()
  const [view, setView] = useState<ListingView>(embedded ? 'table' : 'cards')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Listing | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Listing | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(
    () => listListings(page, PAGE_SIZE, { q: debouncedQuery || undefined, providerId }),
    [debouncedQuery, page, providerId],
  )
  const remote = useRemoteData(load, {
    queryKey: ['listings', page, debouncedQuery, providerId ?? ''],
  })
  const rows = remote.status === 'success' ? remote.data.data : []
  const total = remote.status === 'success' ? remote.data.meta.total : 0
  const counts = remote.status === 'success' ? remote.data.meta.typeCounts : EMPTY_COUNTS
  const totalPages = pageCount(total)

  function showView(next: ListingView) {
    setView(next)
  }

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(listing: Listing) {
    setEditing(listing)
    setDialogOpen(true)
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    const id = pendingDelete.id
    setBusyId(id)
    try {
      const result = await deleteListing(id)
      toast.message(result.data.outcome === 'hidden' ? 'Listing hidden. Reviews still reference it.' : 'Listing removed')
      setPendingDelete(null)
      await remote.refetch()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not remove listing')
    } finally {
      setBusyId(null)
    }
  }

  const showCards = !embedded && view === 'cards'
  const addButton = canManage ? (
    <Button type="button" onClick={openCreate}>
      <Plus />
      Add listing
    </Button>
  ) : null

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {embedded ? (
        <div className="flex min-w-0 items-center justify-between gap-3">
          <h2 className="text-sm font-medium">Listings</h2>
          {addButton}
        </div>
      ) : (
        <PageHeader
          className="mb-0"
          title="Listings"
          description="Provider materials, equipment, and services. Prices are informational."
          actions={addButton ?? undefined}
        />
      )}

      {embedded ? null : (
        <div className={STAT_GRID_CLASS}>
          <StatCard icon={Box} label="Materials" value={counts.MATERIAL} />
          <StatCard icon={Wrench} label="Equipment" value={counts.EQUIPMENT} />
          <StatCard icon={Briefcase} label="Services" value={counts.SERVICE} />
          <StatCard
            icon={Layers}
            label="Total"
            value={counts.MATERIAL + counts.EQUIPMENT + counts.SERVICE}
          />
        </div>
      )}

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={
          showCards ? <CardGridSkeleton media="listing" /> : <TableSkeleton columns={7} />
        }
      >
        <DataPanel
          toolbar={
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter listings…"
                aria-label="Filter listings"
                className="max-w-sm"
              />
              {embedded ? null : (
                <div className="flex gap-1" role="group" aria-label="Listing view">
                  <Button
                    type="button"
                    size="sm"
                    variant={view === 'cards' ? 'default' : 'outline'}
                    aria-pressed={view === 'cards'}
                    onClick={() => showView('cards')}
                  >
                    <LayoutGrid />
                    Cards
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={view === 'table' ? 'default' : 'outline'}
                    aria-pressed={view === 'table'}
                    onClick={() => showView('table')}
                  >
                    <Table2 />
                    Table
                  </Button>
                </div>
              )}
            </div>
          }
          footer={<TablePager page={page} totalPages={totalPages} total={total} onPageChange={setPage} />}
        >
          {showCards ? (
            rows.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No listings match.</p>
            ) : (
              <div className="grid min-w-0 gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
                {rows.map((listing) => (
                  <article
                    key={listing.id}
                    className="flex min-w-0 cursor-pointer items-stretch gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/25"
                    onClick={() => navigate(`${listingsBase}/${listing.id}`)}
                  >
                    <ListingThumb
                      type={listing.type}
                      mainImageUrl={listing.mainImageUrl}
                      name={listing.name}
                    />
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-medium" title={listing.name}>
                          {ellipsis(listing.name, 36)}
                        </h2>
                        <p className="truncate text-xs text-muted-foreground" title={listing.providerName}>
                          {ellipsis(listing.providerName, 32)}
                          {listing.status === 'INACTIVE' ? ' · Inactive' : ''}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-sm font-medium">{formatPrice(listing)}</p>
                        <div
                          className="shrink-0"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <ListingActions
                            listing={listing}
                            detailsPath={`${listingsBase}/${listing.id}`}
                            busy={busyId === listing.id}
                            canManage={canManage}
                            onOpen={(path) => navigate(path)}
                            onEdit={openEdit}
                            onDelete={setPendingDelete}
                          />
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : (
            <Table startIndex={(page - 1) * PAGE_SIZE}>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground">
                      No listings match.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((listing) => (
                    <TableRow key={listing.id}>
                      <TableCell className="max-w-56 truncate" title={listing.name}>
                        <button
                          type="button"
                          className="truncate text-left font-medium hover:underline"
                          onClick={() => navigate(`${listingsBase}/${listing.id}`)}
                        >
                          {ellipsis(listing.name, 36)}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{listingTypeLabel(listing.type)}</Badge>
                      </TableCell>
                      <TableCell className="max-w-40 truncate" title={listing.providerName}>
                        {ellipsis(listing.providerName, 24)}
                      </TableCell>
                      <TableCell className="max-w-40 truncate" title={listing.categoryName}>
                        {ellipsis(listing.categoryName, 24)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatPrice(listing)}</TableCell>
                      <TableCell>
                        <Badge variant={listing.status === 'ACTIVE' ? 'default' : 'outline'}>
                          {listing.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <ListingActions
                          listing={listing}
                          detailsPath={`${listingsBase}/${listing.id}`}
                          busy={busyId === listing.id}
                          canManage={canManage}
                          onOpen={(path) => navigate(path)}
                          onEdit={openEdit}
                          onDelete={setPendingDelete}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </DataPanel>
      </AsyncState>

      <ListingFormDialog
        open={dialogOpen}
        listing={editing}
        lockedProviderId={providerId}
        onOpenChange={setDialogOpen}
        onSaved={(created) => {
          if (created) setPage(1)
          void remote.refetch()
        }}
      />


      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove listing</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {pendingDelete?.name ?? 'the listing'} and its variations and offers. If reviews still point at it, the listing is hidden instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
