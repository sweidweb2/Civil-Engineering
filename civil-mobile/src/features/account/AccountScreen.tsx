import { useState } from 'react'
import { Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'

import { Avatar, FormScroll, ScreenHeader, SegmentedControl } from '@/components/kit'
import { AccountDetailsForm, LogoutRow, PasswordForm } from '@/features/account/AccountForms'
import { LanguagePicker } from '@/features/account/LanguagePicker'
import { ThemePicker } from '@/features/account/ThemePicker'
import { enumLabel } from '@/i18n/labels'
import { ltr } from '@/lib/rtl'
import { userDisplayName } from '@/lib/user'
import { useAuthStore } from '@/stores/authStore'

type AccountScreenProps = {
  /** Set when the screen is pushed (not a tab), to show a back button. */
  backHref?: string
}

/** The signed-in user's own account: details, password and log out. */
export function AccountScreen({ backHref }: AccountScreenProps) {
  const { t } = useTranslation()
  const TABS = [
    { value: 'details', label: t('profile.account') },
    { value: 'security', label: t('profile.security') },
  ]
  const user = useAuthStore((s) => s.user)
  const [tab, setTab] = useState('details')
  const name = user ? userDisplayName(user) : t('account.title')

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title={t('account.title')} backHref={backHref}>
        <View className="items-center gap-3 pb-1 pt-2">
          <Avatar name={name} size={84} />
          <View className="items-center">
            <Text className="text-xl font-bold text-foreground" numberOfLines={1}>
              {name}
            </Text>
            <Text className="text-sm text-muted-foreground" numberOfLines={1}>
              {user ? `${enumLabel(t, 'role', user.role)} · ${ltr(user.email)}` : ''}
            </Text>
          </View>
        </View>
      </ScreenHeader>

      <FormScroll>
        <View className="pt-2">
          <SegmentedControl options={TABS} value={tab} onChange={setTab} />
        </View>
        {tab === 'details' ? <AccountDetailsForm /> : <PasswordForm />}
        <ThemePicker />
        <LanguagePicker />
        <LogoutRow />
      </FormScroll>
    </View>
  )
}
