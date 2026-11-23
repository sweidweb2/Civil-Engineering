import { useCallback, useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Contact, ShieldCheck, UserRound } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { shortDate, USER_TONE } from '@/features/admin/ui'
import {
  WkChoice,
  WkDangerZone,
  WkField,
  WkFormScreen,
  WkSection,
  WkToggle,
} from '@/features/worker/ui/forms'
import { WkButton, WkCard, WkConfirm, type WkConfirmState, WkPill } from '@/features/worker/ui/kit'
import { WkMedia } from '@/features/worker/ui/list'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumLabel, enumOptions } from '@/i18n/labels'
import { invalidateAdminCaches } from '@/lib/cacheKeys'
import { ltr } from '@/lib/rtl'
import { userDisplayLabel, userDisplayName } from '@/lib/user'
import type { AuthRole } from '@/services/auth'
import { useToastSuccess } from '@/services/toast'
import {
  AUTH_ROLE_OPTIONS,
  deactivateUser,
  getUser,
  updateUser,
  type UserStatus,
} from '@/services/users'
import { getWorkerByUserId, setWorkerVisibility } from '@/services/workers'

const BASE = '/admin/users'
const STATUS_OPTIONS = [{ value: 'ACTIVE' }, { value: 'INACTIVE' }, { value: 'PENDING' }]

