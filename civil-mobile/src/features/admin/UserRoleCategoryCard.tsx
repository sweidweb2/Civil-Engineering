import { Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'

import { Pressable } from '@/components/ui/pressable'
import { UserRoleIsoArt } from '@/features/admin/UserRoleIsoArt'
import { useWkPalette } from '@/components/wk/palette'
import { enumLabel } from '@/i18n/labels'
import type { AuthRole } from '@/services/auth'

/** Two-column role card for the admin users browse hub. */
export function UserRoleCategoryCard({
  role,
  count,
  onPress,
}: {
  role: AuthRole
  count: number
  onPress: () => void
}) {
  const { t } = useTranslation()
  const { shadow } = useWkPalette()
  const label = enumLabel(t, 'role', role)

  return (
    <View className="flex-1">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        className="flex-1 overflow-hidden rounded-[20px] bg-wk-sf active:opacity-90"
        style={shadow}
      >
        <UserRoleIsoArt role={role} />
        <View className="gap-1 px-3 pb-3.5 pt-2.5">
          <Text
            className="min-h-[34px] text-[13px] font-semibold leading-[17px] text-wk-ink"
            numberOfLines={2}
          >
            {label}
          </Text>
          <Text className="text-[11px] text-wk-ink3" numberOfLines={1}>
            {t('users.roleCategory')}
          </Text>
          <Text className="text-[12px] font-medium text-wk-brand" numberOfLines={1}>
            {t('users.userCount', { count })}
          </Text>
        </View>
      </Pressable>
    </View>
  )
}
