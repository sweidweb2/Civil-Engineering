import { Stack } from 'expo-router'

/** List → detail stack so back returns to the listings list. */
export default function ProviderListingsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
