import { useCallback, useEffect, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'

import { AsyncState } from '@/components/feedback/AsyncState'
import { FormField } from '@/components/forms/FormField'
import { OptionChips } from '@/components/forms/OptionChips'
import { Header } from '@/components/layout/Header'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { Input, InputField } from '@/components/ui/input'
import { Pressable } from '@/components/ui/pressable'
import { Switch } from '@/components/ui/switch'
import { Textarea, TextareaInput } from '@/components/ui/textarea'
import {
  EMPTY_LISTING_FORM,
  formFromListing,
  type ListingFormValues,
} from '@/features/provider/listing.form'
import { listingWriteFromForm } from '@/features/provider/listing.schema'
import { useRemoteData } from '@/hooks/useRemoteData'
import { useThemeColors } from '@/hooks/useThemeColors'
import { ApiError } from '@/services/api'
import { type Category, isListingCategory, listCategories } from '@/services/categories'
import { showApiAlert, showBlockingAlert } from '@/services/feedback'
import {
  createListing,
  getListingById,
  type ListingStatus,
  updateListing,
} from '@/services/listings'
import { getMyProvider, listProviders, type Provider } from '@/services/providers'
import { useToastApiError } from '@/services/toast'

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
]

const RENTAL_UNIT_OPTIONS = [
  { value: 'HOUR', label: 'Hour' },
  { value: 'DAY', label: 'Day' },
  { value: 'WEEK', label: 'Week' },
  { value: 'MONTH', label: 'Month' },
]

function BackButton({ fallbackHref }: { fallbackHref: string }) {
  const colors = useThemeColors()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      className="size-9 items-center justify-center rounded-md"
      onPress={() => {
        if (router.canGoBack()) router.back()
        else router.replace(fallbackHref as never)
      }}
    >
      <ChevronLeft size={24} color={colors.text} />
    </Pressable>
  )
}

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
  const toastApiError = useToastApiError()
  const isAdmin = scope === 'admin'

  const [form, setForm] = useState<ListingFormValues>(EMPTY_LISTING_FORM)
  const [formError, setFormError] = useState<string | undefined>()
  const [isSaving, setIsSaving] = useState(false)
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
      setFormError(isAdmin ? 'Select a provider' : 'Provider not loaded')
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
        showBlockingAlert('Created', 'Listing was created.')
        router.replace(`${basePath}/${created.data.id}` as never)
      } else if (listingId) {
        await updateListing(listingId, parsed.data)
        showBlockingAlert('Saved', 'Listing was updated.')
        router.replace(`${basePath}/${listingId}` as never)
      }
    } catch (error) {
      if (error instanceof ApiError && error.status >= 500) toastApiError(error)
      else
        showApiAlert(
          error,
          mode === 'create' ? 'Could not create listing' : 'Could not save listing',
        )
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
    <View className="flex-1 bg-background">
      <Header
        title={mode === 'create' ? 'New listing' : 'Edit listing'}
        leftSlot={<BackButton fallbackHref={fallbackHref} />}
      />

      <AsyncState
        isLoading={isBootLoading}
        error={bootError}
        loadingLabel={mode === 'create' ? 'Loading…' : 'Loading listing…'}
        onRetry={() => {
          if (!isAdmin) void mineRemote.refetch()
          if (mode === 'edit') void listingRemote.refetch()
        }}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-5 pb-10 pt-2"
          keyboardShouldPersistTaps="handled"
        >
          {formError ? <Text className="text-sm text-destructive">{formError}</Text> : null}

          {isAdmin ? (
            <FormField label="Provider" isRequired>
              <OptionChips
                options={providerOptions}
                value={selectedProviderId}
                onChange={setSelectedProviderId}
              />
            </FormField>
          ) : null}

          <FormField label="Name" isRequired>
            <Input>
              <InputField
                value={form.name}
                onChangeText={(value) => setField('name', value)}
                placeholder="Listing name"
              />
            </Input>
          </FormField>

          <FormField label="Status">
            <OptionChips
              options={STATUS_OPTIONS}
              value={form.status}
              onChange={(value) => setField('status', value as ListingStatus)}
            />
          </FormField>

          <FormField label="Category" helperText="Optional">
            <OptionChips
              options={categoryOptions}
              value={form.categoryId}
              onChange={(value) => setField('categoryId', value)}
              allowClear
            />
          </FormField>

          <FormField label="Price">
            <Input>
              <InputField
                value={form.price}
                onChangeText={(value) => setField('price', value)}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />
            </Input>
          </FormField>

          <View className="flex-row gap-3">
            <View className="min-w-0 flex-1">
              <FormField label="Currency">
                <Input>
                  <InputField
                    value={form.currency}
                    onChangeText={(value) => setField('currency', value.toUpperCase())}
                    autoCapitalize="characters"
                    maxLength={3}
                    placeholder="USD"
                  />
                </Input>
              </FormField>
            </View>
            <View className="min-w-0 flex-1">
              <FormField label="Unit">
                <Input>
                  <InputField
                    value={form.unit}
                    onChangeText={(value) => setField('unit', value)}
                    placeholder="kg, m³…"
                  />
                </Input>
              </FormField>
            </View>
          </View>

          <FormField label="Brand">
            <Input>
              <InputField value={form.brand} onChangeText={(value) => setField('brand', value)} />
            </Input>
          </FormField>

          <FormField label="Quantity available">
            <Input>
              <InputField
                value={form.quantityAvailable}
                onChangeText={(value) => setField('quantityAvailable', value)}
                keyboardType="decimal-pad"
              />
            </Input>
          </FormField>

          <FormField label="Description">
            <Textarea>
              <TextareaInput
                value={form.description}
                onChangeText={(value) => setField('description', value)}
              />
            </Textarea>
          </FormField>

          <View className="flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
            <Text className="text-sm font-medium text-foreground">Available for rent</Text>
            <Switch
              value={form.isForRent}
              onValueChange={(value) => setField('isForRent', value)}
            />
          </View>

          {form.isForRent ? (
            <>
              <FormField label="Rental price">
                <Input>
                  <InputField
                    value={form.rentalPrice}
                    onChangeText={(value) => setField('rentalPrice', value)}
                    keyboardType="decimal-pad"
                  />
                </Input>
              </FormField>
              <FormField label="Rental unit">
                <OptionChips
                  options={RENTAL_UNIT_OPTIONS}
                  value={form.rentalUnit}
                  onChange={(value) => setField('rentalUnit', value)}
                />
              </FormField>
            </>
          ) : null}

          <Button
            onPress={() => void onSave()}
            disabled={isSaving || !providerId}
            accessibilityState={{ busy: isSaving }}
          >
            {isSaving ? <ButtonSpinner /> : null}
            <ButtonText>
              {isSaving ? 'Saving…' : mode === 'create' ? 'Create listing' : 'Save changes'}
            </ButtonText>
          </Button>
        </ScrollView>
      </AsyncState>
    </View>
  )
}
