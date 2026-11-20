import { useSyncExternalStore } from 'react'

/**
 * Device connectivity as the rest of the app sees it (docs/caching-plan.md, Phase 5).
 *
 * Fed by `useConnectivityWatch` (expo-network). "Offline" means the OS reports **no
 * network at all** (`isConnected === false`). `isInternetReachable` is not used: it is
 * a copy of `isConnected` on iOS and flickers on Android while networks switch, and a
 * false "offline" would wrongly block saves.
 *
 * Plain module state (not Zustand) because the API client reads it outside React.
 */

let offline = false
const listeners = new Set<() => void>()

export function isOffline() {
  return offline
}

export function setOffline(next: boolean) {
  if (next === offline) return
  offline = next
  for (const listener of [...listeners]) listener()
}

export function subscribeConnectivity(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** React hook: true while the device has no network connection. */
export function useIsOffline() {
  return useSyncExternalStore(subscribeConnectivity, isOffline, isOffline)
}
