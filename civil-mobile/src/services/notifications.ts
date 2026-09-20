import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'

import type { DevicePlatform } from '@/services/devices'
import * as devicesApi from '@/services/devices'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

let registeredPushToken: string | null = null

function resolvePlatform(): DevicePlatform {
  if (Platform.OS === 'ios') return 'IOS'
  if (Platform.OS === 'android') return 'ANDROID'
  return 'UNKNOWN'
}

function resolveProjectId(): string | undefined {
  const expoConfig = Constants.expoConfig as
    | { extra?: { eas?: { projectId?: string } } }
    | null
    | undefined
  const easConfig = (Constants as { easConfig?: { projectId?: string } }).easConfig
  return expoConfig?.extra?.eas?.projectId ?? easConfig?.projectId ?? undefined
}

function pathFromNotificationData(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null
  const path = data.path
  if (typeof path === 'string' && path.startsWith('/')) {
    return path
  }
  const url = data.url
  if (typeof url === 'string') {
    if (url.startsWith('/')) return url
    const scheme = 'civilmobile://'
    if (url.startsWith(scheme)) {
      const rest = url.slice(scheme.length)
      return rest.startsWith('/') ? rest : `/${rest}`
    }
  }
  return null
}

export function navigateFromNotificationData(data: Record<string, unknown> | undefined) {
  const path = pathFromNotificationData(data)
  if (path) {
    router.push(path as never)
  }
}

/**
 * Request permission, obtain Expo push token, register with API.
 * No-op on web / simulators without push support; never throws to callers.
 */
export async function registerPushForUser(accessToken: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return null
    }

    if (!Device.isDevice) {
      console.warn('[push] physical device required for remote push tokens')
      return null
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      })
    }

    const existing = await Notifications.getPermissionsAsync()
    let status = existing.status
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync()
      status = requested.status
    }
    if (status !== 'granted') {
      return null
    }

    const projectId = resolveProjectId()
    const tokenResult = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync()

    const token = tokenResult.data
    await devicesApi.registerDevice(accessToken, {
      token,
      platform: resolvePlatform(),
    })
    registeredPushToken = token
    return token
  } catch (error) {
    console.warn('[push] register failed', error)
    return null
  }
}

/** Best-effort unregister current device token with the API. */
export async function unregisterPushForUser(accessToken: string | null | undefined): Promise<void> {
  const token = registeredPushToken
  registeredPushToken = null
  if (!token || !accessToken) {
    return
  }
  try {
    await devicesApi.unregisterDevice(accessToken, token)
  } catch (error) {
    console.warn('[push] unregister failed', error)
  }
}

export function getRegisteredPushToken(): string | null {
  return registeredPushToken
}
