import { Text, View } from 'react-native'
import { Link } from 'expo-router'
import { useTranslation } from 'react-i18next'

import { StatusPill } from '@/components/kit'
import { Button, ButtonText } from '@/components/ui/button'
import { AuthShell } from '@/features/auth/AuthShell'
import { TYPE } from '@/theme/typography'

/** Shown after WORKER / PM register or login while status is PENDING. */
export function PendingApprovalScreen() {
  const { t } = useTranslation()

  return (
    <AuthShell
      compact
      testID="e2e-pending-approval"
      title={t('auth.pendingTitle')}
      subtitle={t('auth.pendingDescription')}
      footer={
        <Link href="/login" asChild>
          <Button variant="outline">
            <ButtonText>{t('auth.backToSignIn')}</ButtonText>
          </Button>
        </Link>
      }
    >
      <View
        className="items-start gap-2 rounded-xl border border-border bg-card p-5"
        accessibilityLabel={t('auth.pendingWaiting')}
      >
        <StatusPill label={t('auth.pendingBadge')} tone="warning" />
        <Text className={`${TYPE.bodyStrong} mt-1 text-foreground`}>
          {t('auth.pendingWaiting')}
        </Text>
        <Text className={`${TYPE.bodySm} text-muted-foreground`}>{t('auth.pendingHint')}</Text>
      </View>
    </AuthShell>
  )
}
