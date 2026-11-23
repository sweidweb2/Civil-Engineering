import { Text, View } from 'react-native'
import { router } from 'expo-router'

import { AuthLocaleGate } from '@/features/auth/AuthLocaleGate'
import { AuthShell } from '@/features/auth/AuthShell'
import { useAuthTranslation } from '@/features/auth/useAuthTranslation'

import { AuthButton, AuthTimeline } from './ui'

/** Shown after WORKER / PM register or login while status is PENDING. */
export function PendingApprovalScreen() {
  const { t } = useAuthTranslation()

  return (
    <AuthLocaleGate>
      <AuthShell
        testID="e2e-pending-approval"
        title={t('auth.pendingTitle')}
        subtitle={t('auth.pendingWaiting')}
      >
        <View className="gap-1.5" accessibilityLabel={t('auth.pendingWaiting')}>
          <Text
            className="text-[20px] font-semibold leading-[26px] text-wk-ink"
            accessibilityRole="header"
          >
            {t('auth.pendingBadge')}
          </Text>
          <Text className="text-[14px] leading-[20px] text-wk-ink2">
            {t('auth.pendingDescription')}
          </Text>
        </View>

        <AuthTimeline
          liveLabel={t('auth.statusLive')}
          steps={[
            {
              title: t('auth.timelineCreated'),
              subtitle: t('auth.timelineCreatedSub'),
              state: 'done',
            },
            {
              title: t('auth.timelineReview'),
              subtitle: t('auth.timelineReviewSub'),
              state: 'active',
            },
            {
              title: t('auth.timelineAccess'),
              subtitle: t('auth.timelineAccessSub'),
              state: 'upcoming',
            },
          ]}
        />

        <View className="gap-3">
          <Text className="text-[13px] leading-[18px] text-wk-ink3">{t('auth.pendingHint')}</Text>
          <AuthButton
            variant="soft"
            arrow={false}
            label={t('auth.backToSignIn')}
            onPress={() => router.replace('/login' as never)}
          />
        </View>
      </AuthShell>
    </AuthLocaleGate>
  )
}
