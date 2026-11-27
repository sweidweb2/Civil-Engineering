import { type ReactNode, useState } from 'react'
import { Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'

import { MyAvatarPhoto } from '@/features/account/MyAvatarPhoto'
import { WkBodyScroll, WkCard, WkTabScroll, WkTopBar } from '@/components/wk/kit'
import {
  WkAccountDetailsCard,
  WkPasswordCard,
  WkPreferences,
  WkSegmented,
} from '@/components/wk/settings'
import { enumLabel } from '@/i18n/labels'
import { ltr } from '@/lib/rtl'
import { initialsOf, userDisplayName } from '@/lib/user'
import { useAuthStore } from '@/stores/authStore'

/**
 * Account screen on the green palette: identity card, details / security
 * tabs, appearance, language, log out. A tab in the worker and PM portals;
 * admin opens it from More, so `backHref` gives it a back header instead.
 */
export function WorkerAccountScreen({
  testID = 'e2e-worker-account',
  backHref,
  extra,
}: {
  testID?: string
  backHref?: string
  /** Portal-specific rows shown under the identity card (e.g. PM professional profile). */
  extra?: ReactNode
}) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'details' | 'security'>('details')
  const user = useAuthStore((s) => s.user)
  const name = user ? userDisplayName(user) : t('account.title')

  const body = (
    <>
      {/* Identity */}
      <WkCard className="flex-row items-center gap-3.5 rounded-[26px] p-5">
        <View className="size-14 items-center justify-center overflow-hidden rounded-full bg-wk-hero">
          <Text className="text-[19px] font-semibold text-wk-lime">{initialsOf(name)}</Text>
          <MyAvatarPhoto />
        </View>
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-[17px] font-semibold text-wk-ink" numberOfLines={1}>
            {name}
          </Text>
          {user ? (
            <Text className="text-[13px] text-wk-ink2" numberOfLines={1}>
              {enumLabel(t, 'role', user.role)} · {ltr(user.email)}
            </Text>
          ) : null}
        </View>
      </WkCard>

      {extra}

      <WkSegmented
        options={[
          { value: 'details', label: t('profile.account') },
          { value: 'security', label: t('profile.security') },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'details' ? <WkAccountDetailsCard /> : <WkPasswordCard />}

      <WkPreferences />
    </>
  )

  return backHref ? (
    <View className="flex-1 bg-wk-bg" testID={testID}>
      <WkTopBar title={t('account.title')} backHref={backHref} />
      <WkBodyScroll gap="gap-4">{body}</WkBodyScroll>
    </View>
  ) : (
    <WkTabScroll testID={testID}>{body}</WkTabScroll>
  )
}
