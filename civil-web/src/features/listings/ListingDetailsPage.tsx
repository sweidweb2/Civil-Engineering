import { useCallback, useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { usePermissions } from '@/hooks/usePermissions'
import { useRemoteData } from '@/hooks/useRemoteData'
import { portalBaseFromPath } from '@/lib/homePath'
import { ApiError } from '@/services/api'
import { type Category, listCategories } from '@/services/categories'
import {
  formatListingPrice,
  getListingById,
  type Listing,
  listingTypeLabel,
  RENTAL_UNITS,
  rentalUnitLabel,
  updateListing,
} from '@/services/listings'

import { ListingImagesSection } from './components/ListingImagesSection'
import { EMPTY_LISTING_FORM, formFromListing, type ListingForm } from './listings.form'
import { listingWriteFromForm } from './listings.schema'

function isListingCategory(category: Category) {
  return (
    category.kind === 'MATERIAL' || category.kind === 'EQUIPMENT' || category.kind === 'SERVICE'
  )
}

export function ListingDetailsPage() {
  const { t } = useTranslation(['admin', 'common'])
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const listingsPath = `${portalBaseFromPath(location.pathname)}/listings`
  const { isAdmin, role } = usePermissions()
  const canManage = isAdmin || role === 'PROVIDER'

  const load = useCallback(() => {
    if (!id) throw new Error(t('admin:listings.idRequired'))
    return getListingById(id)
  }, [id, t])
  const remote = useRemoteData(load, { queryKey: ['listings', 'detail', id ?? ''] })
  const listing: Listing | null = remote.status === 'success' ? remote.data.data : null

  useDocumentTitle(
    listing
      ? t('admin:listings.documentTitleDetail', { name: listing.name })
      : t('admin:listings.detailsTitle'),
  )

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
    void listCategories(1, 100)
      .then((result) => {
        if (!cancelled) setCategories(result.data.filter(isListingCategory))
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(
            error instanceof ApiError ? error.message : t('admin:listings.couldNotLoadCategories'),
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [isEditing, t])

  const breadcrumbs = [
    { label: t('admin:listings.title'), to: listingsPath },
    { label: listing?.name ?? t('admin:listings.detailsTitle') },
  ]

  async function handleSave() {
    if (!id || !listing) return
    const parsed = listingWriteFromForm({
      ...form,
      providerId: listing.providerId ?? '',
    })
    if ('error' in parsed) {
      toast.error(t(`admin:listings.form.${parsed.error}`))
      return
    }
    setIsSaving(true)
    try {
      await updateListing(id, parsed.data)
      toast.success(t('admin:listings.form.updated'))
      setIsEditing(false)
      await remote.refetch()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('admin:listings.form.couldNotSave'))
    } finally {
      setIsSaving(false)
    }
  }

  const categoryOptions =
    categories.some((category) => category.id === form.categoryId) || !form.categoryId
      ? categories
      : listing && listing.categoryId && listing.categoryId === form.categoryId
        ? [
            {
              id: listing.categoryId,
              name: listing.categoryName ?? t('admin:listings.form.categoryFallback'),
              kind: listing.type ?? 'MATERIAL',
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

  function rentalLabel(unit: (typeof RENTAL_UNITS)[number]) {
    return t(`admin:listings.form.rentalUnits.${unit}`, { defaultValue: rentalUnitLabel(unit) })
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        className="mb-0"
        title={listing?.name ?? t('admin:listings.detailsTitle')}
        description={t('admin:listings.detailsDescription')}
        breadcrumbs={breadcrumbs}
        actions={
          listing && canManage ? (
            isEditing ? (
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  {t('common:cancel')}
                </Button>
                <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
                  <Save className="size-4" />
                  {isSaving ? t('common:saving') : t('common:save')}
                </Button>
              </div>
            ) : (
              <Button type="button" onClick={() => setIsEditing(true)}>
                {t('admin:listings.editDetails')}
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
                    <CardTitle>{t('admin:listings.detailsTitle')}</CardTitle>
                    <CardDescription>
                      {listing.providerName ?? t('admin:listings.noProvider')}
                      {listing.type ? ` · ${listingTypeLabel(listing.type)}` : ''}
                    </CardDescription>
                  </div>
                  <Badge variant={listing.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {listing.status === 'ACTIVE'
                      ? t('admin:listingStatus.ACTIVE')
                      : t('admin:listingStatus.INACTIVE')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <Label htmlFor="detail-name">{t('admin:listings.form.name')}</Label>
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
                        <Label htmlFor="detail-category">{t('admin:listings.form.category')}</Label>
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
                        <Label htmlFor="detail-status">{t('admin:listings.form.status')}</Label>
                        <Select
                          items={[
                            { value: 'ACTIVE', label: t('admin:listingStatus.ACTIVE') },
                            { value: 'INACTIVE', label: t('admin:listingStatus.INACTIVE') },
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
                            <SelectItem value="ACTIVE">
                              {t('admin:listingStatus.ACTIVE')}
                            </SelectItem>
                            <SelectItem value="INACTIVE">
                              {t('admin:listingStatus.INACTIVE')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="detail-currency">{t('admin:listings.form.currency')}</Label>
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
                        <Label htmlFor="detail-unit">{t('admin:listings.form.unit')}</Label>
                        <Input
                          id="detail-unit"
                          value={form.unit}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, unit: event.target.value }))
                          }
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="detail-brand">{t('admin:listings.form.brand')}</Label>
                        <Input
                          id="detail-brand"
                          value={form.brand}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, brand: event.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                      <Label htmlFor="detail-price-range">
                        {t('admin:listings.form.priceRange')}
                      </Label>
                      <Switch
                        id="detail-price-range"
                        checked={form.hasPriceRange}
                        onCheckedChange={(checked) =>
                          setForm((current) => ({
                            ...current,
                            hasPriceRange: checked,
                            price: checked ? '' : current.price,
                            priceMin: checked ? current.priceMin : '',
                            priceMax: checked ? current.priceMax : '',
                          }))
                        }
                      />
                    </div>
                    {form.hasPriceRange ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="grid gap-1.5">
                          <Label htmlFor="detail-price-min">
                            {t('admin:listings.form.minPrice')}
                          </Label>
                          <Input
                            id="detail-price-min"
                            inputMode="decimal"
                            value={form.priceMin}
                            onChange={(event) =>
                              setForm((current) => ({ ...current, priceMin: event.target.value }))
                            }
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor="detail-price-max">
                            {t('admin:listings.form.maxPrice')}
                          </Label>
                          <Input
                            id="detail-price-max"
                            inputMode="decimal"
                            value={form.priceMax}
                            onChange={(event) =>
                              setForm((current) => ({ ...current, priceMax: event.target.value }))
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-1.5">
                        <Label htmlFor="detail-price">{t('admin:listings.form.price')}</Label>
                        <Input
                          id="detail-price"
                          inputMode="decimal"
                          value={form.price}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, price: event.target.value }))
                          }
                        />
                      </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <Label htmlFor="detail-qty">{t('admin:listings.quantityAvailable')}</Label>
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
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                      <Label htmlFor="detail-for-rent">
                        {t('admin:listings.form.availableForRent')}
                      </Label>
                      <Switch
                        id="detail-for-rent"
                        checked={form.isForRent}
                        onCheckedChange={(checked) =>
                          setForm((current) => ({
                            ...current,
                            isForRent: checked,
                            rentalPrice: checked ? current.rentalPrice : '',
                            rentalUnit: checked ? current.rentalUnit : '',
                          }))
                        }
                      />
                    </div>
                    {form.isForRent ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="grid gap-1.5">
                          <Label htmlFor="detail-rental-price">
                            {t('admin:listings.form.rentalPrice')}
                          </Label>
                          <Input
                            id="detail-rental-price"
                            value={form.rentalPrice}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                rentalPrice: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor="detail-rental-unit">
                            {t('admin:listings.form.rentalUnit')}
                          </Label>
                          <Select
                            items={RENTAL_UNITS.map((unit) => ({
                              value: unit,
                              label: rentalLabel(unit),
                            }))}
                            value={form.rentalUnit || undefined}
                            onValueChange={(value) =>
                              setForm((current) => ({ ...current, rentalUnit: value ?? '' }))
                            }
                          >
                            <SelectTrigger id="detail-rental-unit" className="w-full">
                              <SelectValue
                                placeholder={t('admin:listings.form.selectRentalUnit')}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {RENTAL_UNITS.map((unit) => (
                                <SelectItem key={unit} value={unit}>
                                  {rentalLabel(unit)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-1.5">
                      <Label htmlFor="detail-description">
                        {t('admin:listings.form.descriptionLabel')}
                      </Label>
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
                      <dt className="text-xs text-muted-foreground">
                        {t('admin:listings.headers.category')}
                      </dt>
                      <dd className="text-sm font-medium">{listing.categoryName || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        {t('admin:listings.form.brand')}
                      </dt>
                      <dd className="text-sm font-medium">{listing.brand || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        {t('admin:listings.headers.price')}
                      </dt>
                      <dd className="text-sm font-medium">{formatListingPrice(listing)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        {t('admin:listings.quantity')}
                      </dt>
                      <dd className="text-sm font-medium">{listing.quantityAvailable || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        {t('admin:listings.rental')}
                      </dt>
                      <dd className="text-sm font-medium">
                        {listing.rentalPrice && listing.rentalUnit
                          ? `${listing.currency} ${listing.rentalPrice} / ${
                              RENTAL_UNITS.includes(
                                listing.rentalUnit as (typeof RENTAL_UNITS)[number],
                              )
                                ? rentalLabel(listing.rentalUnit as (typeof RENTAL_UNITS)[number])
                                : rentalUnitLabel(listing.rentalUnit)
                            }`
                          : '—'}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-muted-foreground">
                        {t('admin:listings.form.descriptionLabel')}
                      </dt>
                      <dd className="text-sm leading-6 text-foreground">
                        {listing.description?.trim() || t('admin:listings.noDescription')}
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
