import { useCallback, useEffect, useState } from 'react'
import { Eye, LayoutGrid, Pencil, Plus, Table2, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
import { PageHeader, RowActions, TablePager } from '@/components/layout'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { ellipsis, PAGE_SIZE, pageCount } from '@/lib/text'
import { ApiError } from '@/services/api'
import {
  deleteListing,
  formatListingPrice,
  type Listing,
  type ListingType,
  listListings,
  localizedListingCategoryName,
} from '@/services/listings'
import { getMyProvider } from '@/services/providers'
import { useLocaleStore } from '@/stores/localeStore'

import { ListingFormDialog } from './components/ListingFormDialog'

type ListingView = 'cards' | 'table'

function listingThumbVariant(type: ListingType | null): number {
  if (type === 'EQUIPMENT') return 1
  if (type === 'SERVICE') return 2
  return 0
}

function ListingIllustration({
  type,
  name,
  className,
}: {
  type: ListingType | null
  name: string
  className?: string
}) {
  const { light, dark } = civilIllustrationPair(listingThumbVariant(type))
  return (
    <div
      className={
        className ??
        'relative size-10 shrink-0 self-center overflow-hidden rounded-md bg-listing-canvas'
      }
      title={name}
    >
      <ThemeIllustration lightSrc={light} darkSrc={dark} objectFit="cover" />
    </div>
  )
}

/** Compact thumb for table rows. */
function ListingThumb({
  type,
  mainImageUrl,
  name,
}: {
  type: ListingType | null
  mainImageUrl?: string | null
  name: string
}) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [mainImageUrl])

  if (!mainImageUrl || failed) {
    return <ListingIllustration type={type} name={name} />
  }

  return (
    <div className="relative size-10 shrink-0 self-center overflow-hidden rounded-md bg-muted">
      <img
        src={mainImageUrl}
        alt=""
        aria-hidden
        decoding="async"
        className="absolute inset-0 size-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  )
}

