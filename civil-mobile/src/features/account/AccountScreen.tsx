import { useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'

import { FormScroll, IdentityBlock, ScreenHeader, SegmentedControl } from '@/components/kit'
import { LogoutRow } from '@/components/LogoutButton'
import { AccountDetailsForm, PasswordForm } from '@/features/account/AccountForms'
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
      <ScreenHeader title={t('account.title')} backHref={backHref} />

      <FormScroll>
        <IdentityBlock
          name={name}
          detail={user ? `${enumLabel(t, 'role', user.role)} · ${ltr(user.email)}` : undefined}
        />
        <SegmentedControl options={TABS} value={tab} onChange={setTab} />
        {tab === 'details' ? <AccountDetailsForm /> : <PasswordForm />}
        <ThemePicker />
        <LanguagePicker />
        <LogoutRow />
      </FormScroll>
    </View>
  )
}
