import { useEffect, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { Camera, FileCheck2, FileUp, FolderOpen, Images, Upload, X } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { ImagePreviewModal } from '@/components/files/ImagePreviewModal'
import { Pressable } from '@/components/ui/pressable'
import { PvOptionSheet } from '@/components/wk/storefront'
import { useWkPalette } from '@/components/wk/palette'
import { useFilePick } from '@/hooks/useFilePick'
import { useRemoteFilePreview } from '@/hooks/useRemoteFilePreview'
import { fileIdFromStorageKey } from '@/lib/fileKey'
import { getDownloadUrl, uploadFile } from '@/services/files'
import { useToastApiError, useToastSuccess } from '@/services/toast'

/**
 * One stage document slot: icon tile, label, file name (or "Not uploaded"),
 * and Upload / remove. Same storage contract as StageFileField: presign →
 * direct PUT → complete, and the storage key is what the stage form saves.
 */
export function StageDocRow({
  projectId,
  label,
  value,
  onChange,
  disabled = false,
}: {
  projectId: string
  label: string
  /** Stored storage key, or '' when empty. */
  value: string
  onChange: (key: string) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const { c, shadow } = useWkPalette()
  const toastSuccess = useToastSuccess()
  const toastApiError = useToastApiError()
  const { sheetOpen, setSheetOpen, isBusy, pickAndRun } = useFilePick()
  const { openRemoteFile, beginPreview, previewState, closePreview, isOpeningPreview } =
    useRemoteFilePreview()
  const [file, setFile] = useState<{ name: string; url: string; mime: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    const fileId = value ? fileIdFromStorageKey(value) : null
    if (!fileId) {
      setFile(null)
      return
    }
    getDownloadUrl(fileId)
      .then((r) => {
        if (!cancelled) setFile({ name: r.originalName, url: r.downloadUrl, mime: r.mime })
      })
      .catch(() => {
        if (!cancelled) setFile(null)
      })
    return () => {
      cancelled = true
    }
  }, [value])

  const has = Boolean(value)
  const name = file?.name || (has ? t('files.attached') : t('pmPortal.notUploaded'))
  const opening = isBusy || isOpeningPreview

  return (
    <View className="min-h-16 flex-row items-center gap-3 rounded-[14px] bg-wk-sf2 py-2.5 pe-1.5 ps-3">
      <View
        className={`size-10 items-center justify-center rounded-[11px] ${
          has ? 'bg-wk-brand-soft' : 'bg-wk-sf'
        }`}
      >
        {has ? (
          <FileCheck2 size={18} color={c.brand} strokeWidth={1.9} />
        ) : (
          <FileUp size={18} color={c.ink3} strokeWidth={1.9} />
        )}
      </View>
      <Pressable
        accessibilityRole={file?.url ? 'button' : undefined}
        accessibilityLabel={file?.url ? `${t('files.open')} ${name}` : undefined}
        disabled={!file?.url || opening}
        onPress={() => {
          if (!file?.url) return
          beginPreview()
          void openRemoteFile({ url: file.url, mime: file.mime, name: file.name }).catch((e) => {
            closePreview()
            toastApiError(e instanceof Error ? e : new Error(t('files.previewFailed')))
          })
        }}
        className="min-w-0 flex-1 gap-0.5"
      >
        <Text className="text-[13px] font-medium leading-4 text-wk-ink2" numberOfLines={2}>
          {label}
        </Text>
        <Text
          className={`text-[13px] font-medium ${has ? 'text-wk-ink' : 'text-wk-ink3'}`}
          numberOfLines={1}
          style={{ writingDirection: 'ltr' }}
        >
          {name}
        </Text>
      </Pressable>
      {opening ? (
        <View className="size-11 items-center justify-center">
          <ActivityIndicator size="small" color={c.ink3} />
        </View>
      ) : has ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('files.remove')} ${label}`}
          disabled={disabled}
          onPress={() => onChange('')}
          className="size-11 items-center justify-center rounded-xl active:opacity-60"
        >
          <X size={18} color={c.ink3} strokeWidth={2} />
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('pmPortal.upload')} ${label}`}
          disabled={disabled}
          onPress={() => setSheetOpen(true)}
          className="me-1 h-10 flex-row items-center gap-1.5 rounded-[10px] bg-wk-sf px-3 active:opacity-80"
          style={shadow}
        >
          <Upload size={15} color={c.ink} strokeWidth={2} />
          <Text className="text-[13px] font-semibold text-wk-ink">{t('pmPortal.upload')}</Text>
        </Pressable>
      )}

      <PvOptionSheet
        visible={sheetOpen}
        title={label}
        onClose={() => setSheetOpen(false)}
        options={(
          [
            ['camera', Camera, t('files.takePhoto')],
            ['library', Images, t('files.chooseLibrary')],
            ['file', FolderOpen, t('files.chooseFile')],
          ] as const
        ).map(([source, icon, text]) => ({
          key: source,
          icon,
          label: text,
          onPress: () =>
            void pickAndRun(source, async (picked) => {
              const uploaded = await uploadFile({
                ...picked,
                entityType: 'PROJECT',
                entityId: projectId,
              })
              setFile({ name: uploaded.originalName, url: '', mime: uploaded.mime })
              onChange(uploaded.key)
              toastSuccess(t('files.uploaded'))
            }),
        }))}
      />

      <ImagePreviewModal state={previewState} onClose={closePreview} />
    </View>
  )
}
