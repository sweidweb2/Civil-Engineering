import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

const STORAGE_KEY = 'civil-device-id'

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

async function readStored(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null
    } catch {
      return null
    }
  }
  try {
    return await SecureStore.getItemAsync(STORAGE_KEY)
  } catch {
    return null
  }
}

async function writeStored(id: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, id)
    } catch {
      // Ignore quota / private mode.
    }
    return
  }
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, id)
  } catch {
    // Ignore secure-store failures; caller still has an in-memory id for this session.
  }
}

/** Stable per-install device fingerprint used for register abuse limits. */
export async function getDeviceId(): Promise<string> {
  const existing = await readStored()
  if (existing && existing.length >= 8) return existing
  const id = createId()
  await writeStored(id)
  return id
}
