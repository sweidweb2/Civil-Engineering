import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  accountPasswordSchema,
  type AccountPasswordValues,
  accountProfileSchema,
  type AccountProfileValues,
} from '@/features/account/account.schema'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { useRemoteData } from '@/hooks/useRemoteData'
import { invalidateOwnAccountCaches } from '@/lib/cacheKeys'
import { type FieldErrors, parseForm } from '@/lib/form'
import { changePassword } from '@/services/auth'
import { useToastSuccess } from '@/services/toast'
import { getUser, updateUser } from '@/services/users'
import { useAuthStore } from '@/stores/authStore'

const EMPTY_PASSWORD: AccountPasswordValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

/** State + save for the signed-in user's own name and phone. */
export function useAccountDetails() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const userId = user?.id
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()

  const [form, setForm] = useState<AccountProfileValues>({
    firstName: user?.profile?.firstName ?? '',
    lastName: user?.profile?.lastName ?? '',
    displayName: user?.profile?.displayName ?? '',
    phone: '',
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSaving, setIsSaving] = useState(false)

  // The session only carries names; the full record adds the phone number.
  const load = useCallback(() => {
    if (!userId) return Promise.reject(new Error('Not signed in'))
    return getUser(userId)
  }, [userId])
  const remote = useRemoteData(load, { enabled: Boolean(userId) })
  const account = remote.status === 'success' ? remote.data.data : null

  useEffect(() => {
    if (!account) return
    setForm({
      firstName: account.profile?.firstName ?? '',
      lastName: account.profile?.lastName ?? '',
      displayName: account.profile?.displayName ?? '',
      phone: account.profile?.phone ?? '',
    })
  }, [account])

  function set<K extends keyof AccountProfileValues>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function onSave() {
    if (!userId) return
    const parsed = parseForm(accountProfileSchema(t), form)
    if (!parsed.success) {
      setErrors(parsed.fieldErrors)
      return
    }
    setErrors({})
    setIsSaving(true)
    try {
      const result = await updateUser(userId, parsed.data)
      const profile = result.data.profile
      useAuthStore.setState((state) => ({
        user: state.user
          ? {
              ...state.user,
              profile: {
                firstName: profile?.firstName ?? null,
                lastName: profile?.lastName ?? null,
                displayName: profile?.displayName ?? null,
              },
            }
          : state.user,
      }))
      invalidateOwnAccountCaches()
      toastSuccess(t('account.saved'))
    } catch (err) {
      handleApiError(err, t('account.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  return { user, form, set, errors, isSaving, onSave }
}

/** State + submit for changing the signed-in user's password. */
export function usePasswordChange() {
  const { t } = useTranslation()
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()
  const [form, setForm] = useState<AccountPasswordValues>(EMPTY_PASSWORD)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSaving, setIsSaving] = useState(false)

  function set<K extends keyof AccountPasswordValues>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function onSave() {
    const parsed = parseForm(accountPasswordSchema(t), form)
    if (!parsed.success) {
      setErrors(parsed.fieldErrors)
      return
    }
    setErrors({})
    setIsSaving(true)
    try {
      await changePassword(parsed.data)
      setForm(EMPTY_PASSWORD)
      toastSuccess(t('account.passwordUpdated'))
    } catch (err) {
      handleApiError(err, t('account.passwordFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  return { form, set, errors, isSaving, onSave }
}
