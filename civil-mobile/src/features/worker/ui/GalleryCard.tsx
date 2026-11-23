import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { Camera, ImageIcon, Images, Star, Trash2 } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { Pressable } from '@/components/ui/pressable'
import { PvOptionSheet } from '@/features/provider/ui/kit'
import { useGalleryImages } from '@/hooks/useGalleryImages'
import { REMOTE_IMAGE_CACHE_POLICY, remoteImage } from '@/lib/imageSource'
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
 * Gallery: large preview frame + thumb strip.
 * - Tap a thumb → show it in the big frame (no actions).
 * - Tap the big frame → photo options (set cover / remove).
 * - Star badge only on the primary (cover) image.
 */
export function WkGalleryCard({
  kind,
  ownerId,
  onQueueChange,
  onMainChange,
  onCoverChange,
  disabled = false,
}: {
  kind: GalleryKind
  ownerId?: string
  onQueueChange?: (queue: PickedFile[]) => void
  /** Fired after cover changes so the parent can refresh (e.g. project hero). */
  onMainChange?: () => void
  /** Live cover from the gallery list (url + storage key) for parent hero fallback. */
  onCoverChange?: (cover: { url: string | null; key: string | null } | null) => void
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
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [confirm, setConfirm] = useState<WkConfirmState | null>(null)

  const tiles: Tile[] = useMemo(
    () =>
      ownerId
        ? [...images]
            .sort((a, b) => Number(b.isMain) - Number(a.isMain) || a.displayOrder - b.displayOrder)
            .map((image) => ({ key: image.id, uri: image.url, isMain: image.isMain, image }))
        : queue.map((queued, index) => ({
            key: `${queued.uri}-${index}`,
            uri: queued.uri,
            isMain: index === 0,
            queued,
          })),
    [ownerId, images, queue],
  )

  const selected =
    tiles.find((tile) => tile.key === selectedKey) ??
    tiles.find((tile) => tile.isMain) ??
    tiles[0] ??
    null

  useEffect(() => {
    if (selectedKey && !tiles.some((tile) => tile.key === selectedKey)) {
      setSelectedKey(null)
    }
  }, [tiles, selectedKey])

  useEffect(() => {
    if (!onCoverChange) return
    const main = tiles.find((tile) => tile.isMain) ?? tiles[0]
    onCoverChange(main ? { url: main.uri, key: main.image?.storagePath ?? null } : null)
  }, [tiles, onCoverChange])

  const canAdd = tiles.length < MAX_GALLERY_IMAGES && !disabled && !isBusy

  function askRemove(tile: Tile) {
    setActionsOpen(false)
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

      {selected ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('gallery.imageActions')}
          disabled={disabled || isBusy}
          onPress={() => setActionsOpen(true)}
          className="h-[180px] overflow-hidden rounded-2xl bg-wk-sf2 active:opacity-90"
        >
          {selected.uri ? (
            <Image
              source={remoteImage(selected.uri, selected.image?.storagePath)}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={150}
              cachePolicy={REMOTE_IMAGE_CACHE_POLICY}
            />
          ) : null}
          {selected.isMain ? (
            <View
              className="absolute bottom-2.5 start-2.5 h-7 flex-row items-center gap-1.5 rounded-full px-2.5"
              style={{ backgroundColor: 'rgba(10,12,10,0.62)' }}
            >
              <Star size={13} color={c.lime} fill={c.lime} strokeWidth={2} />
              <Text className="text-xs font-medium text-white">{t('gallery.main')}</Text>
            </View>
          ) : null}
        </Pressable>
      ) : null}

      <View className="flex-row flex-wrap gap-2">
        {tiles.map((tile) => {
          const isSelected = selected?.key === tile.key
          return (
            <Pressable
              key={tile.key}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={tile.isMain ? t('gallery.main') : t('gallery.selectPhoto')}
              disabled={disabled || isBusy}
              onPress={() => setSelectedKey(tile.key)}
              className={`overflow-hidden rounded-xl bg-wk-sf2 active:opacity-80 ${
                isSelected ? 'border-[1.5px] border-wk-brand' : 'border border-transparent'
              }`}
              style={{ width: '22.6%', aspectRatio: 1 }}
            >
              {tile.uri ? (
                <Image
                  source={remoteImage(tile.uri, tile.image?.storagePath)}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  cachePolicy={REMOTE_IMAGE_CACHE_POLICY}
                />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <ImageIcon size={18} color={c.ink3} strokeWidth={1.75} />
                </View>
              )}
              {tile.isMain ? (
                <View
                  className="absolute end-1 top-1 size-5 items-center justify-center rounded-full"
                  style={{ backgroundColor: 'rgba(10,12,10,0.7)' }}
                >
                  <Star size={11} color={c.lime} fill={c.lime} strokeWidth={2} />
                </View>
              ) : null}
            </Pressable>
          )
        })}
        {canAdd ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('gallery.add')}
            onPress={() => setSheetOpen(true)}
            className="items-center justify-center gap-1 rounded-xl border-[1.5px] border-dashed border-wk-line2 bg-wk-sf2 active:opacity-70"
            style={{ width: selected ? '22.6%' : '100%', aspectRatio: selected ? 1 : 3 }}
          >
            <Camera size={20} color={c.ink2} strokeWidth={1.9} />
            <Text className="text-[11px] font-medium text-wk-ink2">
              {selected ? t('providerPortal.addShort') : t('gallery.add')}
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
        visible={actionsOpen && Boolean(selected)}
        title={t('gallery.imageActions')}
        onClose={() => setActionsOpen(false)}
        options={[
          ...(selected?.image && !selected.isMain
            ? [
                {
                  key: 'main',
                  icon: Star,
                  label: t('gallery.setMain'),
                  onPress: () => {
                    const image = selected.image!
                    setActionsOpen(false)
                    void (async () => {
                      await setMain(image)
                      onMainChange?.()
                    })()
                  },
                },
              ]
            : []),
          {
            key: 'remove',
            icon: Trash2,
            label: t('files.remove'),
            destructive: true,
            onPress: () => selected && askRemove(selected),
          },
        ]}
      />

      <WkConfirm state={confirm} onCancel={() => setConfirm(null)} />
    </WkCard>
  )
}
