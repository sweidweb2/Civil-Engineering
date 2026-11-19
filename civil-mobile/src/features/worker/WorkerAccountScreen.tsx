import { useState } from 'react'
import { Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'

import { WkCard, WkTabScroll } from '@/features/worker/ui/kit'
import {
  WkAccountDetailsCard,
  WkPasswordCard,
  WkPreferences,
  WkSegmented,
} from '@/features/worker/ui/settings'
import { enumLabel } from '@/i18n/labels'
import { ltr } from '@/lib/rtl'
import { initialsOf, userDisplayName } from '@/lib/user'
import { useAuthStore } from '@/stores/authStore'

/** Worker-portal account: details / security tabs, appearance, language, log out. */
export function WorkerAccountScreen() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'details' | 'security'>('details')
  const user = useAuthStore((s) => s.user)
  const name = user ? userDisplayName(user) : t('account.title')

  return (
    <WkTabScroll testID="e2e-worker-account">
      {/* Identity */}
      <WkCard className="flex-row items-center gap-3.5 rounded-[26px] p-5">
        <View className="size-14 items-center justify-center rounded-full bg-wk-hero">
          <Text className="text-[19px] font-semibold text-wk-lime">{initialsOf(name)}</Text>
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
    </WkTabScroll>
  )
}
