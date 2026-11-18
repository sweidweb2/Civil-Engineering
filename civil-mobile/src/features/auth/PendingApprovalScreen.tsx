import { Text, View } from 'react-native'
import { Link } from 'expo-router'
import { Hourglass, ShieldCheck } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { Button, ButtonText } from '@/components/ui/button'
import { Pressable } from '@/components/ui/pressable'
import { AuthShell } from '@/features/auth/AuthShell'
import { useThemeColors } from '@/hooks/useThemeColors'
import { glow } from '@/theme/shadows'

/** Shown after WORKER / PM register or login while status is PENDING. */
export function PendingApprovalScreen() {
  const { t } = useTranslation()
  const colors = useThemeColors()

  return (
    <AuthShell
      compact
      testID="e2e-pending-approval"
      title={t('auth.pendingTitle')}
      subtitle={t('auth.pendingDescription')}
    >
      <View
        className="items-center gap-4 rounded-2xl border border-border/40 bg-card p-6"
        accessibilityRole="progressbar"
        accessibilityLabel={t('auth.pendingWaiting')}
      >
        <View className="size-28 items-center justify-center rounded-full bg-warning/10">
          <View
            className="size-20 items-center justify-center rounded-full bg-card"
            style={glow(colors.warning, 0.3)}
          >
            <Hourglass size={34} color={colors.warning} />
          </View>
        </View>
        <View className="flex-row items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1">
          <ShieldCheck size={14} color={colors.warning} />
          <Text className="text-xs font-bold text-warning">{t('auth.pendingBadge')}</Text>
        </View>
        <Text className="text-center text-base font-semibold text-foreground">
          {t('auth.pendingWaiting')}
        </Text>
        <Text className="text-center text-sm leading-5 text-muted-foreground">
          {t('auth.pendingHint')}
        </Text>
      </View>

      <Link href="/login" asChild>
        <Pressable>
          <Button variant="outline" size="lg" pointerEvents="none">
            <ButtonText>{t('auth.backToSignIn')}</ButtonText>
          </Button>
        </Pressable>
      </Link>
    </AuthShell>
  )
}
