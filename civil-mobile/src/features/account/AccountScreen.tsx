import { useState } from 'react'
import { Text, View } from 'react-native'

import { Avatar, FormScroll, HeroHeader, SegmentedControl } from '@/components/kit'
import { AccountDetailsForm, LogoutRow, PasswordForm } from '@/features/account/AccountForms'
import { roleLabel, userDisplayName } from '@/lib/user'
import { useAuthStore } from '@/stores/authStore'

const TABS = [
  { value: 'details', label: 'Details' },
  { value: 'security', label: 'Security' },
]

type AccountScreenProps = {
  /** Set when the screen is pushed (not a tab), to show a back button. */
  backHref?: string
}

/** The signed-in user's own account: details, password and log out. */
export function AccountScreen({ backHref }: AccountScreenProps) {
  const user = useAuthStore((s) => s.user)
  const [tab, setTab] = useState('details')
  const name = user ? userDisplayName(user) : 'Account'

  return (
    <View className="flex-1 bg-background">
      <HeroHeader title="Account" backHref={backHref}>
        <View className="flex-row items-center gap-3">
          <Avatar name={name} size={56} onHero />
          <View className="min-w-0 flex-1">
            <Text className="text-lg font-bold text-hero-foreground" numberOfLines={1}>
              {name}
            </Text>
            <Text className="text-sm text-hero-foreground/75" numberOfLines={1}>
              {user ? `${roleLabel(user.role)} · ${user.email}` : ''}
            </Text>
          </View>
        </View>
      </HeroHeader>

      <FormScroll>
        <View className="pt-2">
          <SegmentedControl options={TABS} value={tab} onChange={setTab} />
        </View>
        {tab === 'details' ? <AccountDetailsForm /> : <PasswordForm />}
        <LogoutRow />
      </FormScroll>
    </View>
  )
}
