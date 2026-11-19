import { useCallback, useEffect, useState } from 'react'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'

import {
  EMPTY_LISTING_FORM,
  formFromListing,
  type ListingFormValues,
} from '@/features/provider/listing.form'
import { listingWriteFromForm } from '@/features/provider/listing.schema'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { useRemoteData } from '@/hooks/useRemoteData'
import { cacheKeys, invalidateListingCaches } from '@/lib/cacheKeys'
import { isListingCategory, listCategories } from '@/services/categories'
import type { PickedFile } from '@/services/filePicker'
import { uploadQueuedImages } from '@/services/galleryImages'
import { createListing, getListingById, updateListing } from '@/services/listings'
import { listProviders } from '@/services/providers'
import { useToastApiError, useToastSuccess } from '@/services/toast'

type UseListingEditorOptions = {
  mode: 'create' | 'edit'
  listingId?: string
  basePath: string
  /** Admin picks the provider; providers resolve it server-side. */
  isAdmin: boolean
}

/** Load (listing, categories, providers picker) + form state + save for the listing editor. */
export function useListingEditor({ mode, listingId, basePath, isAdmin }: UseListingEditorOptions) {
  const { t } = useTranslation()
  const toastApiError = useToastApiError()
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()

  const [form, setForm] = useState<ListingFormValues>(EMPTY_LISTING_FORM)
  const [formError, setFormError] = useState<string | undefined>()
  /** Field the current `formError` belongs to, when validation can tell. */
  const [formErrorField, setFormErrorField] = useState<keyof ListingFormValues | undefined>()
  const [isSaving, setIsSaving] = useState(false)
  const [queuedImages, setQueuedImages] = useState<PickedFile[]>([])
  const [selectedProviderId, setSelectedProviderId] = useState('')

  const loadListing = useCallback(() => {
    if (!listingId) return Promise.reject(new Error('Listing id required'))
    return getListingById(listingId)
  }, [listingId])
  const listingRemote = useRemoteData(loadListing, {
    enabled: mode === 'edit' && Boolean(listingId),
  })

  const loadCategories = useCallback(
    async () =>
      (await listCategories(1, 100, { includeCounts: false })).data.filter(isListingCategory),
    [],
  )
  const categoriesRemote = useRemoteData(loadCategories, { cacheKey: cacheKeys.categoriesPicker })

  const loadProviders = useCallback(
    async () => (await listProviders(1, 100, undefined, undefined, false)).data,
    [],
  )
  const providersRemote = useRemoteData(loadProviders, {
    enabled: isAdmin,
    cacheKey: cacheKeys.providersPicker,
  })

  const listingData = listingRemote.status === 'success' ? listingRemote.data.data : null

  useEffect(() => {
    if (mode !== 'edit' || !listingData) return
    setForm(formFromListing(listingData))
    if (listingData.providerId) setSelectedProviderId(listingData.providerId)
  }, [listingData, mode])

  function setField<K extends keyof ListingFormValues>(key: K, value: ListingFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setFormError(undefined)
    setFormErrorField(undefined)
  }

  async function save() {
    if (isAdmin && !selectedProviderId) {
      setFormError(t('listings.selectProvider'))
      return
    }
    // Provider role: backend resolves providerId from the session.
    const parsed = listingWriteFromForm(form, isAdmin ? selectedProviderId : undefined)
    if ('error' in parsed) {
      setFormError(parsed.error)
      setFormErrorField(parsed.field)
      return
    }

    setIsSaving(true)
    try {
      if (mode === 'create') {
        const created = await createListing(parsed.data)
        toastSuccess(t('listings.created'))
        if (queuedImages.length > 0) {
          const failed = await uploadQueuedImages('listing', created.data.id, queuedImages)
          if (failed > 0) toastApiError(new Error(t('gallery.someFailed', { count: failed })))
        }
        // Invalidate after uploads so list thumbnails aren't cached without images.
        invalidateListingCaches()
        router.replace(`${basePath}/${created.data.id}` as never)
      } else if (listingId) {
        await updateListing(listingId, parsed.data)
        invalidateListingCaches()
        toastSuccess(t('listings.saved'))
        router.replace(`${basePath}/${listingId}` as never)
      }
    } catch (error) {
      handleApiError(error, t(mode === 'create' ? 'listings.createFailed' : 'listings.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  const categories = categoriesRemote.status === 'success' ? categoriesRemote.data : []
  const providers = providersRemote.status === 'success' ? providersRemote.data : []

  return {
    form,
    setField,
    formError,
    formErrorField,
    isSaving,
    canSave: !isSaving && (!isAdmin || Boolean(selectedProviderId)),
    save,
    setQueuedImages,
    selectedProviderId,
    setSelectedProviderId,
    categoryOptions: categories.map((category) => ({ value: category.id, label: category.name })),
    categories,
    isCategoriesLoading: categoriesRemote.isLoading,
    providerOptions: providers.map((provider) => ({ value: provider.id, label: provider.name })),
    isBootLoading: mode === 'edit' && listingRemote.isLoading,
    bootError: listingRemote.status === 'error' ? listingRemote.error : undefined,
    retry: () => {
      if (mode === 'edit') void listingRemote.refetch()
    },
  }
}