/** Admin user page: identity card, access, worker directory, profile, deactivate. */
export function AdminUserDetailScreen() {
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id: string }>()
  const userId = typeof id === 'string' ? id : id?.[0]
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()

  const load = useCallback(() => {
    if (!userId) return Promise.reject(new Error('User id required'))
    return getUser(userId)
  }, [userId])
  const remote = useRemoteData(load, { enabled: Boolean(userId) })
  const user = remote.status === 'success' ? remote.data.data : null
  const avatarUrl = remote.status === 'success' ? remote.data.meta.avatarDownloadUrl : null

  const [role, setRole] = useState<AuthRole>('CLIENT')
  const [status, setStatus] = useState<UserStatus>('ACTIVE')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  const [hasWorkerProfile, setHasWorkerProfile] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingVisibility, setIsSavingVisibility] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)
  const [confirm, setConfirm] = useState<WkConfirmState | null>(null)

  useEffect(() => {
    if (!user) return
    setRole(user.role)
    setStatus(user.status)
    setFirstName(user.profile?.firstName ?? '')
    setLastName(user.profile?.lastName ?? '')
    setDisplayName(user.profile?.displayName ?? '')
    setPhone(user.profile?.phone ?? '')
    setIsVerified(user.isVerified)
  }, [user])

  useEffect(() => {
    if (!userId || user?.role !== 'WORKER') {
      setHasWorkerProfile(false)
      setIsPublic(false)
      return
    }
    let cancelled = false
    void getWorkerByUserId(userId)
      .then((response) => {
        if (cancelled) return
        setHasWorkerProfile(true)
        setIsPublic(response.data.isPublic)
      })
      .catch(() => {
        if (cancelled) return
        // No CV yet — admin can still create one by toggling visibility.
        setHasWorkerProfile(false)
        setIsPublic(false)
      })
    return () => {
      cancelled = true
    }
  }, [user?.role, userId])

  async function onToggleWorkerVisibility(next: boolean) {
    if (!userId || isSavingVisibility) return
    setIsSavingVisibility(true)
    const previous = isPublic
    setIsPublic(next)
    try {
      await setWorkerVisibility(userId, next)
      setHasWorkerProfile(true)
      toastSuccess(t('users.workerVisibilitySaved'))
    } catch (err) {
      setIsPublic(previous)
      handleApiError(err, t('users.workerVisibilityFailed'))
    } finally {
      setIsSavingVisibility(false)
    }
  }

  async function onSave() {
    if (!userId) return
    setIsSaving(true)
    try {
      await updateUser(userId, {
        role,
        status,
        isVerified,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        displayName: displayName.trim() || undefined,
        phone: phone.trim() || undefined,
      })
      invalidateAdminCaches()
      toastSuccess(t('users.saved'))
      await remote.refetch()
    } catch (err) {
      handleApiError(err, t('users.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  function askDeactivate() {
    if (!userId || isDeactivating) return
    setConfirm({
      title: t('users.deactivateTitle'),
      body: t('users.deactivateBody'),
      cta: t('users.deactivate'),
      onConfirm: () => {
        setConfirm(null)
        void (async () => {
          setIsDeactivating(true)
          try {
            await deactivateUser(userId)
            invalidateAdminCaches()
            toastSuccess(t('users.deactivated'))
            router.replace(BASE as never)
          } catch (err) {
            handleApiError(err, t('users.deactivateFailed'))
          } finally {
            setIsDeactivating(false)
          }
        })()
      },
    })
  }

  const name = user ? userDisplayLabel(user) : t('users.user')
  const mediaName = user ? userDisplayName(user) : t('users.user')

  return (
    <WkFormScreen
      title={name}
      backHref={BASE}
      isLoading={remote.isLoading && !user}
      error={remote.status === 'error' ? remote.error : undefined}
      onRetry={() => void remote.refetch()}
      testID="e2e-admin-user"
      footer={
        user ? (
          <WkButton
            label={isSaving ? t('common.saving') : t('worker.saveChanges')}
            loading={isSaving}
            height={54}
            onPress={() => void onSave()}
          />
        ) : undefined
      }
    >
      {user ? (
        <>
          <WkCard className="flex-row items-center gap-3.5 rounded-3xl">
            <WkMedia
              // `profile.avatarUrl` is the avatar File id: a stable cache key, not a URL.
              photo={avatarUrl}
              photoKey={user.profile?.avatarUrl}
              name={mediaName}
              size={60}
              round
              hero
            />
            <View className="min-w-0 flex-1 gap-1">
              <Text
                className="text-[17px] font-semibold leading-[22px] text-wk-ink"
                numberOfLines={2}
              >
                {name}
              </Text>
              <Text className="text-[13px] text-wk-ink2" numberOfLines={1}>
                {ltr(user.email)}
              </Text>
              <Text className="text-[11px] text-wk-ink3">
                {t('adminPortal.joined', { date: shortDate(user.createdAt) })}
              </Text>
            </View>
            <WkPill
              label={enumLabel(t, 'userStatus', user.status)}
              tone={USER_TONE[user.status]}
              size="md"
            />
          </WkCard>

          <WkSection icon={ShieldCheck} title={t('users.access')}>
            <WkChoice
              label={t('users.role')}
              options={enumOptions(t, 'role', AUTH_ROLE_OPTIONS)}
              value={role}
              onChange={(value) => setRole(value as AuthRole)}
            />
            <WkChoice
              label={t('users.status')}
              options={enumOptions(t, 'userStatus', STATUS_OPTIONS)}
              value={status}
              onChange={(value) => setStatus(value as UserStatus)}
            />
            <WkToggle
              label={t('users.verified')}
              hint={t('adminPortal.verifiedHint')}
              value={isVerified}
              onChange={setIsVerified}
            />
          </WkSection>

          {user.role === 'WORKER' ? (
            <WkSection icon={Contact} title={t('users.workerDirectory')}>
              <WkToggle
                label={t('users.workerVisible')}
                hint={
                  hasWorkerProfile
                    ? t('users.workerVisibleHint')
                    : t('users.workerVisibleCreateHint')
                }
                value={isPublic}
                onChange={(value) => void onToggleWorkerVisibility(value)}
              />
            </WkSection>
          ) : null}

          <WkSection icon={UserRound} title={t('users.profile')}>
            <WkField label={t('common.firstName')} value={firstName} onChangeText={setFirstName} />
            <WkField label={t('common.lastName')} value={lastName} onChangeText={setLastName} />
            <WkField
              label={t('common.displayName')}
              value={displayName}
              onChangeText={setDisplayName}
            />
            <WkField
              label={t('common.phone')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              ltr
            />
          </WkSection>

          <WkDangerZone
            title={t('common.dangerZone')}
            body={t('users.deactivateBody')}
            label={t('users.deactivate')}
            disabled={isDeactivating || user.status === 'INACTIVE'}
            onPress={askDeactivate}
          />
        </>
      ) : null}
      <WkConfirm state={confirm} onCancel={() => setConfirm(null)} />
    </WkFormScreen>
  )
}
