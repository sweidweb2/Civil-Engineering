import { useCallback, useState } from 'react'
import { Text, View } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { router } from 'expo-router'
import { Camera, Download, FolderOpen, Images, PenTool, Trash2 } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { Pressable } from '@/components/ui/pressable'
import { PvOptionSheet } from '@/features/provider/ui/kit'
import { WkConfirm, type WkConfirmState } from '@/features/worker/ui/kit'
import { WkFormScreen, WkSection } from '@/features/worker/ui/forms'
import { useFilePick } from '@/hooks/useFilePick'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { useRemoteData } from '@/hooks/useRemoteData'
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

async function openFile(path: string | null, fallbackUrl: string | null) {
  if (fallbackUrl) {
    await WebBrowser.openBrowserAsync(fallbackUrl)
    return
  }
  const fileId = path ? fileIdFromStorageKey(path) : null
  if (!fileId) return
  const result = await getDownloadUrl(fileId)
  await WebBrowser.openBrowserAsync(result.downloadUrl)
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
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<WkConfirmState | null>(null)

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
                  void openFile(request.requirementFilePath, request.requirementFileUrl).catch(
                    (e) => handleApiError(e, t('common.errorGeneric')),
                  )
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
                  void openFile(request.responseFilePath, request.responseFileUrl).catch((e) =>
                    handleApiError(e, t('common.errorGeneric')),
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

          <WkSection icon={PenTool} title={t('designRequests.actions')}>
            <View className="gap-2">
              {isAdmin && request.status === 'PENDING' ? (
                <ActionButton
                  label={t('designRequests.markInProgress')}
                  disabled={busy}
                  onPress={() => void setStatus('IN_PROGRESS')}
                />
              ) : null}
              {isAdmin && (request.status === 'PENDING' || request.status === 'IN_PROGRESS') ? (
                <>
                  <ActionButton
                    label={t('designRequests.markCompleted')}
                    disabled={busy}
                    onPress={() => void setStatus('COMPLETED')}
                  />
                  <ActionButton
                    label={t('designRequests.markRejected')}
                    destructive
                    disabled={busy}
                    onPress={() => void setStatus('REJECTED')}
                  />
                </>
              ) : null}
              {!isAdmin && canCancelDesignRequest(request.status) ? (
                <ActionButton
                  label={t('designRequests.cancelRequest')}
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
              ) : null}
              {canDeleteDesignRequest(request.status) ? (
                <ActionButton
                  label={t('designRequests.deleteRequest')}
                  destructive
                  icon
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
            </View>
          </WkSection>
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
    </WkFormScreen>
  )
}

function ActionButton({
  label,
  onPress,
  disabled,
  destructive,
  icon,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  destructive?: boolean
  icon?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className={`h-11 flex-row items-center justify-center gap-2 rounded-xl active:opacity-90 ${
        destructive ? 'bg-red-500/15' : 'bg-wk-sf2'
      }`}
    >
      {icon ? <Trash2 size={16} color={destructive ? '#dc2626' : undefined} /> : null}
      <Text className={`text-[14px] font-semibold ${destructive ? 'text-red-600' : 'text-wk-ink'}`}>
        {label}
      </Text>
    </Pressable>
  )
}
