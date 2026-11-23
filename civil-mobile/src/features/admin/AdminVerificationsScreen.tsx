import { useState } from 'react'
import { router } from 'expo-router'
import { BadgeCheck, ShieldCheck, ShieldOff, X } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { shortDate } from '@/features/admin/ui'
import { usePagedList, WkListRow, WkListScreen, WkMedia } from '@/features/worker/ui/list'
import type { WkTone } from '@/features/worker/ui/palette'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { enumLabel } from '@/i18n/labels'
import { cacheKeys, invalidateAdminCaches } from '@/lib/cacheKeys'
import { ltr } from '@/lib/rtl'
import { userDisplayLabel, userDisplayName } from '@/lib/user'
import { useToastSuccess } from '@/services/toast'
import {
  listVerifications,
  setVerification,
  type User,
  type VerificationCounts,
  type VerificationStatus,
} from '@/services/users'

const PAGE_SIZE = 20

const TONE: Record<VerificationStatus, WkTone> = {
  REQUESTED: 'amber',
  VERIFIED: 'green',
  UNVERIFIED: 'neutral',
}

/**
 * Admin → Worker verification. Only VERIFIED workers appear in the public
 * directory, so the REQUESTED tab is the to-do list.
 */
export function AdminVerificationsScreen() {
  const { t } = useTranslation()
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()
  const [busy, setBusy] = useState<{ id: string; next: VerificationStatus } | null>(null)
  const [counts, setCounts] = useState<VerificationCounts | null>(null)

  const list = usePagedList<User>({
    cacheKeyPrefix: cacheKeys.verifications,
    initialFilter: 'REQUESTED',
    fetcher: async ({ page, query, filter }) => {
      const r = await listVerifications({
        status: filter as VerificationStatus,
        page,
        limit: PAGE_SIZE,
        q: query || undefined,
      })
      if (r.meta.counts) setCounts(r.meta.counts)
      return r
    },
  })
  const filter = list.filter as VerificationStatus

  async function run(userId: string, next: VerificationStatus) {
    setBusy({ id: userId, next })
    try {
      await setVerification(userId, next)
      invalidateAdminCaches()
      toastSuccess(t('verifications.updated'))
      list.reload()
    } catch (err) {
      handleApiError(err, t('verifications.updateFailed'))
    } finally {
      setBusy(null)
    }
  }

  function action(user: User, key: 'verify' | 'reject' | 'revoke') {
    const next: VerificationStatus = key === 'verify' ? 'VERIFIED' : 'UNVERIFIED'
    const shared = {
      key,
      loading: busy?.id === user.id && busy.next === next,
      disabled: busy !== null,
      onPress: () => void run(user.id, next),
    }
    if (key === 'verify') {
      return {
        ...shared,
        label: t('verifications.verify'),
        icon: BadgeCheck,
        variant: 'brand' as const,
        flex: 1.4,
      }
    }
    return {
      ...shared,
      label: t(key === 'reject' ? 'verifications.reject' : 'verifications.revoke'),
      icon: key === 'reject' ? X : ShieldOff,
      variant: 'dangerSoft' as const,
    }
  }

  return (
    <WkListScreen
      testID="e2e-admin-verifications"
      list={list}
      title={t('verifications.title')}
      backHref="/admin/more"
      searchPlaceholder={t('verifications.search')}
      filters={[
        {
          value: 'REQUESTED',
          label: t('enums.verificationStatus.REQUESTED'),
          count: counts?.requested ?? null,
        },
        {
          value: 'VERIFIED',
          label: t('enums.verificationStatus.VERIFIED'),
          count: counts?.verified ?? null,
        },
        {
          value: 'UNVERIFIED',
          label: t('enums.verificationStatus.UNVERIFIED'),
          count: counts?.unverified ?? null,
        },
      ]}
      emptyIcon={ShieldCheck}
      emptyTitle={t(`verifications.empty.${filter}`)}
      emptyBody={filter === 'REQUESTED' ? t('verifications.emptyHint') : undefined}
      renderItem={(user) => {
        const name = userDisplayName(user)
        const status = user.verificationStatus ?? 'UNVERIFIED'
        const actions =
          status === 'REQUESTED'
            ? [action(user, 'verify'), action(user, 'reject')]
            : status === 'VERIFIED'
              ? [action(user, 'revoke')]
              : [action(user, 'verify')]
        return (
          <WkListRow
            media={
              <WkMedia
                photo={user.avatarImageUrl ?? null}
                photoKey={user.profile?.avatarUrl}
                name={name}
                round
                hero
              />
            }
            title={userDisplayLabel(user)}
            pill={{ label: enumLabel(t, 'verificationStatus', status), tone: TONE[status] }}
            sub={ltr(user.email)}
            subLtr
            sub2={shortDate(user.createdAt)}
            onPress={() => router.push(`/admin/users/${user.id}` as never)}
            actions={actions}
          />
        )
      }}
    />
  )
}
