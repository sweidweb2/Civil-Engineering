import { router } from 'expo-router'
import { Users } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { shortDate, USER_TONE } from '@/features/admin/ui'
import { usePagedList, WkListRow, WkListScreen, WkMedia } from '@/features/worker/ui/list'
import { enumLabel } from '@/i18n/labels'
import { cacheKeys } from '@/lib/cacheKeys'
import { ltr } from '@/lib/rtl'
import { userDisplayLabel, userDisplayName } from '@/lib/user'
import { listUsers } from '@/services/users'

const PAGE_SIZE = 20
const BASE = '/admin/users'

/** Admin "Users" tab. */
export function AdminUsersScreen() {
  const { t } = useTranslation()
  const list = usePagedList({
    cacheKeyPrefix: cacheKeys.users,
    fetcher: ({ page, query }) => listUsers(page, PAGE_SIZE, query || undefined, false),
  })

  return (
    <WkListScreen
      testID="e2e-admin-users"
      list={list}
      searchPlaceholder={t('users.search')}
      onAdd={() => router.push(`${BASE}/new` as never)}
      addLabel={t('users.new')}
      emptyIcon={Users}
      emptyTitle={t('users.empty')}
      renderItem={(user) => {
        const name = userDisplayName(user)
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
            pill={{ label: enumLabel(t, 'userStatus', user.status), tone: USER_TONE[user.status] }}
            sub={ltr(user.email)}
            subLtr
            sub2={[enumLabel(t, 'role', user.role), shortDate(user.createdAt)]
              .filter(Boolean)
              .join(' · ')}
            onPress={() => router.push(`${BASE}/${user.id}` as never)}
          />
        )
      }}
    />
  )
}
