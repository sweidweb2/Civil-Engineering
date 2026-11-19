import { useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { Camera, ImageIcon, Images, Star, Trash2 } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { Pressable } from '@/components/ui/pressable'
import { PvOptionSheet } from '@/features/provider/ui/kit'
import { useGalleryImages } from '@/hooks/useGalleryImages'
import { ltr } from '@/lib/rtl'
import type { PickedFile } from '@/services/filePicker'
import { type GalleryImage, type GalleryKind, MAX_GALLERY_IMAGES } from '@/services/galleryImages'
import { MONO_STYLE } from '@/theme/typography'

import { WkCard, WkConfirm, type WkConfirmState } from './kit'
import { useWorkerPalette } from './palette'

type Tile = {
  key: string
  uri: string | null
  isMain: boolean
  image?: GalleryImage
  queued?: PickedFile
}

/**
 * Green-palette gallery card (Claude Design): large cover with a "main" badge,
 * 4-column thumbnails and a dashed "Add" tile. Same contract as
 * GalleryImagesField: with `ownerId` every pick uploads now; without it
 * (create forms) picks queue up and go through `onQueueChange`.
 */
export function WkGalleryCard({
  kind,
  ownerId,
  onQueueChange,
  disabled = false,
}: {
  kind: GalleryKind
  ownerId?: string
  onQueueChange?: (queue: PickedFile[]) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const { c } = useWorkerPalette()
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
  const [confirm, setConfirm] = useState<WkConfirmState | null>(null)

  const tiles: Tile[] = ownerId
    ? [...images]
        .sort((a, b) => Number(b.isMain) - Number(a.isMain) || a.displayOrder - b.displayOrder)
        .map((image) => ({ key: image.id, uri: image.url, isMain: image.isMain, image }))
    : queue.map((queued, index) => ({
        key: `${queued.uri}-${index}`,
        uri: queued.uri,
        isMain: index === 0,
        queued,
      }))
  const [cover, ...rest] = tiles
  const canAdd = tiles.length < MAX_GALLERY_IMAGES && !disabled && !isBusy

  function askRemove(tile: Tile) {
    setActive(null)
    setConfirm({
      title: t('gallery.removeTitle'),
      body: t('gallery.removeBody'),
      cta: t('files.remove'),
      onConfirm: () => {
        setConfirm(null)
        if (tile.queued) removeQueued(tile.queued)
        else if (tile.image) void removeImage(tile.image)
      },
    })
  }

  return (
    <WkCard className="gap-3.5">
      <View className="flex-row items-center gap-2.5">
        <View className="size-8 items-center justify-center rounded-[10px] bg-wk-brand-soft">
          <Images size={16} color={c.brand} strokeWidth={2} />
        </View>
        <Text
          className="min-w-0 flex-1 text-[15px] font-semibold text-wk-ink"
          accessibilityRole="header"
        >
          {t('gallery.title')}
        </Text>
        {isBusy || isLoading ? <ActivityIndicator size="small" color={c.ink3} /> : null}
        <Text className="text-[11px] font-medium text-wk-ink3" style={MONO_STYLE}>
          {ltr(`${tiles.length} / ${MAX_GALLERY_IMAGES}`)}
        </Text>
      </View>

      {cover ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('gallery.imageActions')}
          disabled={disabled || isBusy}
          onPress={() => setActive(cover)}
          className="h-[180px] overflow-hidden rounded-2xl bg-wk-sf2 active:opacity-90"
        >
          {cover.uri ? (
            <Image
              source={{ uri: cover.uri }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={150}
            />
          ) : null}
          <View
            className="absolute bottom-2.5 start-2.5 h-7 flex-row items-center gap-1.5 rounded-full px-2.5"
            style={{ backgroundColor: 'rgba(10,12,10,0.62)' }}
          >
            <Star size={13} color={c.lime} fill={c.lime} strokeWidth={2} />
            <Text className="text-xs font-medium text-white">{t('gallery.main')}</Text>
          </View>
        </Pressable>
      ) : null}

      <View className="flex-row flex-wrap gap-2">
        {rest.map((tile) => (
          <Pressable
            key={tile.key}
            accessibilityRole="button"
            accessibilityLabel={t('gallery.imageActions')}
            disabled={disabled || isBusy}
            onPress={() => setActive(tile)}
            className="overflow-hidden rounded-xl bg-wk-sf2 active:opacity-80"
            style={{ width: '22.6%', aspectRatio: 1 }}
          >
            {tile.uri ? (
              <Image
                source={{ uri: tile.uri }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <ImageIcon size={18} color={c.ink3} strokeWidth={1.75} />
              </View>
            )}
          </Pressable>
        ))}
        {canAdd ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('gallery.add')}
            onPress={() => setSheetOpen(true)}
            className="items-center justify-center gap-1 rounded-xl border-[1.5px] border-dashed border-wk-line2 bg-wk-sf2 active:opacity-70"
            style={{ width: cover ? '22.6%' : '100%', aspectRatio: cover ? 1 : 3 }}
          >
            <Camera size={20} color={c.ink2} strokeWidth={1.9} />
            <Text className="text-[11px] font-medium text-wk-ink2">
              {cover ? t('providerPortal.addShort') : t('gallery.add')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <PvOptionSheet
        visible={sheetOpen}
        title={t('gallery.add')}
        onClose={() => setSheetOpen(false)}
        options={[
          {
            key: 'camera',
            icon: Camera,
            label: t('files.takePhoto'),
            onPress: () => void pick('camera'),
          },
          {
            key: 'library',
            icon: Images,
            label: t('files.chooseLibrary'),
            onPress: () => void pick('library'),
          },
        ]}
      />

      <PvOptionSheet
        visible={Boolean(active)}
        title={t('gallery.imageActions')}
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
            onPress: () => active && askRemove(active),
          },
        ]}
      />

      <WkConfirm state={confirm} onCancel={() => setConfirm(null)} />
    </WkCard>
  )
}