/** Full-bleed square cover for grid cards (provider-style). */
function ListingCardCover({
  type,
  mainImageUrl,
  name,
}: {
  type: ListingType | null
  mainImageUrl?: string | null
  name: string
}) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [mainImageUrl])

  if (!mainImageUrl || failed) {
    return (
      <ListingIllustration
        type={type}
        name={name}
        className="relative aspect-[5/4] w-full shrink-0 overflow-hidden bg-listing-canvas"
      />
    )
  }

  return (
    <div className="relative aspect-[5/4] w-full shrink-0 overflow-hidden bg-muted">
      <img
        src={mainImageUrl}
        alt=""
        aria-hidden
        decoding="async"
        className="absolute inset-0 size-full object-cover object-center"
        onError={() => setFailed(true)}
      />
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
  const { t } = useTranslation(['admin', 'common'])
  return (
    <RowActions>
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        aria-label={t('admin:listings.openAria', { name: listing.name })}
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
            aria-label={t('admin:listings.editAria', { name: listing.name })}
            disabled={busy}
            onClick={() => onEdit(listing)}
          >
            <Pencil />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="destructive"
            aria-label={t('admin:listings.deleteAria', { name: listing.name })}
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
  const { t } = useTranslation(['admin', 'common'])
  useDocumentTitle(t('admin:listings.documentTitle'))
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
  const { t } = useTranslation(['admin', 'common'])
  const locale = useLocaleStore((state) => state.locale)
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
    () =>
      listListings(page, PAGE_SIZE, {
        q: debouncedQuery || undefined,
        providerId,
        counts: false,
      }),
    [debouncedQuery, page, providerId],
  )
  const remote = useRemoteData(load, {
    queryKey: ['listings', page, debouncedQuery, providerId ?? ''],
  })
  const rows = remote.status === 'success' ? remote.data.data : []
  const total = remote.status === 'success' ? remote.data.meta.total : 0
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
      toast.message(
        result.data.outcome === 'hidden'
          ? t('admin:listings.hiddenToast')
          : t('admin:listings.removedToast'),
      )
      setPendingDelete(null)
      await remote.refetch()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('admin:listings.couldNotRemove'))
    } finally {
      setBusyId(null)
    }
  }

  const showCards = !embedded && view === 'cards'
  const addButton = canManage ? (
    <Button type="button" onClick={openCreate}>
      <Plus />
      {t('admin:listings.addListing')}
    </Button>
  ) : null

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {embedded ? (
        <div className="flex min-w-0 items-center justify-between gap-3">
          <h2 className="text-sm font-medium">{t('admin:listings.title')}</h2>
          {addButton}
        </div>
      ) : manageOwn ? null : (
        <PageHeader className="mb-0" title={t('admin:listings.title')} />
      )}

      <div
        className={
          embedded
            ? 'flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center'
            : 'grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[1fr_minmax(12rem,20rem)_1fr] sm:items-center'
        }
      >
        {embedded ? null : (
          <div
            className="flex shrink-0 gap-1 sm:justify-self-start"
            role="group"
            aria-label={t('admin:listings.viewAria')}
          >
            <Button
              type="button"
              size="sm"
              variant={view === 'cards' ? 'default' : 'outline'}
              aria-pressed={view === 'cards'}
              onClick={() => showView('cards')}
            >
              <LayoutGrid />
              {t('admin:listings.cards')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={view === 'table' ? 'default' : 'outline'}
              aria-pressed={view === 'table'}
              onClick={() => showView('table')}
            >
              <Table2 />
              {t('admin:listings.table')}
            </Button>
          </div>
        )}
        <div
          className={
            embedded ? 'min-w-0 flex-1 sm:max-w-sm' : 'min-w-0 w-full sm:justify-self-center'
          }
        >
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('admin:listings.filterPlaceholder')}
            aria-label={t('admin:listings.filterAria')}
            className="w-full"
          />
        </div>
        {embedded ? null : <div className="flex shrink-0 sm:justify-self-end">{addButton}</div>}
      </div>

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={
          showCards ? <CardGridSkeleton media="listing" /> : <TableSkeleton columns={7} />
        }
      >
        {showCards ? (
          rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('admin:listings.noMatch')}</p>
          ) : (
            <div className="grid min-w-0 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {rows.map((listing) => (
                <Card
                  key={listing.id}
                  size="sm"
                  className="h-full cursor-pointer gap-1 overflow-hidden py-0! transition-colors hover:bg-muted/40 hover:ring-primary/30"
                  onClick={() => navigate(`${listingsBase}/${listing.id}`)}
                >
                  <ListingCardCover
                    type={listing.type}
                    mainImageUrl={listing.mainImageUrl}
                    name={listing.name}
                  />
                  <CardHeader className="min-w-0 gap-0.5 px-2 pt-2 pb-0">
                    <CardTitle className="truncate text-xs leading-tight" title={listing.name}>
                      {ellipsis(listing.name, 28)}
                    </CardTitle>
                    <CardDescription
                      className="truncate text-[11px] leading-tight"
                      title={listing.providerName ?? undefined}
                    >
                      {ellipsis(listing.providerName ?? t('admin:listings.noProvider'), 24)}
                      {listing.status === 'INACTIVE' ? t('admin:listings.inactiveSuffix') : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex min-w-0 items-center justify-between gap-1 px-2 pt-0 pb-2">
                    <p className="min-w-0 truncate text-[11px] font-medium">
                      {formatListingPrice(listing)}
                    </p>
                    <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (
          <div className="min-w-0 overflow-x-auto">
            <Table startIndex={(page - 1) * PAGE_SIZE}>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">{t('admin:listings.headers.image')}</TableHead>
                  <TableHead>{t('admin:listings.headers.name')}</TableHead>
                  <TableHead>{t('admin:listings.headers.provider')}</TableHead>
                  <TableHead>{t('admin:listings.headers.category')}</TableHead>
                  <TableHead>{t('admin:listings.headers.price')}</TableHead>
                  <TableHead>{t('admin:listings.headers.status')}</TableHead>
                  <TableHead className="text-end">{t('common:actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground">
                      {t('admin:listings.noMatch')}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((listing) => (
                    <TableRow key={listing.id}>
                      <TableCell>
                        <ListingThumb
                          type={listing.type}
                          mainImageUrl={listing.mainImageUrl}
                          name={listing.name}
                        />
                      </TableCell>
                      <TableCell className="max-w-56 truncate" title={listing.name}>
                        <button
                          type="button"
                          className="truncate text-start font-medium hover:underline"
                          onClick={() => navigate(`${listingsBase}/${listing.id}`)}
                        >
                          {ellipsis(listing.name, 36)}
                        </button>
                      </TableCell>
                      <TableCell
                        className="max-w-40 truncate"
                        title={listing.providerName ?? undefined}
                      >
                        {ellipsis(listing.providerName ?? '—', 24)}
                      </TableCell>
                      <TableCell
                        className="max-w-40 truncate"
                        title={localizedListingCategoryName(listing, locale) ?? undefined}
                      >
                        {ellipsis(localizedListingCategoryName(listing, locale) ?? '—', 24)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatListingPrice(listing)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={listing.status === 'ACTIVE' ? 'default' : 'outline'}>
                          {listing.status === 'ACTIVE'
                            ? t('admin:listingStatus.ACTIVE')
                            : t('admin:listingStatus.INACTIVE')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-end">
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
          </div>
        )}
        <TablePager page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
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

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin:listings.removeTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin:listings.removeDescription', {
                name: pendingDelete?.name ?? t('admin:listings.removeDescriptionFallback'),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>
              {t('common:remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
