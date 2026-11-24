import '../../global.css'
// Bind auth session → API refresh before any feature requests
import '@/i18n'
import '@/stores/authStore'

import { useEffect } from 'react'
import { Text, TextInput, View } from 'react-native'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { NotoSansArabic_400Regular } from '@expo-google-fonts/noto-sans-arabic/400Regular'
import { NotoSansArabic_500Medium } from '@expo-google-fonts/noto-sans-arabic/500Medium'
import { NotoSansArabic_600SemiBold } from '@expo-google-fonts/noto-sans-arabic/600SemiBold'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AppAlertHost } from '@/components/feedback/AppAlertHost'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider'
import { useConnectivityWatch } from '@/hooks/useConnectivityWatch'
import { useForegroundRevalidate } from '@/hooks/useForegroundRevalidate'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useSessionUserSync } from '@/hooks/useSessionUserSync'
import { seedLanguageFromDevice, useLanguageStore } from '@/stores/languageStore'
import { useThemeStore } from '@/stores/themeStore'
import { arabicDefaultTextStyle } from '@/theme/typography'

void SplashScreen.preventAutoHideAsync()
void seedLanguageFromDevice()

function PushNotificationsBridge() {
  usePushNotifications()
  return null
}

/**
 * App foreground / session restore: refresh stale data on open screens, and re-read
 * the signed-in user so role or status changes made elsewhere reach this device.
 */
function ForegroundRevalidateBridge() {
  useForegroundRevalidate()
  useSessionUserSync()
  useConnectivityWatch()
  return null
}

/** Applies Noto Sans Arabic as the default Text face when Arabic is active. */
function applyArabicTextDefaults(isArabic: boolean) {
  const style = isArabic ? arabicDefaultTextStyle() : undefined
  // React Native still honors defaultProps for Text/TextInput style merge.

  ;(Text as any).defaultProps = { ...(Text as any).defaultProps, style }

  ;(TextInput as any).defaultProps = { ...(TextInput as any).defaultProps, style }
}

export default function RootLayout() {
  const themeMode = useThemeStore((s) => s.mode)
  const language = useLanguageStore((s) => s.language)
  const [fontsLoaded, fontError] = useFonts({
    NotoSansArabic_400Regular,
    NotoSansArabic_500Medium,
    NotoSansArabic_600SemiBold,
  })

  useEffect(() => {
    if (fontsLoaded || fontError) {
      applyArabicTextDefaults(language === 'ar')
      void SplashScreen.hideAsync()
    }
  }, [fontsLoaded, fontError, language])

  if (!fontsLoaded && !fontError) return null

  // `direction` flips Yoga layout for the whole tree without waiting on a native
  // I18nManager restart (Expo Go JS reload alone is often not enough).
  const layoutDirection = language === 'ar' ? 'rtl' : 'ltr'

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, direction: layoutDirection }} collapsable={false}>
        <GluestackUIProvider mode={themeMode}>
          <ErrorBoundary>
            <PushNotificationsBridge />
            <ForegroundRevalidateBridge />
            <Stack screenOptions={{ headerShown: false }} />
            <AppAlertHost />
          </ErrorBoundary>
        </GluestackUIProvider>
      </View>
    </SafeAreaProvider>
  )
}
