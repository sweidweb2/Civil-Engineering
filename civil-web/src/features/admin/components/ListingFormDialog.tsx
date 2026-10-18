import { useEffect, useState } from 'react'
import { toast } from 'sonner'

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
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/services/api'
import { type Category, listCategories } from '@/services/categories'
import {
  createListing,
  isListingType,
  type Listing,
  LISTING_TYPES,
  listingTypeLabel,
  RENTAL_UNITS,
  rentalUnitLabel,
  updateListing,
} from '@/services/listings'
import { listProviders, type Provider } from '@/services/providers'

import { EMPTY_LISTING_FORM, formFromListing, type ListingForm } from '../listings.form'
import { listingWriteFromForm } from '../listings.schema'

type ListingFormDialogProps = {
  open: boolean
  listing: Listing | null
  lockedProviderId?: string
  onOpenChange: (open: boolean) => void
  onSaved: (created: boolean) => void
}

export function ListingFormDialog({
  open,
  listing,
  lockedProviderId,
  onOpenChange,
  onSaved,
}: ListingFormDialogProps) {
  const [form, setForm] = useState<ListingForm>(EMPTY_LISTING_FORM)
  const [providers, setProviders] = useState<Provider[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(listing ? formFromListing(listing) : { ...EMPTY_LISTING_FORM, providerId: lockedProviderId ?? '' })
  }, [listing, lockedProviderId, open])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const providersRequest = lockedProviderId ? Promise.resolve({ data: [] as Provider[] }) : listProviders(1, 100)
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
  }, [form.type, lockedProviderId, open])

  const providerOptions =
    !listing || providers.some((provider) => provider.id === listing.providerId)
      ? providers
      : [
          {
            id: listing.providerId,
            ownerUserId: '',
            name: listing.providerName,
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
            createdAt: listing.createdAt,
            updatedAt: listing.updatedAt,
            owner: { id: '', email: '', displayName: null },
          },
          ...providers,
        ]

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

  async function save() {
    const category = categories.find((item) => item.id === form.categoryId)
    if (category && category.kind !== form.type) {
      toast.error('Category must match the listing type')
      return
    }
    const parsed = listingWriteFromForm(form)
    if ('error' in parsed) {
      toast.error(parsed.error)
      return
    }
    setIsSaving(true)
    try {
      if (listing) await updateListing(listing.id, parsed.data)
      else await createListing(parsed.data)
      onOpenChange(false)
      toast.message(listing ? 'Listing updated' : 'Listing created')
      onSaved(!listing)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not save listing')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,44rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{listing ? 'Edit listing' : 'Add listing'}</DialogTitle>
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
            {lockedProviderId ? null : (
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
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void save()} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
