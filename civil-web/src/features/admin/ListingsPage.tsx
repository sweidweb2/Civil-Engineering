import { Box, Briefcase, Layers, LayoutGrid, Pencil, Plus, Table2, Trash2, Wrench } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { CardGridSkeleton, civilIllustrationSrc, TableSkeleton } from '@/components/feedback/skeletons'
import { PageHeader } from '@/components/layout/page-header'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { usePermissions } from '@/hooks/usePermissions'
import { useRemoteData } from '@/hooks/useRemoteData'
import { ApiError } from '@/services/api'
import { type Category, listCategories } from '@/services/categories'
import {
  type Listing,
  type ListingStatus,
  type ListingType,
  type ListingTypeCounts,
  LISTING_TYPES,
  RENTAL_UNITS,
  createListing,
  deleteListing,
  isListingType,
  isRentalUnit,
  listListings,
  listingTypeLabel,
  rentalUnitLabel,
  updateListing,
} from '@/services/listings'
import { listProviders, type Provider } from '@/services/providers'

import { DataPanel, RowActions } from './components/DataPanel'
import { STAT_GRID_CLASS, StatCard } from './components/StatCard'
import { TablePager } from './components/TablePager'
import { ellipsis, PAGE_SIZE, pageCount } from './lib/text'

const EMPTY_COUNTS: ListingTypeCounts = { MATERIAL: 0, EQUIPMENT: 0, SERVICE: 0 }

type ListingView = 'cards' | 'table'

type ListingForm = {
  name: string
  type: ListingType
  providerId: string
  categoryId: string
  unit: string
  currency: string
  price: string
  status: ListingStatus
  description: string
  brand: string
  quantityAvailable: string
  rentalPrice: string
  rentalUnit: string
}

const EMPTY_FORM: ListingForm = {
  name: '',
  type: 'MATERIAL',
  providerId: '',
  categoryId: '',
  unit: '',
  currency: 'USD',
  price: '',
  status: 'ACTIVE',
  description: '',
  brand: '',
  quantityAvailable: '',
  rentalPrice: '',
  rentalUnit: '',
}

function formFromListing(listing: Listing): ListingForm {
  return {
    name: listing.name,
    type: listing.type,
    providerId: listing.providerId,
    categoryId: listing.categoryId,
    unit: listing.unit,
    currency: listing.currency,
    price: listing.price,
    status: listing.status,
    description: listing.description ?? '',
    brand: listing.brand ?? '',
    quantityAvailable: listing.quantityAvailable ?? '',
    rentalPrice: listing.rentalPrice ?? '',
    rentalUnit: listing.rentalUnit ?? '',
  }
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const DECIMAL_PATTERN = /^\d{1,14}(\.\d{1,4})?$/

function parseAmount(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed || !DECIMAL_PATTERN.test(trimmed)) return null
  return trimmed
}

function amountError(label: string, value: string, required: boolean): string | null {
  const trimmed = value.trim()
  if (!trimmed) return required ? `${label} is required` : null
  if (!DECIMAL_PATTERN.test(trimmed)) return `${label} must be a decimal with up to 4 places`
  return null
}

function formatPrice(listing: Pick<Listing, 'currency' | 'price' | 'unit'>): string {
  return `${listing.currency} ${listing.price} / ${listing.unit}`
}

function listingThumbSrc(type: ListingType): string {
  if (type === 'EQUIPMENT') return civilIllustrationSrc(1)
  if (type === 'SERVICE') return civilIllustrationSrc(2)
  return civilIllustrationSrc(0)
}

function ListingThumb({ type }: { type: ListingType }) {
  return (
    <div className="relative size-16 shrink-0 self-center overflow-hidden rounded-md bg-[#f4f1eb]">
      <img
        src={listingThumbSrc(type)}
        alt=""
        aria-hidden
        decoding="async"
        className="absolute inset-0 size-full object-contain object-center"
      />
    </div>
  )
}

