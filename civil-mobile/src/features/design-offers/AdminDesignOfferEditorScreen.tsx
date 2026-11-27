import { useCallback, useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { Camera, FileUp, Images, LayoutGrid } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { Pressable } from '@/components/ui/pressable'
import { PvOptionSheet } from '@/components/wk/storefront'
import { WkDangerZone, WkField, WkFormScreen, WkSection, WkToggle } from '@/components/wk/forms'
import { WkConfirm, type WkConfirmState } from '@/components/wk/kit'
import { useFilePick } from '@/hooks/useFilePick'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { useRemoteData } from '@/hooks/useRemoteData'
import { cacheKeys } from '@/lib/cacheKeys'
import { REMOTE_IMAGE_CACHE_POLICY, remoteImage } from '@/lib/imageSource'
import { remoteCacheInvalidate } from '@/lib/remoteCache'
import {
  createDesignOffer,
  deleteDesignOffer,
  getDesignOffer,
  updateDesignOffer,
  uploadDesignOfferImage,
} from '@/services/design-offers'
import { useToastSuccess } from '@/services/toast'

const BASE = '/admin/design-offers'

type Errors = Partial<
  Record<'title' | 'description' | 'priceStart' | 'priceEnd' | 'currency', string>
>

function invalidateOffers() {
  remoteCacheInvalidate(cacheKeys.designOffers)
}

/** Admin create / edit for a design offer package. */
export function AdminDesignOfferEditorScreen({ mode }: { mode: 'create' | 'edit' }) {
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const offerId = typeof id === 'string' ? id : id?.[0]
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()
  const { sheetOpen, setSheetOpen, isBusy, pickAndRun } = useFilePick()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priceStart, setPriceStart] = useState('')
  const [priceEnd, setPriceEnd] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [sortOrder, setSortOrder] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imagePath, setImagePath] = useState<string | null>(null)
  const [pendingImage, setPendingImage] = useState<{
    uri: string
    mime: string
    name: string
  } | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirm, setConfirm] = useState<WkConfirmState | null>(null)

  const load = useCallback(async () => {
    if (!offerId) throw new Error('Offer id required')
    return getDesignOffer(offerId)
  }, [offerId])

  const remote = useRemoteData(load, {
    enabled: mode === 'edit' && Boolean(offerId),
    cacheKey: `${cacheKeys.designOffers}:detail:${offerId ?? ''}`,
  })
  const offer = remote.status === 'success' ? remote.data : null

  useEffect(() => {
    if (!offer) return
    setTitle(offer.title)
    setDescription(offer.description)
    setPriceStart(offer.priceStart)
    setPriceEnd(offer.priceEnd)
    setCurrency(offer.currency)
    setSortOrder(String(offer.sortOrder ?? 0))
    setIsActive(offer.isActive)
    setImageUrl(offer.imageUrl)
    setImagePath(offer.imagePath)
  }, [offer])

  const previewUri = pendingImage?.uri ?? imageUrl

  const submit = async () => {
    const next: Errors = {}
    if (!title.trim()) next.title = t('designOffers.titleRequired')
    if (!description.trim()) next.description = t('designOffers.descriptionRequired')
    if (!/^\d+(\.\d{1,4})?$/.test(priceStart.trim()))
      next.priceStart = t('designOffers.priceInvalid')
    if (!/^\d+(\.\d{1,4})?$/.test(priceEnd.trim())) next.priceEnd = t('designOffers.priceInvalid')
    if (!currency.trim()) next.currency = t('designOffers.currencyRequired')
    if (!next.priceStart && !next.priceEnd && Number(priceStart) > Number(priceEnd)) {
      next.priceEnd = t('designOffers.priceRangeInvalid')
    }
    setErrors(next)
    if (Object.keys(next).length) return

    setIsSaving(true)
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        priceStart: priceStart.trim(),
        priceEnd: priceEnd.trim(),
        currency: currency.trim().toUpperCase(),
        isActive,
        sortOrder: Number.parseInt(sortOrder, 10) || 0,
      }
      let saved =
        mode === 'create'
          ? await createDesignOffer(payload)
          : await updateDesignOffer(offerId!, payload)

      if (pendingImage) {
        saved = await uploadDesignOfferImage(saved.id, pendingImage)
      }

      invalidateOffers()
      toastSuccess(mode === 'create' ? t('designOffers.created') : t('designOffers.saved'))
      if (mode === 'create') {
        router.replace(`${BASE}/${saved.id}` as never)
      } else {
        setPendingImage(null)
        setImageUrl(saved.imageUrl)
        setImagePath(saved.imagePath)
        void remote.refetch()
      }
    } catch (error) {
      handleApiError(error, t('designOffers.couldNotSave'))
    } finally {
      setIsSaving(false)
    }
  }

  const confirmDelete = () => {
    setConfirm({
      title: t('designOffers.confirmDeleteTitle'),
      body: t('designOffers.confirmDeleteBody'),
      cta: t('common.delete'),
      tone: 'danger',
      onConfirm: () => {
        void (async () => {
          setIsDeleting(true)
          try {
            await deleteDesignOffer(offerId!)
            invalidateOffers()
            toastSuccess(t('designOffers.deleted'))
            router.replace(BASE as never)
          } catch (error) {
            handleApiError(error, t('designOffers.couldNotDelete'))
          } finally {
            setIsDeleting(false)
            setConfirm(null)
          }
        })()
      },
    })
  }

  return (
    <WkFormScreen
      title={mode === 'create' ? t('designOffers.new') : t('designOffers.edit')}
      backHref={BASE}
      isLoading={mode === 'edit' && remote.isLoading}
      footer={
        <View className="px-5 pb-2">
          <Pressable
            accessibilityRole="button"
            disabled={isSaving || isBusy || isDeleting}
            onPress={() => void submit()}
            className="h-12 items-center justify-center rounded-2xl bg-wk-brand active:opacity-90"
          >
            <Text className="text-[15px] font-semibold text-white">
              {isSaving
                ? t('common.saving')
                : mode === 'create'
                  ? t('common.create')
                  : t('common.save')}
            </Text>
          </Pressable>
        </View>
      }
    >
      <WkSection icon={LayoutGrid} title={t('designOffers.details')}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setSheetOpen(true)}
          className="mb-2 overflow-hidden rounded-[16px] border border-dashed border-wk-line bg-wk-sf2"
        >
          {previewUri ? (
            <Image
              source={pendingImage ? { uri: pendingImage.uri } : remoteImage(previewUri, imagePath)}
              style={{ width: '100%', height: 180 }}
              contentFit="cover"
              cachePolicy={REMOTE_IMAGE_CACHE_POLICY}
            />
          ) : (
            <View className="h-[140px] items-center justify-center gap-2 px-4">
              <FileUp size={22} />
              <Text className="text-center text-[13px] text-wk-ink3">
                {t('designOffers.tapImage')}
              </Text>
            </View>
          )}
        </Pressable>
        <WkField
          label={t('designOffers.offerTitle')}
          value={title}
          onChangeText={setTitle}
          error={errors.title}
          placeholder={t('designOffers.offerTitlePlaceholder')}
        />
        <WkField
          label={t('designOffers.description')}
          value={description}
          onChangeText={setDescription}
          multiline
          error={errors.description}
          placeholder={t('designOffers.descriptionPlaceholder')}
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <WkField
              label={t('designOffers.priceStart')}
              value={priceStart}
              onChangeText={setPriceStart}
              error={errors.priceStart}
              keyboardType="decimal-pad"
              ltr
            />
          </View>
          <View className="flex-1">
            <WkField
              label={t('designOffers.priceEnd')}
              value={priceEnd}
              onChangeText={setPriceEnd}
              error={errors.priceEnd}
              keyboardType="decimal-pad"
              ltr
            />
          </View>
        </View>
        <WkField
          label={t('designOffers.currency')}
          value={currency}
          onChangeText={setCurrency}
          error={errors.currency}
          autoCapitalize="characters"
          maxLength={8}
          ltr
        />
        <WkField
          label={t('designOffers.sortOrder')}
          value={sortOrder}
          onChangeText={setSortOrder}
          keyboardType="number-pad"
          ltr
        />
        <WkToggle
          label={t('designOffers.active')}
          value={isActive}
          onChange={setIsActive}
          hint={t('designOffers.activeHint')}
        />
      </WkSection>

      {mode === 'edit' ? (
        <WkDangerZone
          title={t('designOffers.deleteZoneTitle')}
          body={t('designOffers.deleteZoneHint')}
          label={t('common.delete')}
          disabled={isDeleting}
          onPress={confirmDelete}
        />
      ) : null}

      <WkConfirm state={confirm} onCancel={() => setConfirm(null)} />

      <PvOptionSheet
        visible={sheetOpen}
        title={t('files.sheetTitle')}
        onClose={() => setSheetOpen(false)}
        options={(
          [
            ['camera', Camera, t('files.takePhoto')],
            ['library', Images, t('files.chooseLibrary')],
          ] as const
        ).map(([source, icon, text]) => ({
          key: source,
          icon,
          label: text,
          onPress: () =>
            void pickAndRun(source, async (picked) => {
              setPendingImage({
                uri: picked.uri,
                mime: picked.mime,
                name: picked.originalName,
              })
            }),
        }))}
      />
    </WkFormScreen>
  )
}
