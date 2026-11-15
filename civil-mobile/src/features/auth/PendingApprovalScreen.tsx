import { Text, View } from 'react-native'
import { Link } from 'expo-router'
import { useTranslation } from 'react-i18next'

import { Header } from '@/components/layout/Header'
import { Button, ButtonText } from '@/components/ui/button'
import { Pressable } from '@/components/ui/pressable'
import { Skeleton, SkeletonText } from '@/components/ui/skeleton'

/** Shown after WORKER / PM register or login while status is PENDING. */
export function PendingApprovalScreen() {
  const { t } = useTranslation()

  return (
    <View className="flex-1 bg-background" testID="e2e-pending-approval">
      <Header title={t('auth.pendingTitle')} />
      <View className="gap-5 px-5 py-8">
        <View className="gap-2">
          <Text className="text-xl font-bold text-foreground">{t('auth.pendingTitle')}</Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            {t('auth.pendingDescription')}
          </Text>
        </View>

        <View
          className="gap-3 rounded-3xl border border-border/60 bg-card p-4"
          accessibilityRole="progressbar"
          accessibilityLabel={t('auth.pendingWaiting')}
        >
          <Skeleton className="h-4 w-2/3 rounded-full" />
          <Skeleton className="h-4 w-1/2 rounded-full" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <SkeletonText _lines={3} className="h-3" />
        </View>

        <Text className="text-center text-sm text-muted-foreground">{t('auth.pendingHint')}</Text>

        <Link href="/login" asChild>
          <Pressable>
            <Button variant="outline">
              <ButtonText>{t('auth.backToSignIn')}</ButtonText>
            </Button>
          </Pressable>
        </Link>
      </View>
    </View>
  )
}
