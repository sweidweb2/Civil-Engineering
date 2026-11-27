import { useCallback, useState } from 'react'
import { Text, View } from 'react-native'
import { router } from 'expo-router'
import type { LucideIcon } from 'lucide-react-native'
import {
  Ban,
  Camera,
  CheckCircle2,
  CircleDot,
  Download,
  FolderOpen,
  Images,
  PenTool,
  Play,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { ImagePreviewModal } from '@/components/files/ImagePreviewModal'
import { Pressable } from '@/components/ui/pressable'
import { WkDangerZone, WkFormScreen, WkSection } from '@/components/wk/forms'
import { WkConfirm, type WkConfirmState } from '@/components/wk/kit'
import { useWkPalette } from '@/components/wk/palette'
import { PvOptionSheet } from '@/components/wk/storefront'
import { useFilePick } from '@/hooks/useFilePick'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { useRemoteData } from '@/hooks/useRemoteData'
import { useRemoteFilePreview } from '@/hooks/useRemoteFilePreview'
import { cacheKeys } from '@/lib/cacheKeys'
import { fileIdFromStorageKey } from '@/lib/fileKey'
import { remoteCacheInvalidate } from '@/lib/remoteCache'
import {
  canCancelDesignRequest,
  canDeleteDesignRequest,
  deleteDesignRequest,
  designCategoryLabel,
  type DesignRequestStatus,
  designRequestStatusLabel,
  getDesignRequest,
  updateDesignRequestStatus,
  uploadDesignResponseFile,
} from '@/services/design-requests'
import { getDownloadUrl } from '@/services/files'
import { useToastSuccess } from '@/services/toast'

type DesignRequestDetailScreenProps = {
  id: string
  basePath: '/pm/design-requests' | '/admin/design-requests'
  isAdmin?: boolean
}

/** Shared PM/admin detail: read-only fields, status actions, response upload (admin). */
export function DesignRequestDetailScreen({
  id,
  basePath,
  isAdmin = false,
}: DesignRequestDetailScreenProps) {
  const { t } = useTranslation()
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()
  const { sheetOpen, setSheetOpen, isBusy, pickAndRun } = useFilePick()
  const { openRemoteFile, beginPreview, closePreview, previewState } = useRemoteFilePreview()
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<WkConfirmState | null>(null)

  const openAttachedFile = useCallback(
    async (path: string | null, fallbackUrl: string | null) => {
      beginPreview()
      try {
        if (fallbackUrl) {
          await openRemoteFile({ url: fallbackUrl, name: path })
          return
        }
        const fileId = path ? fileIdFromStorageKey(path) : null
        if (!fileId) {
          closePreview()
          return
        }
        const result = await getDownloadUrl(fileId)
        await openRemoteFile({
          url: result.downloadUrl,
          mime: result.mime,
          name: result.originalName,
        })
      } catch (error) {
        closePreview()
        throw error
      }
    },
    [beginPreview, closePreview, openRemoteFile],
  )

  const load = useCallback(() => getDesignRequest(id), [id])
  const remote = useRemoteData(load, {
    cacheKey: `${cacheKeys.designRequests}:detail:${id}`,
    enabled: Boolean(id),
  })
  const request = remote.status === 'success' ? remote.data : null

  const invalidate = () => {
    remoteCacheInvalidate(cacheKeys.designRequests)
  }

  const setStatus = async (status: DesignRequestStatus) => {
    if (!request) return
    setBusy(true)
    try {
      await updateDesignRequestStatus(request.id, status)
      toastSuccess(t('designRequests.statusUpdated'))
      invalidate()
      await remote.refetch({ fresh: true })
    } catch (error) {
      handleApiError(error, t('designRequests.couldNotUpdateStatus'))
    } finally {
      setBusy(false)
    }
  }

  const canUpload =
    isAdmin && request && (request.status === 'PENDING' || request.status === 'IN_PROGRESS')

  return (
    <WkFormScreen
      title={request?.subject ?? t('designRequests.title')}
      backHref={basePath}
      isLoading={remote.isLoading}
      error={remote.status === 'error' ? remote.error : undefined}
      onRetry={() => void remote.refetch()}
    >
      {request ? (
        <>
          <WkSection icon={PenTool} title={t('designRequests.details')}>
            <View className="gap-3">
              <Text className="text-[12px] font-medium text-wk-ink3">
                {designRequestStatusLabel(request.status)} · {designCategoryLabel(request.category)}
              </Text>
              <Text className="text-[14px] leading-5 text-wk-ink">{request.description}</Text>
              <Text className="text-[13px] text-wk-ink2">
                {t('designRequests.neededBy')}: {new Date(request.neededBy).toLocaleDateString()}
              </Text>
              <Text className="text-[13px] text-wk-ink2">
                {t('designRequests.project')}:{' '}
                {request.projectName ?? t('designRequests.noProject')}
              </Text>
              {isAdmin ? (
                <Text className="text-[13px] text-wk-ink2">
                  {t('designRequests.requester')}: {request.requestedByName}
                </Text>
              ) : null}
            </View>
          </WkSection>

          <WkSection icon={Download} title={t('designRequests.requirementFile')}>
            {request.requirementFilePath || request.requirementFileUrl ? (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  void openAttachedFile(
                    request.requirementFilePath,
                    request.requirementFileUrl,
                  ).catch((e) => handleApiError(e, t('files.previewFailed')))
                }
                className="h-11 items-center justify-center rounded-xl bg-wk-sf2 active:opacity-80"
              >
                <Text className="text-[14px] font-semibold text-wk-ink">{t('files.open')}</Text>
              </Pressable>
            ) : (
              <Text className="text-[13px] text-wk-ink3">
                {t('designRequests.noRequirementFile')}
              </Text>
            )}
          </WkSection>

          <WkSection icon={Download} title={t('designRequests.responseSection')}>
            {request.responseFilePath || request.responseFileUrl ? (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  void openAttachedFile(request.responseFilePath, request.responseFileUrl).catch(
                    (e) => handleApiError(e, t('files.previewFailed')),
                  )
                }
                className="mb-2 h-11 items-center justify-center rounded-xl bg-wk-sf2 active:opacity-80"
              >
                <Text className="text-[14px] font-semibold text-wk-ink">{t('files.open')}</Text>
              </Pressable>
            ) : (
              <Text className="mb-2 text-[13px] text-wk-ink3">
                {t('designRequests.noResponseFile')}
              </Text>
            )}
            {canUpload ? (
              <Pressable
                accessibilityRole="button"
                disabled={busy || isBusy}
                onPress={() => setSheetOpen(true)}
                className="h-11 items-center justify-center rounded-xl bg-wk-brand active:opacity-90"
              >
                <Text className="text-[14px] font-semibold text-white">
                  {t('designRequests.uploadResponse')}
                </Text>
              </Pressable>
            ) : null}
          </WkSection>

          {isAdmin && (request.status === 'PENDING' || request.status === 'IN_PROGRESS') ? (
            <WkSection icon={CircleDot} title={t('designRequests.updateStatus')}>
              <Text className="mb-1 text-[13px] text-wk-ink3">
                {t('designRequests.currentStatus', {
                  status: designRequestStatusLabel(request.status),
                })}
              </Text>
              <View className="gap-2">
                {request.status === 'PENDING' ? (
                  <StatusAction
                    icon={Play}
                    tone="brand"
                    title={t('designRequests.startWork')}
                    hint={t('designRequests.startWorkHint')}
                    disabled={busy}
                    onPress={() => void setStatus('IN_PROGRESS')}
                  />
                ) : null}
                <StatusAction
                  icon={CheckCircle2}
                  tone="brand"
                  title={t('designRequests.completeWork')}
                  hint={t('designRequests.completeWorkHint')}
                  disabled={busy}
                  onPress={() => void setStatus('COMPLETED')}
                />
                <StatusAction
                  icon={Ban}
                  tone="danger"
                  title={t('designRequests.rejectRequest')}
                  hint={t('designRequests.rejectHint')}
                  disabled={busy}
                  onPress={() =>
                    setConfirm({
                      title: t('designRequests.confirmRejectTitle'),
                      body: t('designRequests.confirmRejectBody'),
                      cta: t('designRequests.rejectRequest'),
                      onConfirm: () => {
                        setConfirm(null)
                        void setStatus('REJECTED')
                      },
                    })
                  }
                />
              </View>
            </WkSection>
          ) : null}

          {isAdmin &&
          (request.status === 'COMPLETED' ||
            request.status === 'REJECTED' ||
            request.status === 'CANCELLED') ? (
            <View className="rounded-[18px] border border-wk-line bg-wk-sf2 px-4 py-3.5">
              <Text className="text-[13px] leading-5 text-wk-ink2">
                {t('designRequests.statusSettled', {
                  status: designRequestStatusLabel(request.status),
                })}
              </Text>
            </View>
          ) : null}

          {!isAdmin && canCancelDesignRequest(request.status) ? (
            <WkSection icon={Ban} title={t('designRequests.manageRequest')}>
              <StatusAction
                icon={Ban}
                tone="neutral"
                title={t('designRequests.cancelRequest')}
                hint={t('designRequests.cancelHint')}
                disabled={busy}
                onPress={() =>
                  setConfirm({
                    title: t('designRequests.confirmCancelTitle'),
                    body: t('designRequests.confirmCancelBody'),
                    cta: t('designRequests.cancelRequest'),
                    onConfirm: () => {
                      setConfirm(null)
                      void setStatus('CANCELLED')
                    },
                  })
                }
              />
            </WkSection>
          ) : null}

          {canDeleteDesignRequest(request.status) ? (
            <WkDangerZone
              title={t('designRequests.deleteZoneTitle')}
              body={t('designRequests.deleteZoneHint')}
              label={t('designRequests.deleteRequest')}
              disabled={busy}
              onPress={() =>
                setConfirm({
                  title: t('designRequests.confirmDeleteTitle'),
                  body: t('designRequests.confirmDeleteBody'),
                  cta: t('common.delete'),
                  onConfirm: () => {
                    setConfirm(null)
                    void (async () => {
                      setBusy(true)
                      try {
                        await deleteDesignRequest(request.id)
                        invalidate()
                        toastSuccess(t('designRequests.deleted'))
                        router.replace(basePath as never)
                      } catch (error) {
                        handleApiError(error, t('designRequests.couldNotDelete'))
                      } finally {
                        setBusy(false)
                      }
                    })()
                  },
                })
              }
            />
          ) : null}
        </>
      ) : null}

      <PvOptionSheet
        visible={sheetOpen}
        title={t('designRequests.uploadResponse')}
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
              setBusy(true)
              try {
                await uploadDesignResponseFile(id, {
                  uri: picked.uri,
                  mime: picked.mime,
                  name: picked.originalName,
                })
                toastSuccess(t('designRequests.responseUploaded'))
                invalidate()
                await remote.refetch({ fresh: true })
              } catch (error) {
                handleApiError(error, t('designRequests.couldNotUpload'))
              } finally {
                setBusy(false)
              }
            }),
        }))}
      />

      <WkConfirm state={confirm} onCancel={() => setConfirm(null)} />
      <ImagePreviewModal state={previewState} onClose={closePreview} />
    </WkFormScreen>
  )
}

