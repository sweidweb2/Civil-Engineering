import { useMemo, useState } from 'react'
import { Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Banknote, CircleAlert, FileText } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { GalleryImagesField } from '@/components/files/GalleryImagesField'
import { useListingEditor } from '@/features/provider/useListingEditor'
import {
  WkChoice,
  WkField,
  WkFormScreen,
  WkPickerSheet,
  WkSection,
  WkSelect,
  WkToggle,
} from '@/components/wk/forms'
import { WkButton } from '@/components/wk/kit'
import { useWkPalette } from '@/components/wk/palette'
import { type ListingStatus, RENTAL_UNITS } from '@/services/listings'
import { useLanguageStore } from '@/stores/languageStore'

const DEFAULT_BASE = '/provider/listings'
/** Quick picks; a listing saved with another code keeps it as an extra chip. */
const CURRENCIES = ['SAR', 'AED', 'USD', 'EGP']

/**
 * Create / edit listing form (gallery, details, pricing). Provider portal by
 * default; admin passes `scope="admin"` to pick which provider owns it.
 */
export function ProviderListingFormScreen({
  mode,
  basePath = DEFAULT_BASE,
  scope = 'mine',
}: {
  mode: 'create' | 'edit'
  basePath?: string
  scope?: 'mine' | 'admin'
}) {
  const BASE = basePath
  const isAdmin = scope === 'admin'
  const [providerOpen, setProviderOpen] = useState(false)
  const { t } = useTranslation()
  const { c } = useWkPalette()
  const isAr = useLanguageStore((s) => s.language) === 'ar'
  const { id } = useLocalSearchParams<{ id?: string }>()
  const listingId = typeof id === 'string' ? id : id?.[0]
  const [categoryOpen, setCategoryOpen] = useState(false)

  const {
    form,
    setField,
    formError,
    formErrorField,
    isSaving,
    canSave,
    save,
    setQueuedImages,
    categories,
    isCategoriesLoading,
    selectedProviderId,
    setSelectedProviderId,
    providerOptions,
    isBootLoading,
    bootError,
    retry,
  } = useListingEditor({ mode, listingId, basePath: BASE, isAdmin })

  const categoryOptions = useMemo(
    () => categories.map((cat) => ({ value: cat.id, label: (isAr && cat.nameAr) || cat.name })),
    [categories, isAr],
  )
  const categoryLabel = categoryOptions.find((o) => o.value === form.categoryId)?.label

  const currencies = useMemo(() => {
    const code = form.currency.trim().toUpperCase()
    const list = code && !CURRENCIES.includes(code) ? [...CURRENCIES, code] : CURRENCIES
    return list.map((value) => ({ value, label: value }))
  }, [form.currency])

  /** Error text for one field, when the last validation pointed at it. */
  const err = (key: typeof formErrorField) => (formErrorField === key ? formError : undefined)
  const generalError = formError && !formErrorField ? formError : undefined

  const saveLabel =
    mode === 'edit'
      ? t('worker.saveChanges')
      : form.status === 'ACTIVE'
        ? t('providerPortal.publishListing')
        : t('listings.create')

  return (
    <WkFormScreen
      title={t(mode === 'create' ? 'listings.new' : 'listings.edit')}
      backHref={mode === 'edit' && listingId ? `${BASE}/${listingId}` : BASE}
      isLoading={isBootLoading}
      error={bootError}
      onRetry={retry}
      testID="e2e-provider-listing-form"
      footer={
        <WkButton
          label={isSaving ? t('common.saving') : saveLabel}
          loading={isSaving}
          disabled={!canSave}
          height={54}
          onPress={() => void save()}
        />
      }
    >
      {generalError ? (
        <View className="flex-row items-center gap-2 rounded-2xl bg-wk-red-soft px-4 py-3">
          <CircleAlert size={16} color={c.red} strokeWidth={2} />
          <Text className="min-w-0 flex-1 text-[13px] font-medium text-wk-red">{generalError}</Text>
        </View>
      ) : null}

      <GalleryImagesField
        kind="listing"
        ownerId={mode === 'edit' ? listingId : undefined}
        onQueueChange={setQueuedImages}
        disabled={isSaving}
      />

      <WkSection icon={FileText} title={t('providerPortal.detailsSection')}>
        {isAdmin ? (
          <WkSelect
            label={t('listings.provider')}
            required
            value={providerOptions.find((o) => o.value === selectedProviderId)?.label}
            placeholder={t('listings.selectProvider')}
            onPress={() => setProviderOpen(true)}
          />
        ) : null}
        <WkField
          label={t('common.name')}
          required
          value={form.name}
          onChangeText={(value) => setField('name', value)}
          placeholder={t('providerPortal.namePlaceholder')}
          error={err('name')}
        />
        <WkSelect
          label={t('listings.category')}
          value={categoryLabel}
          placeholder={t('providerPortal.chooseCategory')}
          onPress={() => setCategoryOpen(true)}
          error={err('categoryId')}
        />
        <WkField
          label={t('listings.brand')}
          value={form.brand}
          onChangeText={(value) => setField('brand', value)}
          placeholder={t('common.optional')}
          error={err('brand')}
        />
        <WkField
          label={t('common.description')}
          multiline
          value={form.description}
          onChangeText={(value) => setField('description', value)}
          placeholder={t('providerPortal.descPlaceholder')}
          error={err('description')}
        />
        <WkChoice
          label={t('listings.status')}
          options={[
            { value: 'ACTIVE', label: t('providerHome.live') },
            { value: 'INACTIVE', label: t('providerHome.hidden') },
          ]}
          value={form.status}
          onChange={(value) => setField('status', value as ListingStatus)}
        />
      </WkSection>

      <WkSection icon={Banknote} title={t('listings.pricing')}>
        <WkToggle
          label={t('providerPortal.priceRange')}
          hint={t('providerPortal.priceRangeHint')}
          value={form.isPriceRange}
          onChange={(value) => setField('isPriceRange', value)}
        />
        {form.isPriceRange ? (
          <>
            <WkField
              label={t('providerPortal.minPrice')}
              value={form.priceMin}
              onChangeText={(value) => setField('priceMin', value)}
              keyboardType="decimal-pad"
              placeholder="0"
              ltr
              error={err('priceMin')}
            />
            <WkField
              label={t('providerPortal.maxPrice')}
              value={form.priceMax}
              onChangeText={(value) => setField('priceMax', value)}
              keyboardType="decimal-pad"
              placeholder="0"
              ltr
              error={err('priceMax')}
            />
          </>
        ) : (
          <WkField
            label={t('providerPortal.salePrice')}
            value={form.price}
            onChangeText={(value) => setField('price', value)}
            keyboardType="decimal-pad"
            placeholder="0"
            ltr
            error={err('price')}
          />
        )}
        <WkChoice
          label={t('listings.currency')}
          options={currencies}
          value={form.currency.toUpperCase()}
          onChange={(value) => setField('currency', value)}
          error={err('currency')}
        />
        <WkField
          label={t('listings.unit')}
          value={form.unit}
          onChangeText={(value) => setField('unit', value)}
          placeholder={t('providerPortal.unitPlaceholder')}
          error={err('unit')}
        />
        <WkField
          label={t('listings.quantity')}
          value={form.quantityAvailable}
          onChangeText={(value) => setField('quantityAvailable', value)}
          keyboardType="decimal-pad"
          placeholder="0"
          ltr
          error={err('quantityAvailable')}
        />
        <WkToggle
          label={t('listings.forRent')}
          hint={t('providerPortal.rentHint')}
          value={form.isForRent}
          onChange={(value) => setField('isForRent', value)}
        />
        {form.isForRent ? (
          <>
            <WkField
              label={t('listings.rentalPrice')}
              value={form.rentalPrice}
              onChangeText={(value) => setField('rentalPrice', value)}
              keyboardType="decimal-pad"
              placeholder="0"
              ltr
              error={err('rentalPrice')}
            />
            <WkChoice
              label={t('providerPortal.rentalPeriod')}
              options={RENTAL_UNITS.map((value) => ({
                value,
                label: t(`enums.rentalUnit.${value}`),
              }))}
              value={form.rentalUnit}
              onChange={(value) => setField('rentalUnit', value)}
              error={err('rentalUnit')}
            />
          </>
        ) : null}
      </WkSection>

      {isAdmin ? (
        <WkPickerSheet
          visible={providerOpen}
          onClose={() => setProviderOpen(false)}
          title={t('listings.provider')}
          options={providerOptions}
          value={selectedProviderId}
          searchPlaceholder={t('providers.search')}
          emptyLabel={() => t('pmPortal.noMatches')}
          onSelect={(option) => {
            setSelectedProviderId(option.value)
            setProviderOpen(false)
          }}
        />
      ) : null}
      <WkPickerSheet
        visible={categoryOpen}
        onClose={() => setCategoryOpen(false)}
        title={t('listings.category')}
        options={[{ value: '', label: t('providerPortal.noCategory') }, ...categoryOptions]}
        value={form.categoryId}
        isLoading={isCategoriesLoading}
        searchPlaceholder={t('providerPortal.searchCategories')}
        emptyLabel={(query) => t('providerPortal.noCategoriesMatch', { query })}
        onSelect={(option) => {
          setField('categoryId', option.value)
          setCategoryOpen(false)
        }}
      />
    </WkFormScreen>
  )
}
