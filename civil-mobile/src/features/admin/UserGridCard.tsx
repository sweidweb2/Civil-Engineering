import { Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'

import { WkGridCard } from '@/components/wk/GridCard'
import { WkPill } from '@/components/wk/kit'
import { WkMedia } from '@/components/wk/list'
import { shortDate, USER_TONE } from '@/features/admin/ui'
import { enumLabel } from '@/i18n/labels'
import { ltr } from '@/lib/rtl'
import { userDisplayLabel, userDisplayName } from '@/lib/user'
import type { User } from '@/services/users'

/** Two-column user card for an admin role directory grid. */
export function UserGridCard({ user, onPress }: { user: User; onPress: () => void }) {
  const { t } = useTranslation()
  const name = userDisplayName(user)
  const label = userDisplayLabel(user)

  return (
    <WkGridCard
      onPress={onPress}
      accessibilityLabel={label}
      mediaClassName="items-center justify-center"
      media={
        <>
          <WkMedia
            photo={user.avatarImageUrl ?? null}
            photoKey={user.profile?.avatarUrl}
            name={name}
            round
            hero
            size={88}
          />
          <View className="absolute end-2 top-2">
            <WkPill label={enumLabel(t, 'userStatus', user.status)} tone={USER_TONE[user.status]} />
          </View>
        </>
      }
    >
      <Text
        className="min-h-[34px] text-[13px] font-semibold leading-[17px] text-wk-ink"
        numberOfLines={2}
      >
        {label}
      </Text>
      <Text
        className="text-[11px] text-wk-ink3"
        numberOfLines={1}
        style={{ writingDirection: 'ltr' }}
      >
        {ltr(user.email)}
      </Text>
      <Text className="text-[12px] font-medium text-wk-brand" numberOfLines={1}>
        {shortDate(user.createdAt)}
      </Text>
    </WkGridCard>
  )
}
