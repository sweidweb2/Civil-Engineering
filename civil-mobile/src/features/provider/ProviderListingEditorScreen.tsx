import { useCallback, useEffect, useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { Banknote, Images, Package } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { GalleryImagesField } from '@/components/files/GalleryImagesField'
import {
  ChoiceField,
  FieldRow,
  FormError,
  FormScreen,
  Section,
  SelectField,
  TextField,
  ToggleRow,
} from '@/components/kit'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import {
  EMPTY_LISTING_FORM,
  formFromListing,
  type ListingFormValues,
} from '@/features/provider/listing.form'
import { listingWriteFromForm } from '@/features/provider/listing.schema'
import { useRemoteData } from '@/hooks/useRemoteData'
import { ApiError } from '@/services/api'
import { type Category, isListingCategory, listCategories } from '@/services/categories'
import { showApiAlert } from '@/services/feedback'
import type { PickedFile } from '@/services/filePicker'
import { uploadQueuedImages } from '@/services/galleryImages'
import {
  createListing,
  getListingById,
  type ListingStatus,
  updateListing,
} from '@/services/listings'
import { getMyProvider, listProviders, type Provider } from '@/services/providers'
import { useToastApiError, useToastSuccess } from '@/services/toast'

const RENTAL_UNITS = ['HOUR', 'DAY', 'WEEK', 'MONTH']

type ProviderListingEditorScreenProps = {
  mode: 'create' | 'edit'
  basePath?: string
  scope?: 'mine' | 'admin'
}

export function ProviderListingEditorScreen({
  mode,
  basePath = '/provider/listings',
  scope = 'mine',
}: ProviderListingEditorScreenProps) {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const listingId = typeof id === 'string' ? id : id?.[0]
  const { t } = useTranslation()
  const toastApiError = useToastApiError()
  const toastSuccess = useToastSuccess()
  const isAdmin = scope === 'admin'

  const [form, setForm] = useState<ListingFormValues>(EMPTY_LISTING_FORM)
  const [formError, setFormError] = useState<string | undefined>()
  const [isSaving, setIsSaving] = useState(false)
  const [queuedImages, setQueuedImages] = useState<PickedFile[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [selectedProviderId, setSelectedProviderId] = useState('')

  const loadMine = useCallback(() => getMyProvider(), [])
  const mineRemote = useRemoteData(loadMine, { enabled: !isAdmin })
  const mineProviderId = mineRemote.status === 'success' ? mineRemote.data.data.id : undefined

  const loadListing = useCallback(() => {
    if (!listingId) return Promise.reject(new Error('Listing id required'))
    return getListingById(listingId)
  }, [listingId])
  const listingRemote = useRemoteData(loadListing, {
    enabled: mode === 'edit' && Boolean(listingId),
  })

  useEffect(() => {
    if (mode !== 'edit' || listingRemote.status !== 'success') return
    const listing = listingRemote.data.data
    setForm(formFromListing(listing))
    if (listing.providerId) setSelectedProviderId(listing.providerId)
  }, [listingRemote, mode])

  useEffect(() => {
    let cancelled = false
    void listCategories(1, 100, { includeCounts: false })
      .then((result) => {
        if (!cancelled) setCategories(result.data.filter(isListingCategory))
      })
      .catch(() => {
        if (!cancelled) setCategories([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    void listProviders(1, 100)
      .then((result) => {
        if (!cancelled) setProviders(result.data)
      })
      .catch(() => {
        if (!cancelled) setProviders([])
      })
    return () => {
      cancelled = true
    }
  }, [isAdmin])

  const providerId = isAdmin ? selectedProviderId || undefined : mineProviderId

  const isBootLoading =
    (!isAdmin && mineRemote.isLoading) || (mode === 'edit' && listingRemote.isLoading)
  const bootError =
    !isAdmin && mineRemote.status === 'error'
      ? mineRemote.error
      : listingRemote.status === 'error'
        ? listingRemote.error
        : undefined

  function setField<K extends keyof ListingFormValues>(key: K, value: ListingFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setFormError(undefined)
  }

  async function onSave() {
    if (!providerId) {
      setFormError(isAdmin ? t('listings.selectProvider') : t('listings.providerNotLoaded'))
      return
    }
    const parsed = listingWriteFromForm(form, providerId)
    if ('error' in parsed) {
      setFormError(parsed.error)
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
        router.replace(`${basePath}/${created.data.id}` as never)
      } else if (listingId) {
        await updateListing(listingId, parsed.data)
        toastSuccess(t('listings.saved'))
        router.replace(`${basePath}/${listingId}` as never)
      }
    } catch (error) {
      if (error instanceof ApiError && error.status >= 500) toastApiError(error)
      else
        showApiAlert(error, t(mode === 'create' ? 'listings.createFailed' : 'listings.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }))
  const providerOptions = providers.map((provider) => ({
    value: provider.id,
    label: provider.name,
  }))
  const fallbackHref = mode === 'edit' && listingId ? `${basePath}/${listingId}` : basePath

  return (
    <FormScreen
      title={t(mode === 'create' ? 'listings.new' : 'listings.edit')}
      backHref={fallbackHref}
      isLoading={isBootLoading}
      error={bootError}
      loadingLabel={t('listings.loadingOne')}
      onRetry={() => {
        if (!isAdmin) void mineRemote.refetch()
        if (mode === 'edit') void listingRemote.refetch()
      }}
      footer={
        <Button
          className="flex-1"
          onPress={() => void onSave()}
          disabled={isSaving || !providerId}
          accessibilityState={{ busy: isSaving }}
        >
          {isSaving ? <ButtonSpinner /> : null}
          <ButtonText>
            {isSaving
              ? t('common.saving')
              : mode === 'create'
                ? t('listings.create')
                : t('common.save')}
          </ButtonText>
        </Button>
      }
    >
      <FormError message={formError} />

      <Section title={t('listings.details')} icon={Package}>
        {isAdmin ? (
          <SelectField
            label={t('listings.provider')}
            required
            options={providerOptions}
            value={selectedProviderId}
            onChange={setSelectedProviderId}
          />
        ) : null}
        <TextField
          label={t('common.name')}
          required
          value={form.name}
          onChangeText={(value) => setField('name', value)}
          placeholder={t('listings.namePlaceholder')}
        />
        <ChoiceField
          label={t('listings.status')}
          options={[
            { value: 'ACTIVE', label: t('common.active') },
            { value: 'INACTIVE', label: t('common.inactive') },
          ]}
          value={form.status}
          onChange={(value) => setField('status', value as ListingStatus)}
        />
        <SelectField
          label={t('listings.category')}
          options={categoryOptions}
          value={form.categoryId}
          onChange={(value) => setField('categoryId', value)}
          allowClear
          placeholder={t('common.optional')}
        />
        <TextField
          label={t('listings.brand')}
          value={form.brand}
          onChangeText={(value) => setField('brand', value)}
        />
        <TextField
          label={t('common.description')}
          multiline
          value={form.description}
          onChangeText={(value) => setField('description', value)}
        />
      </Section>

      <Section title={t('listings.pricing')} icon={Banknote} tone="success">
        <TextField
          label={t('listings.price')}
          value={form.price}
          onChangeText={(value) => setField('price', value)}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />
        <FieldRow>
          <TextField
            label={t('listings.currency')}
            value={form.currency}
            onChangeText={(value) => setField('currency', value.toUpperCase())}
            autoCapitalize="characters"
            maxLength={3}
            placeholder="USD"
          />
          <TextField
            label={t('listings.unit')}
            value={form.unit}
            onChangeText={(value) => setField('unit', value)}
            placeholder="kg, m3"
          />
        </FieldRow>
        <TextField
          label={t('listings.quantity')}
          value={form.quantityAvailable}
          onChangeText={(value) => setField('quantityAvailable', value)}
          keyboardType="decimal-pad"
        />
        <ToggleRow
          label={t('listings.forRent')}
          value={form.isForRent}
          onValueChange={(value) => setField('isForRent', value)}
        />
        {form.isForRent ? (
          <>
            <TextField
              label={t('listings.rentalPrice')}
              value={form.rentalPrice}
              onChangeText={(value) => setField('rentalPrice', value)}
              keyboardType="decimal-pad"
            />
            <ChoiceField
              label={t('listings.rentalUnit')}
              options={RENTAL_UNITS.map((value) => ({
                value,
                label: t(`enums.rentalUnit.${value}`),
              }))}
              value={form.rentalUnit}
              onChange={(value) => setField('rentalUnit', value)}
            />
          </>
        ) : null}
      </Section>

      <Section title={t('gallery.title')} icon={Images} tone="info">
        <GalleryImagesField
          kind="listing"
          ownerId={mode === 'edit' ? listingId : undefined}
          onQueueChange={setQueuedImages}
          disabled={isSaving}
        />
      </Section>
    </FormScreen>
  )
}
