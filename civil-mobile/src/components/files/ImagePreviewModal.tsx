import { useEffect, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, Text, useWindowDimensions, View } from 'react-native'
import { Image } from 'expo-image'
import { X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

export type FilePreviewOverlayState =
  | null
  /** Image preview: `uri` null while the download URL is still resolving. */
  | { kind: 'image'; uri: string | null }
  /** Non-image: preparing native preview (cache download). */
  | { kind: 'opening' }

type FilePreviewOverlayProps = {
  state: FilePreviewOverlayState
  onClose: () => void
}

/**
 * In-app file preview shell: dimmed overlay + framed content.
 * Does not freeze the UI — spinner shows while URL/image loads.
 */
export function ImagePreviewModal({ state, onClose }: FilePreviewOverlayProps) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const [imageStatus, setImageStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  const visible = state != null
  const imageUri = state?.kind === 'image' ? state.uri : null
  const isOpeningDoc = state?.kind === 'opening'
  const showImageSpinner =
    state?.kind === 'image' && (imageUri == null || imageStatus === 'loading')

  useEffect(() => {
    setImageStatus('loading')
  }, [imageUri])

  const frameMaxW = Math.min(width - 40, 560)
  const frameMaxH = height - insets.top - insets.bottom - 48

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          onPress={onClose}
          className="absolute inset-0 bg-black/60"
        />

        <View className="flex-1 items-center justify-center px-5" pointerEvents="box-none">
          <View
            className="overflow-hidden rounded-2xl border border-white/20 bg-[#121212]"
            style={{
              width: frameMaxW,
              maxHeight: frameMaxH,
              minHeight: Math.min(280, frameMaxH),
              shadowColor: '#000',
              shadowOpacity: 0.35,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 12 },
              elevation: 12,
            }}
          >
            <View className="h-12 flex-row items-center justify-between border-b border-white/10 px-3">
              <Text className="text-[13px] font-semibold text-white/80" numberOfLines={1}>
                {isOpeningDoc ? t('files.opening') : t('files.preview')}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                onPress={onClose}
                hitSlop={8}
                className="size-9 items-center justify-center rounded-full bg-white/10 active:opacity-80"
              >
                <X size={18} color="#fff" strokeWidth={2.2} />
              </Pressable>
            </View>

            <View
              className="items-center justify-center bg-black"
              style={{ height: Math.min(frameMaxH - 48, width > 400 ? 420 : 320) }}
            >
              {isOpeningDoc || showImageSpinner ? (
                <View className="absolute inset-0 z-10 items-center justify-center gap-3 bg-black/40">
                  <ActivityIndicator size="large" color="#ffffff" />
                  <Text className="text-[13px] text-white/70">
                    {isOpeningDoc ? t('files.opening') : t('files.loadingPreview')}
                  </Text>
                </View>
              ) : null}

              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="contain"
                  transition={200}
                  onLoadStart={() => setImageStatus('loading')}
                  onLoad={() => setImageStatus('ready')}
                  onError={() => setImageStatus('error')}
                />
              ) : null}

              {state?.kind === 'image' && imageStatus === 'error' && imageUri ? (
                <View className="absolute inset-0 items-center justify-center px-6">
                  <Text className="text-center text-[14px] text-white/80">
                    {t('files.previewFailed')}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <Pressable onPress={onClose} className="mt-4 active:opacity-70">
            <Text className="text-[13px] font-medium text-white/70">{t('common.close')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}
