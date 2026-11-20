import { useEffect } from 'react'
import * as Network from 'expo-network'

import { remoteCacheRevalidate } from '@/lib/remoteCache'
import { isOffline, setOffline } from '@/services/connectivity'
import { useAuthStore } from '@/stores/authStore'

function offlineFrom(state: Network.NetworkState) {
  // Only a definite "no network" counts (see services/connectivity.ts).
  return state.isConnected === false
}

/**
 * Track connectivity for the whole app and, when the connection comes back, ask
 * open screens to refetch anything that is not fresh (screens showing saved offline
 * data have no fresh entry, so they reload). Mount once, in the root layout.
 */
export function useConnectivityWatch() {
  useEffect(() => {
    let active = true
    Network.getNetworkStateAsync()
      .then((state) => {
        if (active) setOffline(offlineFrom(state))
      })
      .catch(() => undefined)

    const subscription = Network.addNetworkStateListener((state) => {
      const wasOffline = isOffline()
      const nowOffline = offlineFrom(state)
      setOffline(nowOffline)
      if (wasOffline && !nowOffline && useAuthStore.getState().tokens) remoteCacheRevalidate()
    })
    return () => {
      active = false
      subscription.remove()
    }
  }, [])
}