function ListingActions({
  listing,
  busy,
  onEdit,
  onDelete,
}: {
  listing: Listing
  busy: boolean
  onEdit: (listing: Listing) => void
  onDelete: (listing: Listing) => void
}) {
  return (
    <RowActions>
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
    </RowActions>
  )
}

export function ListingsPage() {
  useDocumentTitle('Listings')
  return <ListingsBrowser />
}

export function ListingsBrowser({ providerId }: { providerId?: string }) {
  const embedded = Boolean(providerId)
  const { isAdmin } = usePermissions()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [page, setPage] = useState(1)
  const [view, setView] = useState<ListingView>(embedded ? 'table' : 'cards')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Listing | null>(null)
  const [form, setForm] = useState<ListingForm>(EMPTY_FORM)
  const [providers, setProviders] = useState<Provider[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Listing | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [query])

  const load = useCallback(
    () => listListings(page, PAGE_SIZE, { q: debouncedQuery || undefined, providerId }),
    [debouncedQuery, page, providerId],
  )
  const remote = useRemoteData(load)
  const rows = remote.status === 'success' ? remote.data.data : []
  const total = remote.status === 'success' ? remote.data.meta.total : 0
  const counts = remote.status === 'success' ? remote.data.meta.typeCounts : EMPTY_COUNTS
  const totalPages = pageCount(total)

  useEffect(() => {
    if (!dialogOpen) return
    let cancelled = false
    const providersRequest = providerId ? Promise.resolve({ data: [] as Provider[] }) : listProviders(1, 100)
    void Promise.all([providersRequest, listCategories(1, 100, { kind: form.type })])
      .then(([providerResult, categoryResult]) => {
        if (cancelled) return
        setProviders(providerResult.data)
        setCategories(categoryResult.data)
      })
      .catch((error) => {
        if (!cancelled) toast.error(error instanceof ApiError ? error.message : 'Could not load listing options')
      })
    return () => {
      cancelled = true
    }
  }, [dialogOpen, form.type, providerId])

  function showView(next: ListingView) {
    setView(next)
  }

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY_FORM, providerId: providerId ?? '' })
    setDialogOpen(true)
  }

  function openEdit(listing: Listing) {
    setEditing(listing)
    setForm(formFromListing(listing))
    setDialogOpen(true)
  }

  async function save() {
    const name = form.name.trim()
    const unit = form.unit.trim()
    const currency = form.currency.trim()
    const brand = form.brand.trim()
    const description = form.description.trim()
    const priceError = amountError('Price', form.price, true)
    const rentalError = amountError('Rental price', form.rentalPrice, false)
    const quantityError = amountError('Quantity', form.quantityAvailable, false)
    const category = categories.find((item) => item.id === form.categoryId)
    if (!name) {
      toast.error('Name is required')
      return
    }
    if (name.length > 160) {
      toast.error('Name must be at most 160 characters')
      return
    }
    if (!form.providerId) {
      toast.error('Provider is required')
      return
    }
    if (!form.categoryId) {
      toast.error('Category is required')
      return
    }
    if (category && category.kind !== form.type) {
      toast.error('Category must match the listing type')
      return
    }
    if (!unit) {
      toast.error('Unit is required')
      return
    }
    if (unit.length > 40) {
      toast.error('Unit must be at most 40 characters')
      return
    }
    if (!currency) {
      toast.error('Currency is required')
      return
    }
    if (currency.length !== 3) {
      toast.error('Currency must be a 3-letter code')
      return
    }
    if (priceError) {
      toast.error(priceError)
      return
    }
    if (brand.length > 120) {
      toast.error('Brand must be at most 120 characters')
      return
    }
    if (description.length > 4000) {
      toast.error('Description must be at most 4000 characters')
      return
    }
    if (quantityError) {
      toast.error(quantityError)
      return
    }
    if (rentalError) {
      toast.error(rentalError)
      return
    }
    const price = parseAmount(form.price)
    const rentalPrice = parseAmount(form.rentalPrice)
    const quantityAvailable = parseAmount(form.quantityAvailable)
    if (price == null) {
      toast.error('Price is required')
      return
    }
    if ((rentalPrice != null) !== (form.rentalUnit !== '')) {
      toast.error('Rental price and rental unit must be set together')
      return
    }
    const payload = {
      name,
      type: form.type,
      providerId: form.providerId,
      categoryId: form.categoryId,
      unit,
      currency,
      price,
      status: form.status,
      description: blankToNull(form.description),
      brand: blankToNull(form.brand),
      quantityAvailable,
      rentalPrice,
      rentalUnit: form.rentalUnit && isRentalUnit(form.rentalUnit) ? form.rentalUnit : null,
    }
    setIsSaving(true)
    try {
      if (editing) await updateListing(editing.id, payload)
      else await createListing(payload)
      setDialogOpen(false)
      toast.message(editing ? 'Listing updated' : 'Listing created')
      if (!editing) setPage(1)
      await remote.refetch()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not save listing')
    } finally {
      setIsSaving(false)
    }
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

  const providerOptions =
    !editing || providers.some((provider) => provider.id === editing.providerId)
      ? providers
      : [
          {
            id: editing.providerId,
            ownerUserId: '',
            name: editing.providerName,
            description: null,
            logoUrl: null,
            phone: null,
            whatsapp: null,
            email: null,
            website: null,
            address: null,
            city: null,
            country: null,
            lat: null,
            lng: null,
            status: 'APPROVED' as const,
            createdAt: editing.createdAt,
            updatedAt: editing.updatedAt,
            owner: { id: '', email: '', displayName: null },
          },
          ...providers,
        ]

  const categoryOptions =
    categories.some((category) => category.id === form.categoryId) || !form.categoryId
      ? categories
      : editing && editing.categoryId === form.categoryId
        ? [
            {
              id: editing.categoryId,
              name: editing.categoryName,
              kind: editing.type,
              slug: '',
              parentId: null,
              parentName: null,
              isActive: true,
              sortOrder: 0,
              childCount: 0,
              listingCount: 0,
              createdAt: editing.createdAt,
              updatedAt: editing.updatedAt,
            } satisfies Category,
            ...categories,
          ]
        : categories

  const showCards = !embedded && view === 'cards'
  const addButton = isAdmin ? (
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
          showCards ? <CardGridSkeleton media="listing" /> : <TableSkeleton columns={isAdmin ? 7 : 6} />
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
                    className="flex min-w-0 items-stretch gap-3 rounded-lg border border-border p-3"
                  >
                    <ListingThumb type={listing.type} />
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
                        {isAdmin ? (
                          <div className="shrink-0">
                            <ListingActions
                              listing={listing}
                              busy={busyId === listing.id}
                              onEdit={openEdit}
                              onDelete={setPendingDelete}
                            />
                          </div>
                        ) : null}
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
                  {isAdmin ? <TableHead className="text-right">Actions</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 6} className="text-muted-foreground">
                      No listings match.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((listing) => (
                    <TableRow key={listing.id}>
                      <TableCell className="max-w-56 truncate" title={listing.name}>
                        {ellipsis(listing.name, 36)}
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
                      {isAdmin ? (
                        <TableCell className="text-right">
                          <ListingActions
                            listing={listing}
                            busy={busyId === listing.id}
                            onEdit={openEdit}
                            onDelete={setPendingDelete}
                          />
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </DataPanel>
      </AsyncState>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[min(90vh,44rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit listing' : 'Add listing'}</DialogTitle>
            <DialogDescription>Directory record for a provider. Price is information only.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="listing-name">Name</Label>
              <Input
                id="listing-name"
                value={form.name}
                maxLength={160}
                placeholder="Portland cement"
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="listing-type">Type</Label>
              <Select
                items={LISTING_TYPES.map((type) => ({ value: type, label: listingTypeLabel(type) }))}
                value={form.type}
                onValueChange={(value) => {
                  if (value && isListingType(value)) {
                    setForm((current) => ({
                      ...current,
                      type: value,
                      categoryId: current.type === value ? current.categoryId : '',
                    }))
                  }
                }}
              >
                <SelectTrigger id="listing-type" className="w-full">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {LISTING_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {listingTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {providerId ? null : (
              <div className="grid gap-1.5">
                <Label htmlFor="listing-provider">Provider</Label>
                <Select
                  items={providerOptions.map((provider) => ({ value: provider.id, label: provider.name }))}
                  value={form.providerId}
                  onValueChange={(value) => {
                    if (!value) return
                    setForm((current) => ({ ...current, providerId: value }))
                  }}
                >
                  <SelectTrigger id="listing-provider" className="w-full">
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {providerOptions.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="listing-category">Category</Label>
              <Select
                items={categoryOptions.map((category) => ({ value: category.id, label: category.name }))}
                value={form.categoryId}
                onValueChange={(value) => {
                  if (!value) return
                  setForm((current) => ({ ...current, categoryId: value }))
                }}
              >
                <SelectTrigger id="listing-category" className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor="listing-price">Price</Label>
                <Input
                  id="listing-price"
                  inputMode="decimal"
                  maxLength={18}
                  placeholder="42.50"
                  value={form.price}
                  onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="listing-currency">Currency</Label>
                <Input
                  id="listing-currency"
                  value={form.currency}
                  maxLength={3}
                  placeholder="USD"
                  onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="listing-unit">Unit</Label>
                <Input
                  id="listing-unit"
                  value={form.unit}
                  maxLength={40}
                  placeholder="ton"
                  onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="listing-status">Status</Label>
              <Select
                items={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'INACTIVE', label: 'Inactive' },
                ]}
                value={form.status}
                onValueChange={(value) => {
                  if (value === 'ACTIVE' || value === 'INACTIVE') {
                    setForm((current) => ({ ...current, status: value }))
                  }
                }}
              >
                <SelectTrigger id="listing-status" className="w-full">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="listing-brand">Brand</Label>
              <Input
                id="listing-brand"
                value={form.brand}
                maxLength={120}
                placeholder="Lafarge"
                onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))}
              />
            </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="listing-description">Description</Label>
              <Textarea
                id="listing-description"
                value={form.description}
                maxLength={4000}
                placeholder="Strength, size, and how it is sold"
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor="listing-quantity">Quantity</Label>
                <Input
                  id="listing-quantity"
                  inputMode="decimal"
                  maxLength={18}
                  placeholder="100"
                  value={form.quantityAvailable}
                  onChange={(event) => setForm((current) => ({ ...current, quantityAvailable: event.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="listing-rental-price">Rental price</Label>
                <Input
                  id="listing-rental-price"
                  inputMode="decimal"
                  maxLength={18}
                  placeholder="25"
                  value={form.rentalPrice}
                  onChange={(event) => setForm((current) => ({ ...current, rentalPrice: event.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="listing-rental-unit">Rental unit</Label>
                <Select
                  items={[
                    { value: 'none', label: 'None' },
                    ...RENTAL_UNITS.map((unit) => ({ value: unit, label: rentalUnitLabel(unit) })),
                  ]}
                  value={form.rentalUnit || 'none'}
                  onValueChange={(value) => {
                    if (!value) return
                    setForm((current) => ({ ...current, rentalUnit: value === 'none' ? '' : value }))
                  }}
                >
                  <SelectTrigger id="listing-rental-unit" className="w-full">
                    <SelectValue placeholder="Select a rental unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {RENTAL_UNITS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {rentalUnitLabel(unit)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()} disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
