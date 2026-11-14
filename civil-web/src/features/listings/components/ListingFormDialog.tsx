import { useEffect, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'
import { type Category, listCategories } from '@/services/categories'
import { uploadListingImage } from '@/services/listingImages'
import { createListing, type Listing, updateListing } from '@/services/listings'
import { listProviders, type Provider } from '@/services/providers'

import { EMPTY_LISTING_FORM, formFromListing, type ListingForm } from '../listings.form'
import { listingWriteFromForm } from '../listings.schema'
import { ListingFields } from './ListingFields'

const MAX_MAIN_IMAGE_BYTES = 10 * 1024 * 1024
const ALLOWED_MAIN_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

type ListingFormDialogProps = {
  open: boolean
  listing: Listing | null
  lockedProviderId?: string
  onOpenChange: (open: boolean) => void
  onSaved: (created: boolean) => void
}

function isListingCategory(category: Category) {
  return (
    category.kind === 'MATERIAL' || category.kind === 'EQUIPMENT' || category.kind === 'SERVICE'
  )
}

export function ListingFormDialog({
  open,
  listing,
  lockedProviderId,
  onOpenChange,
  onSaved,
}: ListingFormDialogProps) {
  const { t } = useTranslation(['admin', 'common'])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<ListingForm>(EMPTY_LISTING_FORM)
  const [providers, setProviders] = useState<Provider[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [mainImageFile, setMainImageFile] = useState<File | null>(null)
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm(
      listing
        ? formFromListing(listing)
        : { ...EMPTY_LISTING_FORM, providerId: lockedProviderId ?? '' },
    )
    setMainImageFile(null)
    setMainImagePreview(listing?.mainImageUrl ?? null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [listing, lockedProviderId, open])

  useEffect(() => {
    if (!mainImageFile) return
    const objectUrl = URL.createObjectURL(mainImageFile)
    setMainImagePreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [mainImageFile])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const providersRequest = lockedProviderId
      ? Promise.resolve({ data: [] as Provider[] })
      : listProviders(1, 100)
    void Promise.all([providersRequest, listCategories(1, 100, { includeCounts: false })])
      .then(([providerResult, categoryResult]) => {
        if (cancelled) return
        setProviders(providerResult.data)
        setCategories(categoryResult.data.filter(isListingCategory))
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(
            error instanceof ApiError
              ? error.message
              : t('admin:listings.form.couldNotLoadOptions'),
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [lockedProviderId, open, t])

  const providerOptions =
    !listing ||
    !listing.providerId ||
    providers.some((provider) => provider.id === listing.providerId)
      ? providers
      : [
          {
            id: listing.providerId,
            ownerUserId: '',
            name: listing.providerName ?? t('admin:listings.form.providerFallback'),
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

  function onMainImageSelected(file: File | undefined) {
    if (!file) return
    if (!ALLOWED_MAIN_IMAGE_TYPES.includes(file.type)) {
      toast.error(t('admin:listings.form.invalidImageType'))
      return
    }
    if (file.size > MAX_MAIN_IMAGE_BYTES) {
      toast.error(t('admin:listings.form.imageTooLarge'))
      return
    }
    setMainImageFile(file)
  }

  function clearMainImageSelection() {
    setMainImageFile(null)
    setMainImagePreview(listing?.mainImageUrl ?? null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function save() {
    const parsed = listingWriteFromForm(form)
    if ('error' in parsed) {
      toast.error(t(`admin:listings.form.${parsed.error}`))
      return
    }
    setIsSaving(true)
    try {
      const saved = listing
        ? await updateListing(listing.id, parsed.data)
        : await createListing(parsed.data)
      if (mainImageFile) {
        try {
          await uploadListingImage(saved.data.id, { file: mainImageFile, isMain: true })
        } catch (uploadError) {
          toast.error(
            uploadError instanceof ApiError
              ? uploadError.message
              : t('admin:listings.form.couldNotUploadImage'),
          )
          onOpenChange(false)
          onSaved(!listing)
          return
        }
      }
      onOpenChange(false)
      toast.message(listing ? t('admin:listings.form.updated') : t('admin:listings.form.created'))
      onSaved(!listing)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('admin:listings.form.couldNotSave'))
    } finally {
      setIsSaving(false)
    }
  }

  const mainImageSlot = (
    <div className="grid gap-1.5">
      <Label id="listing-main-image-label">{t('admin:listings.form.mainImage')}</Label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="sr-only"
        disabled={isSaving}
        onChange={(event) => {
          onMainImageSelected(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      <div
        role="button"
        tabIndex={isSaving ? -1 : 0}
        aria-labelledby="listing-main-image-label"
        aria-disabled={isSaving}
        className={cn(
          'group relative flex aspect-[16/9] w-full cursor-pointer overflow-hidden rounded-lg border border-dashed border-border bg-muted/30 outline-none transition-colors',
          'hover:border-foreground/25 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring',
          mainImagePreview && 'border-solid border-border bg-muted',
          isSaving && 'pointer-events-none cursor-not-allowed opacity-60',
        )}
        onClick={() => {
          if (!isSaving) fileInputRef.current?.click()
        }}
        onKeyDown={(event) => {
          if (isSaving) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            fileInputRef.current?.click()
          }
        }}
      >
        {mainImagePreview ? (
          <>
            <img
              src={mainImagePreview}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-3">
              <span className="text-sm font-medium text-white">
                {t('admin:listings.form.changeImage')}
              </span>
              {mainImageFile ? (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="secondary"
                  className="shrink-0 shadow-sm"
                  aria-label={t('admin:listings.form.removeImage')}
                  onClick={(event) => {
                    event.stopPropagation()
                    clearMainImageSelection()
                  }}
                >
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>
          </>
        ) : (
          <div className="m-auto flex flex-col items-center gap-2 px-4 text-center">
            <span className="flex size-10 items-center justify-center rounded-full border border-dashed border-border bg-background text-muted-foreground">
              <ImagePlus className="size-5" />
            </span>
            <span className="text-sm font-medium text-foreground">
              {t('admin:listings.form.chooseImage')}
            </span>
            <span className="text-xs text-muted-foreground">
              {t('admin:listings.form.mainImageHint')}
            </span>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,44rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {listing ? t('admin:listings.form.editTitle') : t('admin:listings.form.addTitle')}
          </DialogTitle>
          <DialogDescription>{t('admin:listings.form.description')}</DialogDescription>
        </DialogHeader>
        <ListingFields
          form={form}
          onChange={setForm}
          categories={categoryOptions}
          idPrefix="listing"
          providers={lockedProviderId ? undefined : providerOptions}
          afterIdentity={mainImageSlot}
        />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t('common:cancel')}
          </Button>
          <Button type="button" onClick={() => void save()} disabled={isSaving}>
            {isSaving ? t('common:saving') : t('common:save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
