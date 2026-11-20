import { Text, View } from 'react-native'
import { WifiOff } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useIsOffline } from '@/services/connectivity'

/**
 * Small pill at the top of portal screens while the device has no network. Screens
 * keep working from cached / saved data; saves fail fast with an "offline" message.
 */
export function OfflineBanner() {
  const { t } = useTranslation()
  const offline = useIsOffline()
  const insets = useSafeAreaInsets()
  if (!offline) return null
  return (
    <View
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className="absolute inset-x-0 items-center"
      style={{ top: insets.top + 6, zIndex: 50 }}
    >
      <View className="flex-row items-center gap-2 rounded-full bg-wk-hero px-3.5 py-2">
        <WifiOff size={14} color="#FFFFFF" strokeWidth={2} />
        <Text className="text-[13px] font-medium text-white">{t('offline.banner')}</Text>
      </View>
    </View>
  )
}
