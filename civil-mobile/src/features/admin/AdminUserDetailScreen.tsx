import { useCallback, useEffect, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'

import { AsyncState } from '@/components/feedback/AsyncState'
import { FormField } from '@/components/forms/FormField'
import { OptionChips } from '@/components/forms/OptionChips'
import { Header } from '@/components/layout/Header'
import { Badge, BadgeText } from '@/components/ui/badge'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { Input, InputField } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { BackButton } from '@/features/pm/components/BackButton'
import { useRemoteData } from '@/hooks/useRemoteData'
import { ApiError } from '@/services/api'
import type { AuthRole } from '@/services/auth'
import { showApiAlert, showBlockingAlert } from '@/services/feedback'
import { useToastApiError } from '@/services/toast'
import {
  AUTH_ROLE_OPTIONS,
  deactivateUser,
  getUser,
  updateUser,
  type UserStatus,
} from '@/services/users'

const BASE = '/admin/users'

const STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'PENDING', label: 'Pending' },
]

export function AdminUserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const userId = typeof id === 'string' ? id : id?.[0]
  const toastApiError = useToastApiError()

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
  const [isSaving, setIsSaving] = useState(false)
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
      showBlockingAlert('Saved', 'User was updated.')
      await remote.refetch()
    } catch (err) {
      if (err instanceof ApiError && err.status >= 500) toastApiError(err)
      else showApiAlert(err, 'Could not save user')
    } finally {
      setIsSaving(false)
    }
  }

  function onDeactivate() {
    if (!userId || isDeactivating) return
    showBlockingAlert('Deactivate user?', 'The user will be marked inactive.', {
      cancelLabel: 'Cancel',
      confirmLabel: 'Deactivate',
      onConfirm: () => {
        void (async () => {
          setIsDeactivating(true)
          try {
            await deactivateUser(userId)
            showBlockingAlert('Deactivated', 'User was deactivated.')
            router.replace(BASE as never)
          } catch (err) {
            if (err instanceof ApiError && err.status >= 500) toastApiError(err)
            else showApiAlert(err, 'Could not deactivate user')
          } finally {
            setIsDeactivating(false)
          }
        })()
      },
    })
  }

  return (
    <View className="flex-1 bg-background">
      <Header
        title={user?.email ?? 'User'}
        leftSlot={<BackButton fallbackHref={BASE} />}
        rightSlot={
          user ? (
            <Badge variant={user.status === 'ACTIVE' ? 'default' : 'secondary'}>
              <BadgeText>{user.status}</BadgeText>
            </Badge>
          ) : undefined
        }
      />

      <AsyncState
        isLoading={remote.isLoading}
        error={remote.status === 'error' ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingLabel="Loading user…"
      >
        {user ? (
          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-4 px-5 pb-10 pt-2"
            keyboardShouldPersistTaps="handled"
          >
            <Text className="text-sm text-muted-foreground">{user.email}</Text>

            <FormField label="Role">
              <OptionChips
                options={AUTH_ROLE_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                value={role}
                onChange={(value) => setRole(value as AuthRole)}
              />
            </FormField>

            <FormField label="Status">
              <OptionChips
                options={STATUS_OPTIONS}
                value={status}
                onChange={(value) => setStatus(value as UserStatus)}
              />
            </FormField>

            <View className="flex-row gap-3">
              <View className="min-w-0 flex-1">
                <FormField label="First name">
                  <Input>
                    <InputField value={firstName} onChangeText={setFirstName} />
                  </Input>
                </FormField>
              </View>
              <View className="min-w-0 flex-1">
                <FormField label="Last name">
                  <Input>
                    <InputField value={lastName} onChangeText={setLastName} />
                  </Input>
                </FormField>
              </View>
            </View>

            <FormField label="Display name">
              <Input>
                <InputField value={displayName} onChangeText={setDisplayName} />
              </Input>
            </FormField>

            <FormField label="Phone">
              <Input>
                <InputField value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              </Input>
            </FormField>

            <View className="flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
              <Text className="text-sm font-medium text-foreground">Verified</Text>
              <Switch value={isVerified} onValueChange={setIsVerified} />
            </View>

            <Button
              onPress={() => void onSave()}
              disabled={isSaving}
              accessibilityState={{ busy: isSaving }}
            >
              {isSaving ? <ButtonSpinner /> : null}
              <ButtonText>{isSaving ? 'Saving…' : 'Save user'}</ButtonText>
            </Button>

            <Button
              variant="destructive"
              onPress={onDeactivate}
              disabled={isDeactivating || user.status === 'INACTIVE'}
              accessibilityState={{ busy: isDeactivating }}
            >
              {isDeactivating ? <ButtonSpinner /> : null}
              <ButtonText>{isDeactivating ? 'Deactivating…' : 'Deactivate user'}</ButtonText>
            </Button>
          </ScrollView>
        ) : null}
      </AsyncState>
    </View>
  )
}
