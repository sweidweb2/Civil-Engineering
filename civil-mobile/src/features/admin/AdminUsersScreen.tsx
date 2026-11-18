import { Text } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'

import { Avatar, ListCard, ListScreen, StandardListRow, toneForStatus } from '@/components/kit'
import { useResourceList } from '@/hooks/useResourceList'
import { enumLabel } from '@/i18n/labels'
import { cacheKeys } from '@/lib/cacheKeys'
import { ltr } from '@/lib/rtl'
import { userDisplayName } from '@/lib/user'
import { listUsers } from '@/services/users'

const PAGE_SIZE = 20
const BASE = '/admin/users'

export function AdminUsersScreen() {
  const { t } = useTranslation()
  const { listProps } = useResourceList(
    ({ page, query }) => listUsers(page, PAGE_SIZE, query || undefined, false),
    { pageSize: PAGE_SIZE, cacheKeyPrefix: cacheKeys.users },
  )

  return (
    <ListScreen
      title={t('users.title')}
      searchPlaceholder={t('users.search')}
      addLabel={t('users.add')}
      onAdd={() => router.push(`${BASE}/new` as never)}
      keyExtractor={(item) => item.id}
      renderItem={(item) => (
        <ListCard
          accessibilityLabel={userDisplayName(item)}
          leading={<Avatar name={userDisplayName(item)} imageUrl={item.profile?.avatarUrl} />}
          onPress={() => router.push(`${BASE}/${item.id}` as never)}
        >
          <StandardListRow
            title={userDisplayName(item)}
            statusLabel={enumLabel(t, 'userStatus', item.status)}
            statusTone={toneForStatus(item.status)}
            subtitle={ltr(item.email)}
            extra={
              <Text className="text-xs font-semibold text-primary">
                {enumLabel(t, 'role', item.role)}
              </Text>
            }
          />
        </ListCard>
      )}
      loadingLabel={t('users.loading')}
      emptyTitle={t('users.empty')}
      {...listProps}
    />
  )
}
