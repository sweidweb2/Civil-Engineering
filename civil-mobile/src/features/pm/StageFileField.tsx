import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Modal, Text, View } from 'react-native'
import { Image } from 'expo-image'
import * as WebBrowser from 'expo-web-browser'
import {
  Camera,
  FileText,
  FolderOpen,
  ImageIcon,
  type LucideIcon,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { PressableScale } from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { useThemeColors } from '@/hooks/useThemeColors'
import { fileIdFromStorageKey } from '@/lib/fileKey'
import { FilePickError, pickFile, type PickSource } from '@/services/filePicker'
import { getDownloadUrl, uploadFile } from '@/services/files'
import { useToastApiError, useToastSuccess } from '@/services/toast'
import { useAuthStore } from '@/stores/authStore'
import { softShadows } from '@/theme/shadows'

type Preview = { url: string; mime: string; name: string }

type StageFileFieldProps = {
  projectId: string
  label: string
  /** Stored storage key (`…/{fileId}-{name}`), or '' when empty. */
  value: string
  onChange: (key: string) => void
  disabled?: boolean
}

function SourceRow({
  icon: Icon,
  label,
  onPress,
}: {
  icon: LucideIcon
  label: string
  onPress: () => void
}) {
  const colors = useThemeColors()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-16 flex-row items-center gap-4 rounded-2xl bg-muted px-4 active:opacity-70"
      onPress={onPress}
    >
      <View className="size-10 items-center justify-center rounded-xl bg-primary/10">
        <Icon size={20} color={colors.primary} />
      </View>
      <Text className="flex-1 text-base font-semibold text-foreground">{label}</Text>
    </Pressable>
  )
}

/**
 * Attach a photo or document to a project stage.
 * Camera / photo-library permissions are requested on demand (see `pickFile`),
 * the file goes presign → direct PUT to storage → complete, and the returned
 * storage key is what the stage form saves — the same contract as civil-web.
 */
