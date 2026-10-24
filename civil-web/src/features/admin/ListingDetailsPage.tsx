import { useCallback, useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { DetailSkeleton } from '@/components/feedback/skeletons'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { usePermissions } from '@/hooks/usePermissions'
import { useRemoteData } from '@/hooks/useRemoteData'
import { portalBaseFromPath } from '@/lib/homePath'
import { ApiError } from '@/services/api'
import { type Category, listCategories } from '@/services/categories'
import {
  getListingById,
  isListingType,
  type Listing,
  LISTING_TYPES,
  listingTypeLabel,
  RENTAL_UNITS,
  rentalUnitLabel,
  updateListing,
} from '@/services/listings'

import { ListingImagesSection } from './components/ListingImagesSection'
import { EMPTY_LISTING_FORM, formFromListing, type ListingForm } from './listings.form'
import { listingWriteFromForm } from './listings.schema'

export function ListingDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const listingsPath = `${portalBaseFromPath(location.pathname)}/listings`
  const { isAdmin, role } = usePermissions()
  const canManage = isAdmin || role === 'PROVIDER'

  const load = useCallback(() => {
    if (!id) throw new Error('Listing ID is required')
    return getListingById(id)
  }, [id])
  const remote = useRemoteData(load, { queryKey: ['listings', 'detail', id ?? ''] })
  const listing: Listing | null = remote.status === 'success' ? remote.data.data : null

  useDocumentTitle(listing ? `Listing: ${listing.name}` : 'Listing details')

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState<ListingForm>(EMPTY_LISTING_FORM)
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    if (!listing || !isEditing) return
    setForm(formFromListing(listing))
  }, [isEditing, listing])

  useEffect(() => {
    if (!isEditing) return
    let cancelled = false
    void listCategories(1, 100, { kind: form.type })
      .then((result) => {
        if (!cancelled) setCategories(result.data)
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof ApiError ? error.message : 'Could not load categories')
        }
      })
    return () => {
      cancelled = true
    }
  }, [form.type, isEditing])

  const breadcrumbs = [
    { label: 'Listings', to: listingsPath },
    { label: listing?.name ?? 'Listing details' },
  ]

  async function handleSave() {
    if (!id || !listing) return
    const category = categories.find((item) => item.id === form.categoryId)
    if (category && category.kind !== form.type) {
      toast.error('Category must match the listing type')
      return
    }
    const parsed = listingWriteFromForm({
      ...form,
      providerId: listing.providerId,
    })
    if ('error' in parsed) {
      toast.error(parsed.error)
      return
    }
    setIsSaving(true)
    try {
      await updateListing(id, parsed.data)
      toast.success('Listing updated')
      setIsEditing(false)
      await remote.refetch()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not save listing')
    } finally {
      setIsSaving(false)
    }
  }

  const categoryOptions =
    categories.some((category) => category.id === form.categoryId) || !form.categoryId
      ? categories
      : listing && listing.categoryId === form.categoryId
        ? [
            {
              id: listing.categoryId,
              name: listing.categoryName,
              kind: listing.type,
              slug: '',
              parentId: null,
              parentName: null,
              isActive: true,
              sortOrder: 0,
              childCount: 0,
              listingCount: 0,
              createdAt: listing.createdAt,
              updatedAt: listing.updatedAt,
            } satisfies Category,
            ...categories,
          ]
        : categories

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title={listing?.name ?? 'Listing details'}
        description="Listing info and gallery. The main image is the cover on manage listings."
        breadcrumbs={breadcrumbs}
        actions={
          listing && canManage ? (
            isEditing ? (
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
                  <Save className="size-4" />
                  {isSaving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            ) : (
              <Button type="button" onClick={() => setIsEditing(true)}>
                Edit details
              </Button>
            )
          ) : undefined
        }
      />

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.isError ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingFallback={<DetailSkeleton />}
      >
        {listing ? (
          <div className="grid min-w-0 gap-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle>Listing details</CardTitle>
                    <CardDescription>
                      {listing.providerName} · {listingTypeLabel(listing.type)}
                    </CardDescription>
                  </div>
                  <Badge variant={listing.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {listing.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <Label htmlFor="detail-name">Name</Label>
                        <Input
                          id="detail-name"
                          value={form.name}
                          maxLength={160}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, name: event.target.value }))
                          }
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="detail-type">Type</Label>
                        <Select
                          items={LISTING_TYPES.map((type) => ({
                            value: type,
                            label: listingTypeLabel(type),
                          }))}
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
                          <SelectTrigger id="detail-type" className="w-full">
                            <SelectValue />
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
                      <div className="grid gap-1.5">
                        <Label htmlFor="detail-category">Category</Label>
                        <Select
                          items={categoryOptions.map((category) => ({
                            value: category.id,
                            label: category.name,
                          }))}
                          value={form.categoryId}
                          onValueChange={(value) => {
                            if (!value) return
                            setForm((current) => ({ ...current, categoryId: value }))
                          }}
                        >
                          <SelectTrigger id="detail-category" className="w-full">
                            <SelectValue />
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
                      <div className="grid gap-1.5">
                        <Label htmlFor="detail-status">Status</Label>
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
                          <SelectTrigger id="detail-status" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="grid gap-1.5">
                        <Label htmlFor="detail-price">Price</Label>
                        <Input
                          id="detail-price"
                          inputMode="decimal"
                          value={form.price}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, price: event.target.value }))
                          }
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="detail-currency">Currency</Label>
                        <Input
                          id="detail-currency"
                          maxLength={3}
                          value={form.currency}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, currency: event.target.value }))
                          }
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="detail-unit">Unit</Label>
                        <Input
                          id="detail-unit"
                          value={form.unit}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, unit: event.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <Label htmlFor="detail-brand">Brand</Label>
                        <Input
                          id="detail-brand"
                          value={form.brand}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, brand: event.target.value }))
                          }
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="detail-qty">Quantity available</Label>
                        <Input
                          id="detail-qty"
                          value={form.quantityAvailable}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              quantityAvailable: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="detail-rental-price">Rental price</Label>
                        <Input
                          id="detail-rental-price"
                          value={form.rentalPrice}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, rentalPrice: event.target.value }))
                          }
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="detail-rental-unit">Rental unit</Label>
                        <Select
                          items={[
                            { value: '', label: 'None' },
                            ...RENTAL_UNITS.map((unit) => ({
                              value: unit,
                              label: rentalUnitLabel(unit),
                            })),
                          ]}
                          value={form.rentalUnit}
                          onValueChange={(value) =>
                            setForm((current) => ({ ...current, rentalUnit: value ?? '' }))
                          }
                        >
                          <SelectTrigger id="detail-rental-unit" className="w-full">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {RENTAL_UNITS.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {rentalUnitLabel(unit)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="detail-description">Description</Label>
                      <Textarea
                        id="detail-description"
                        rows={4}
                        value={form.description}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, description: event.target.value }))
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-muted-foreground">Category</dt>
                      <dd className="text-sm font-medium">{listing.categoryName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Brand</dt>
                      <dd className="text-sm font-medium">{listing.brand || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Price</dt>
                      <dd className="text-sm font-medium">
                        {listing.currency} {listing.price} / {listing.unit}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Quantity</dt>
                      <dd className="text-sm font-medium">{listing.quantityAvailable || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Rental</dt>
                      <dd className="text-sm font-medium">
                        {listing.rentalPrice && listing.rentalUnit
                          ? `${listing.currency} ${listing.rentalPrice} / ${rentalUnitLabel(listing.rentalUnit)}`
                          : '—'}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-muted-foreground">Description</dt>
                      <dd className="text-sm leading-6 text-foreground">
                        {listing.description?.trim() || 'No description'}
                      </dd>
                    </div>
                  </dl>
                )}
              </CardContent>
            </Card>

            {id ? (
              <ListingImagesSection
                listingId={id}
                canManage={canManage}
                onChanged={() => void remote.refetch()}
              />
            ) : null}
          </div>
        ) : null}
      </AsyncState>
    </div>
  )
}
