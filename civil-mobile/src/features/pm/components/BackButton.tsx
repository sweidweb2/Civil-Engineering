import { router } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'

import { Pressable } from '@/components/ui/pressable'
import { colors } from '@/theme/colors'

export function BackButton({ fallbackHref }: { fallbackHref: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      className="size-9 items-center justify-center rounded-md"
      onPress={() => {
        if (router.canGoBack()) router.back()
        else router.replace(fallbackHref as never)
      }}
    >
      <ChevronLeft size={24} color={colors.light.text} />
    </Pressable>
  )
}
