import { useLocalSearchParams } from 'expo-router'
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
import { useListingEditor } from '@/features/provider/useListingEditor'
import { RENTAL_UNITS, type ListingStatus } from '@/services/listings'

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
  const isAdmin = scope === 'admin'
  const {
    form,
    setField,
    formError,
    isSaving,
    canSave,
    save,
    setQueuedImages,
    selectedProviderId,
    setSelectedProviderId,
    categoryOptions,
    providerOptions,
    isBootLoading,
    bootError,
    retry,
  } = useListingEditor({ mode, listingId, basePath, isAdmin })

  const fallbackHref = mode === 'edit' && listingId ? `${basePath}/${listingId}` : basePath
  return (
    <FormScreen
      title={t(mode === 'create' ? 'listings.new' : 'listings.edit')}
      backHref={fallbackHref}
      isLoading={isBootLoading}
      error={bootError}
      loadingLabel={t('listings.loadingOne')}
      onRetry={retry}
      footer={
        <Button
          className="flex-1"
          onPress={() => void save()}
          disabled={!canSave}
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

      <Section title={t('listings.details')}>
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

      <Section title={t('listings.pricing')}>
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

      <Section title={t('gallery.title')}>
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
