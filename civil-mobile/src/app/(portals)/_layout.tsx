import { Stack } from 'expo-router'

/**
 * Authenticated portal routes. Each child portal layout owns BottomNavigation.
 */
export default function PortalsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