export function StageFileField({
  projectId,
  label,
  value,
  onChange,
  disabled = false,
}: StageFileFieldProps) {
  const { t } = useTranslation()
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  const accessToken = useAuthStore((s) => s.tokens?.accessToken ?? null)
  const toastApiError = useToastApiError()
  const toastSuccess = useToastSuccess()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  // After an upload the local image is already shown; skip refetching it once.
  const skipFetchFor = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!value) {
      setPreview(null)
      return
    }
    if (skipFetchFor.current === value) {
      skipFetchFor.current = null
      return
    }
    const fileId = fileIdFromStorageKey(value)
    if (!fileId || !accessToken) {
      setPreview(null)
      return
    }
    getDownloadUrl(accessToken, fileId)
      .then((result) => {
        if (cancelled) return
        setPreview({ url: result.downloadUrl, mime: result.mime, name: result.originalName })
      })
      .catch(() => {
        if (!cancelled) setPreview(null)
      })
    return () => {
      cancelled = true
    }
  }, [value, accessToken])

  async function onPick(source: PickSource) {
    setSheetOpen(false)
    if (!accessToken) return
    try {
      const picked = await pickFile(source, t)
      if (!picked) return
      setIsUploading(true)
      const uploaded = await uploadFile(accessToken, {
        ...picked,
        entityType: 'PROJECT',
        entityId: projectId,
      })
      skipFetchFor.current = uploaded.key
      setPreview({
        url: picked.mime.startsWith('image/') ? picked.uri : '',
        mime: uploaded.mime,
        name: uploaded.originalName,
      })
      onChange(uploaded.key)
      toastSuccess(t('files.uploaded'))
    } catch (error) {
      if (error instanceof FilePickError) {
        toastApiError(new Error(t(`files.${error.code}`)))
      } else {
        toastApiError(error instanceof Error ? error : new Error(t('files.uploadFailed')))
      }
    } finally {
      setIsUploading(false)
    }
  }

  const isImage = Boolean(preview?.mime.startsWith('image/') && preview.url)
  const hasFile = Boolean(value)
  const busy = disabled || isUploading

  return (
    <View className="gap-3">
      <Text className="text-sm font-semibold text-foreground">{label}</Text>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={hasFile ? t('files.replace') : t('files.add')}
        accessibilityState={{ busy: isUploading, disabled: busy }}
        disabled={busy}
        scaleTo={0.98}
        className={`h-40 overflow-hidden rounded-3xl border-[1.5px] ${
          hasFile ? 'border-border/40 bg-muted' : 'border-dashed border-primary/40 bg-primary/5'
        }`}
        onPress={() => setSheetOpen(true)}
      >
        {isImage && preview ? (
          <Image
            source={{ uri: preview.url }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={200}
          />
        ) : hasFile ? (
          <View className="flex-1 items-center justify-center gap-2 px-6">
            <View className="size-14 items-center justify-center rounded-2xl bg-card">
              {preview?.mime.startsWith('image/') ? (
                <ImageIcon size={26} color={colors.primary} />
              ) : (
                <FileText size={26} color={colors.primary} />
              )}
            </View>
            <Text className="text-center text-sm font-semibold text-foreground" numberOfLines={2}>
              {preview?.name || t('files.attached')}
            </Text>
          </View>
        ) : (
          <View className="flex-1 items-center justify-center gap-2">
            <View
              className="size-14 items-center justify-center rounded-full bg-card"
              style={softShadows.card}
            >
              <Upload size={24} color={colors.primary} />
            </View>
            <Text className="text-sm font-semibold text-primary">{t('files.add')}</Text>
            <Text className="text-xs text-muted-foreground">{t('files.empty')}</Text>
          </View>
        )}

        {isUploading ? (
          <View className="absolute inset-0 items-center justify-center gap-2 bg-background/80">
            <ActivityIndicator color={colors.primary} />
            <Text className="text-sm font-semibold text-foreground">{t('files.uploading')}</Text>
          </View>
        ) : null}
      </PressableScale>

      {hasFile && !isUploading ? (
        <View className="flex-row gap-3">
          {preview && !isImage && preview.url ? (
            <Pressable
              accessibilityRole="button"
              className="h-11 flex-1 items-center justify-center rounded-full border border-border/60 bg-card active:opacity-70"
              onPress={() => void WebBrowser.openBrowserAsync(preview.url)}
            >
              <Text className="text-sm font-semibold text-foreground">{t('files.open')}</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={disabled}
            className="h-11 flex-row items-center justify-center gap-2 rounded-full bg-destructive/10 px-5 active:opacity-70"
            onPress={() => onChange('')}
          >
            <Trash2 size={16} color={colors.error} />
            <Text className="text-sm font-semibold text-destructive">{t('files.remove')}</Text>
          </Pressable>
        </View>
      ) : null}

      <Modal
        visible={sheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetOpen(false)}
        statusBarTranslucent
      >
        <Pressable
          accessibilityLabel={t('files.cancel')}
          className="flex-1 justify-end bg-black/50"
          onPress={() => setSheetOpen(false)}
        >
          <Pressable
            className="gap-3 rounded-t-[32px] bg-background px-5 pt-3"
            style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
          >
            <View className="mb-1 h-1.5 w-10 self-center rounded-full bg-border" />
            <Text className="pb-1 text-lg font-bold text-foreground">{t('files.sheetTitle')}</Text>
            <SourceRow
              icon={Camera}
              label={t('files.takePhoto')}
              onPress={() => void onPick('camera')}
            />
            <SourceRow
              icon={ImageIcon}
              label={t('files.chooseLibrary')}
              onPress={() => void onPick('library')}
            />
            <SourceRow
              icon={hasFile ? RefreshCw : FolderOpen}
              label={t('files.chooseFile')}
              onPress={() => void onPick('file')}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}
