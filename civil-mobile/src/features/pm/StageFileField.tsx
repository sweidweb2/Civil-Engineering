import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { Image } from 'expo-image'
import * as WebBrowser from 'expo-web-browser'
import { FileText, ImageIcon, Upload } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { PickSourceSheet } from '@/components/files/PickSourceSheet'
import { PressableScale } from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { useFilePick } from '@/hooks/useFilePick'
import { useThemeColors } from '@/hooks/useThemeColors'
import { fileIdFromStorageKey } from '@/lib/fileKey'
import { getDownloadUrl, uploadFile } from '@/services/files'
import { useToastSuccess } from '@/services/toast'
import { sizes } from '@/theme/sizes'

type Preview = { url: string; mime: string; name: string }

type StageFileFieldProps = {
  projectId: string
  label: string
  /** Stored storage key (`…/{fileId}-{name}`), or '' when empty. */
  value: string
  onChange: (key: string) => void
  disabled?: boolean
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
  const toastSuccess = useToastSuccess()
  const { sheetOpen, setSheetOpen, isBusy, pickAndRun } = useFilePick()

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
    if (!fileId) {
      setPreview(null)
      return
    }
    getDownloadUrl(fileId)
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
  }, [value])

  const isImage = Boolean(preview?.mime.startsWith('image/') && preview.url)
  const hasFile = Boolean(value)
  const busy = disabled || isBusy

  return (
    <View className="gap-3">
      <Text className="text-caption text-ink-2">{label}</Text>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={hasFile ? t('files.replace') : t('files.add')}
        accessibilityState={{ busy: isBusy, disabled: busy }}
        disabled={busy}
        scaleTo={0.98}
        className={`h-40 overflow-hidden rounded-md border bg-card ${
          hasFile ? 'border-border' : 'border-dashed border-line-strong'
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
            {preview?.mime.startsWith('image/') ? (
              <ImageIcon size={sizes.icon} color={colors.muted} strokeWidth={sizes.iconStroke} />
            ) : (
              <FileText size={sizes.icon} color={colors.muted} strokeWidth={sizes.iconStroke} />
            )}
            <Text className="text-center text-sm font-medium text-foreground" numberOfLines={2}>
              {preview?.name || t('files.attached')}
            </Text>
          </View>
        ) : (
          <View className="flex-1 items-center justify-center gap-2">
            <Upload size={sizes.icon} color={colors.ink} strokeWidth={sizes.iconStroke} />
            <Text className="text-sm font-medium text-foreground">{t('files.add')}</Text>
            <Text className="text-xs text-muted-foreground">{t('files.empty')}</Text>
          </View>
        )}

        {isBusy ? (
          <View className="absolute inset-0 items-center justify-center gap-2 bg-background/80">
            <ActivityIndicator color={colors.muted} />
            <Text className="text-sm font-medium text-foreground">{t('files.uploading')}</Text>
          </View>
        ) : null}
      </PressableScale>

      {hasFile && !isBusy ? (
        <View className="flex-row gap-3">
          {preview && !isImage && preview.url ? (
            <Pressable
              accessibilityRole="button"
              className="h-11 flex-1 items-center justify-center rounded-md border border-border bg-card active:bg-background"
              onPress={() => void WebBrowser.openBrowserAsync(preview.url)}
            >
              <Text className="text-sm font-medium text-foreground">{t('files.open')}</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={disabled}
            className="h-11 items-center justify-center rounded-md px-4 active:bg-muted"
            onPress={() => onChange('')}
          >
            <Text className="text-sm font-medium text-destructive">{t('files.remove')}</Text>
          </Pressable>
        </View>
      ) : null}

      <PickSourceSheet
        visible={sheetOpen}
        title={t('files.sheetTitle')}
        onClose={() => setSheetOpen(false)}
        allowFile
        hasExisting={hasFile}
        onPick={(source) => {
          void pickAndRun(source, async (picked) => {
            const uploaded = await uploadFile({
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
          })
        }}
      />
    </View>
  )
}
