import { useCallback, useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'

import {
  Avatar,
  ChoiceField,
  DangerZone,
  FieldRow,
  FormScreen,
  Section,
  StatusPill,
  TextField,
  ToggleRow,
  toneForStatus,
} from '@/components/kit'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumLabel, enumOptions } from '@/i18n/labels'
import { invalidateAdminCaches } from '@/lib/cacheKeys'
import { ltr } from '@/lib/rtl'
import { userDisplayName } from '@/lib/user'
import type { AuthRole } from '@/services/auth'
import { showBlockingAlert } from '@/services/feedback'
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

  function onDeactivate() {
    if (!userId || isDeactivating) return
    showBlockingAlert(t('users.deactivateTitle'), t('users.deactivateBody'), {
      destructive: true,
      cancelLabel: t('common.cancel'),
      confirmLabel: t('users.deactivate'),
      onConfirm: () => {
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

  return (
    <FormScreen
      title={user ? userDisplayName(user) : t('users.user')}
      subtitle={user?.email ? ltr(user.email) : undefined}
      backHref={BASE}
      isLoading={remote.isLoading}
      error={remote.status === 'error' ? remote.error : undefined}
      onRetry={() => void remote.refetch()}
      loadingLabel={t('users.loadingOne')}
      footer={
        <>
          <Button
            className="flex-1"
            onPress={() => void onSave()}
            disabled={isSaving}
            accessibilityState={{ busy: isSaving }}
          >
            {isSaving ? <ButtonSpinner /> : null}
            <ButtonText>{isSaving ? t('common.saving') : t('common.save')}</ButtonText>
          </Button>
        </>
      }
    >
      {user ? (
        <>
          <View className="flex-row items-center gap-4">
            <Avatar name={userDisplayName(user)} imageUrl={user.profile?.avatarUrl} size={64} />
            <View className="min-w-0 flex-1 gap-1.5">
              <Text className="text-xl font-semibold text-foreground" numberOfLines={1}>
                {userDisplayName(user)}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <StatusPill
                  label={enumLabel(t, 'userStatus', user.status)}
                  tone={toneForStatus(user.status)}
                />
                <StatusPill label={enumLabel(t, 'role', user.role)} tone="neutral" />
              </View>
            </View>
          </View>

          <Section title={t('users.access')}>
            <ChoiceField
              label={t('users.role')}
              options={enumOptions(t, 'role', AUTH_ROLE_OPTIONS)}
              value={role}
              onChange={(value) => setRole(value as AuthRole)}
            />
            <ChoiceField
              label={t('users.status')}
              options={enumOptions(t, 'userStatus', STATUS_OPTIONS)}
              value={status}
              onChange={(value) => setStatus(value as UserStatus)}
            />
            <ToggleRow
              label={t('users.verified')}
              value={isVerified}
              onValueChange={setIsVerified}
            />
          </Section>

          {user.role === 'WORKER' ? (
            <Section title={t('users.workerDirectory')}>
              <ToggleRow
                label={t('users.workerVisible')}
                description={
                  hasWorkerProfile
                    ? t('users.workerVisibleHint')
                    : t('users.workerVisibleCreateHint')
                }
                value={isPublic}
                onValueChange={(value) => void onToggleWorkerVisibility(value)}
                disabled={isSavingVisibility}
              />
            </Section>
          ) : null}

          <Section title={t('users.profile')}>
            <FieldRow>
              <TextField
                label={t('common.firstName')}
                value={firstName}
                onChangeText={setFirstName}
              />
              <TextField label={t('common.lastName')} value={lastName} onChangeText={setLastName} />
            </FieldRow>
            <TextField
              label={t('common.displayName')}
              value={displayName}
              onChangeText={setDisplayName}
            />
            <TextField
              label={t('common.phone')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </Section>
        </>
      ) : null}
      {user ? (
        <DangerZone title={t('common.dangerZone')}>
          <Button
            variant="destructive"
            onPress={onDeactivate}
            disabled={isDeactivating || user?.status === 'INACTIVE'}
            accessibilityState={{ busy: isDeactivating }}
          >
            {isDeactivating ? <ButtonSpinner /> : null}
            <ButtonText>{t('users.deactivate')}</ButtonText>
          </Button>
        </DangerZone>
      ) : null}
    </FormScreen>
  )
}
