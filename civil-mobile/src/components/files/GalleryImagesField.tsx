import { useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { ImageIcon, Plus, Star, Trash2 } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { OptionSheet } from '@/components/files/OptionSheet'
import { PickSourceSheet } from '@/components/files/PickSourceSheet'
import { PressableScale } from '@/components/kit'
import { useGalleryImages } from '@/hooks/useGalleryImages'
import { useThemeColors } from '@/hooks/useThemeColors'
import { REMOTE_IMAGE_CACHE_POLICY, remoteImage } from '@/lib/imageSource'
import { showBlockingAlert } from '@/services/feedback'
import type { PickedFile } from '@/services/filePicker'
import { type GalleryImage, type GalleryKind, MAX_GALLERY_IMAGES } from '@/services/galleryImages'

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
  const {
    images,
    queue,
    isLoading,
    isBusy,
    sheetOpen,
    setSheetOpen,
    setMain,
    removeImage,
    removeQueued,
    pick,
  } = useGalleryImages({ kind, ownerId, onQueueChange })
  const [active, setActive] = useState<Tile | null>(null)

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

  function confirmRemove(tile: Tile) {
    setActive(null)
    showBlockingAlert(t('gallery.removeTitle'), t('gallery.removeBody'), {
      destructive: true,
      cancelLabel: t('common.cancel'),
      confirmLabel: t('common.delete'),
      onConfirm: () => {
        if (tile.queued) removeQueued(tile.queued)
        else if (tile.image) void removeImage(tile.image)
      },
    })
  }

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-muted-foreground">
          {t('gallery.hint', { count, max: MAX_GALLERY_IMAGES })}
        </Text>
        {isBusy || isLoading ? <ActivityIndicator size="small" color={colors.muted} /> : null}
      </View>

      <View className="flex-row flex-wrap gap-3">
        {tiles.map((tile) => (
          <PressableScale
            key={tile.key}
            accessibilityRole="button"
            accessibilityLabel={t('gallery.imageActions')}
            disabled={disabled || isBusy}
            scaleTo={0.94}
            className="aspect-square w-[30.5%] overflow-hidden rounded-md border border-border bg-card"
            onPress={() => setActive(tile)}
          >
            {tile.uri ? (
              <Image
                source={remoteImage(tile.uri, tile.image?.storagePath)}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={150}
                cachePolicy={REMOTE_IMAGE_CACHE_POLICY}
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <ImageIcon size={20} color={colors.muted} strokeWidth={1.75} />
              </View>
            )}
            {tile.isMain ? (
              <View className="absolute start-1.5 top-1.5 rounded-full bg-inverse px-2 py-0.5">
                <Text className="text-xs font-medium text-on-inverse">{t('gallery.main')}</Text>
              </View>
            ) : null}
          </PressableScale>
        ))}

        {canAdd ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('gallery.add')}
            scaleTo={0.94}
            className="aspect-square w-[30.5%] items-center justify-center gap-1 rounded-md border border-dashed border-line-strong bg-card"
            onPress={() => setSheetOpen(true)}
          >
            <Plus size={20} color={colors.ink} strokeWidth={1.75} />
            <Text className="text-xs font-medium text-foreground">{t('gallery.add')}</Text>
          </PressableScale>
        ) : null}
      </View>

      <PickSourceSheet
        visible={sheetOpen}
        title={t('gallery.add')}
        onClose={() => setSheetOpen(false)}
        onPick={(source) => void pick(source)}
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
                  onPress: () => {
                    const image = active.image!
                    setActive(null)
                    void setMain(image)
                  },
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