function StatusAction({
  icon: Icon,
  tone,
  title,
  hint,
  onPress,
  disabled,
}: {
  icon: LucideIcon
  tone: 'brand' | 'danger' | 'neutral'
  title: string
  hint: string
  onPress: () => void
  disabled?: boolean
}) {
  const { c } = useWkPalette()
  const iconColor = tone === 'danger' ? c.red : tone === 'brand' ? c.brand : c.ink2
  const tileClass =
    tone === 'danger' ? 'bg-wk-red-soft' : tone === 'brand' ? 'bg-wk-brand-soft' : 'bg-wk-sf2'

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${hint}`}
      disabled={disabled}
      onPress={onPress}
      className="min-h-[64px] flex-row items-center gap-3 rounded-[16px] border border-wk-line bg-wk-sf px-3.5 py-3 active:bg-wk-sf2"
    >
      <View className={`size-10 items-center justify-center rounded-xl ${tileClass}`}>
        <Icon size={18} color={iconColor} strokeWidth={1.9} />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text
          className={`text-[14px] font-semibold ${tone === 'danger' ? 'text-wk-red' : 'text-wk-ink'}`}
        >
          {title}
        </Text>
        <Text className="text-[12px] leading-4 text-wk-ink3" numberOfLines={2}>
          {hint}
        </Text>
      </View>
    </Pressable>
  )
}
