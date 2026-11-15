import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { ImageIcon, Plus, Star, Trash2 } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { OptionSheet } from '@/components/files/OptionSheet'
import { PickSourceSheet } from '@/components/files/PickSourceSheet'
import { PressableScale } from '@/components/kit'
import { usePickAndUpload } from '@/hooks/usePickAndUpload'
import { useThemeColors } from '@/hooks/useThemeColors'
import { showBlockingAlert } from '@/services/feedback'
import type { PickedFile } from '@/services/filePicker'
import {
  deleteGalleryImage,
  type GalleryImage,
  type GalleryKind,
  listGalleryImages,
  MAX_GALLERY_IMAGES,
  setMainGalleryImage,
  uploadGalleryImage,
} from '@/services/galleryImages'

type Tile = {
  key: string
  uri: string | null
  isMain: boolean
  /** Set for already-uploaded images. */
  image?: GalleryImage
  /** Set for images picked on a create form, not uploaded yet. */
  queued?: PickedFile
}

type GalleryImagesFieldProps = {
  kind: GalleryKind
  /**
   * Existing owner → every pick uploads immediately.
   * Omitted (create form) → picks are queued and handed to the parent through
   * `onQueueChange`; upload them after the owner is created with `uploadQueuedImages`.
   */
  ownerId?: string
  onQueueChange?: (queue: PickedFile[]) => void
  disabled?: boolean
}

/** Square photo grid with add / set-as-main / delete, for listings and projects. */
export function GalleryImagesField({
  kind,
  ownerId,
  onQueueChange,
  disabled = false,
}: GalleryImagesFieldProps) {
  const { t } = useTranslation()
  const colors = useThemeColors()
  const { sheetOpen, setSheetOpen, isBusy, setIsBusy, pickAndRun, toastApiError } =
    usePickAndUpload()

  const [images, setImages] = useState<GalleryImage[]>([])
  const [queue, setQueue] = useState<PickedFile[]>([])
  const [isLoading, setIsLoading] = useState(Boolean(ownerId))
  const [active, setActive] = useState<Tile | null>(null)

  const refresh = useCallback(async () => {
    if (!ownerId) return
    try {
      const result = await listGalleryImages(kind, ownerId)
      setImages(result.data)
    } catch (error) {
      toastApiError(error)
    } finally {
      setIsLoading(false)
    }
    // toastApiError is recreated every render; only owner/kind should retrigger a load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, ownerId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const tiles: Tile[] = ownerId
    ? images.map((image) => ({
        key: image.id,
        uri: image.url,
        isMain: image.isMain,
        image,
      }))
    : queue.map((queued, index) => ({
        key: `${queued.uri}-${index}`,
        uri: queued.uri,
        isMain: index === 0,
        queued,
      }))
  const count = tiles.length
  const canAdd = count < MAX_GALLERY_IMAGES && !disabled && !isBusy

  async function setMain(image: GalleryImage) {
    setActive(null)
    setIsBusy(true)
    try {
      await setMainGalleryImage(kind, image.id)
      await refresh()
    } catch (error) {
      toastApiError(error)
    } finally {
      setIsBusy(false)
    }
  }

  function confirmRemove(tile: Tile) {
    setActive(null)
    showBlockingAlert(t('gallery.removeTitle'), t('gallery.removeBody'), {
      cancelLabel: t('common.cancel'),
      confirmLabel: t('common.delete'),
      onConfirm: () => {
        void (async () => {
          if (tile.queued) {
            const next = queue.filter((item) => item !== tile.queued)
            setQueue(next)
            onQueueChange?.(next)
            return
          }
          if (!tile.image) return
          setIsBusy(true)
          try {
            await deleteGalleryImage(kind, tile.image.id)
            await refresh()
          } catch (error) {
            toastApiError(error)
          } finally {
            setIsBusy(false)
          }
        })()
      },
    })
  }

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-muted-foreground">
          {t('gallery.hint', { count, max: MAX_GALLERY_IMAGES })}
        </Text>
        {isBusy || isLoading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
      </View>

      <View className="flex-row flex-wrap gap-3">
        {tiles.map((tile) => (
          <PressableScale
            key={tile.key}
            accessibilityRole="button"
            accessibilityLabel={t('gallery.imageActions')}
            disabled={disabled || isBusy}
            scaleTo={0.94}
            className="aspect-square w-[30.5%] overflow-hidden rounded-2xl bg-muted"
            onPress={() => setActive(tile)}
          >
            {tile.uri ? (
              <Image
                source={{ uri: tile.uri }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <ImageIcon size={24} color={colors.disabled} />
              </View>
            )}
            {tile.isMain ? (
              <View className="absolute left-1.5 top-1.5 flex-row items-center gap-1 rounded-full bg-primary px-2 py-0.5">
                <Star size={10} color="#FFFFFF" fill="#FFFFFF" />
                <Text className="text-[10px] font-bold text-primary-foreground">
                  {t('gallery.main')}
                </Text>
              </View>
            ) : null}
          </PressableScale>
        ))}

        {canAdd ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('gallery.add')}
            scaleTo={0.94}
            className="aspect-square w-[30.5%] items-center justify-center gap-1 rounded-2xl border-[1.5px] border-dashed border-primary/40 bg-primary/5"
            onPress={() => setSheetOpen(true)}
          >
            <Plus size={24} color={colors.primary} />
            <Text className="text-xs font-semibold text-primary">{t('gallery.add')}</Text>
          </PressableScale>
        ) : null}
      </View>

      <PickSourceSheet
        visible={sheetOpen}
        title={t('gallery.add')}
        onClose={() => setSheetOpen(false)}
        onPick={(source) =>
          void pickAndRun(source, async (picked) => {
            if (!ownerId) {
              const next = [...queue, picked]
              setQueue(next)
              onQueueChange?.(next)
              return
            }
            await uploadGalleryImage(kind, ownerId, picked, { isMain: images.length === 0 })
            await refresh()
          })
        }
      />

      <OptionSheet
        visible={Boolean(active)}
        title={t('gallery.imageActions')}
        cancelLabel={t('common.cancel')}
        onClose={() => setActive(null)}
        options={[
          ...(active?.image && !active.isMain
            ? [
                {
                  key: 'main',
                  icon: Star,
                  label: t('gallery.setMain'),
                  onPress: () => void setMain(active.image!),
                },
              ]
            : []),
          {
            key: 'remove',
            icon: Trash2,
            label: t('files.remove'),
            destructive: true,
            onPress: () => active && confirmRemove(active),
          },
        ]}
      />
    </View>
  )
}
