import { router } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'

import { IconButton } from '@/components/kit'

export function BackButton({ fallbackHref }: { fallbackHref: string }) {
  return (
    <IconButton
      icon={ChevronLeft}
      label="Go back"
      onPress={() => {
        if (router.canGoBack()) router.back()
        else router.replace(fallbackHref as never)
      }}
    />
  )
}
