import { useCallback, useEffect, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { AsyncState } from '@/components/feedback/async-state'
import { DetailSkeleton } from '@/components/feedback/skeletons'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  localizedListingCategoryName,
  RENTAL_UNITS,
  updateListing,
} from '@/services/listings'
import { useLocaleStore } from '@/stores/localeStore'

import { ListingFields } from './components/ListingFields'
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
  const locale = useLocaleStore((state) => state.locale)
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
    void listCategories(1, 100, { includeCounts: false })
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
              nameAr: listing.categoryNameAr,
              kind: listing.type ?? 'MATERIAL',
              slug: '',
              parentId: null,
              parentName: null,
              parentNameAr: null,
              imagePath: null,
              imageUrl: null,
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
                  {isSaving ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Save className="size-4" />
                  )}
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
                      {listing.type ? ` · ${t(`admin:listingType.${listing.type}`)}` : ''}
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
                  <ListingFields
                    form={form}
                    onChange={setForm}
                    categories={categoryOptions}
                    idPrefix="detail"
                  />
                ) : (
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        {t('admin:listings.headers.category')}
                      </dt>
                      <dd className="text-sm font-medium">
                        {localizedListingCategoryName(listing, locale) || '—'}
                      </dd>
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
                              RENTAL_UNITS.includes(listing.rentalUnit)
                                ? t(`admin:listings.form.rentalUnits.${listing.rentalUnit}`)
                                : listing.rentalUnit
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
