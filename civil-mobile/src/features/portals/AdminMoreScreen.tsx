import { Text, View } from 'react-native'
import { router } from 'expo-router'

import { Header } from '@/components/layout/Header'
import { ScreenContainer } from '@/components/layout/ScreenContainer'
import { Pressable } from '@/components/ui/pressable'
import { ADMIN_MORE_LINKS } from '@/navigation'
import { colors } from '@/theme/colors'

export function AdminMoreScreen() {
  return (
    <View className="flex-1 bg-background">
      <Header title="More" />
      <ScreenContainer>
        <Text className="mb-3 text-sm text-muted-foreground">Additional admin pages.</Text>
        <View className="gap-1">
          {ADMIN_MORE_LINKS.map((item) => {
            const Icon = item.icon
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                className="flex-row items-center gap-3 rounded-md border border-border bg-background px-3 py-3"
                onPress={() => router.push(item.href as never)}
              >
                <Icon size={20} color={colors.light.textMuted} />
                <Text className="text-base text-foreground">{item.label}</Text>
              </Pressable>
            )
          })}
        </View>
      </ScreenContainer>
    </View>
  )
}
