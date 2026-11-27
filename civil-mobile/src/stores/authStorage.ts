import * as SecureStore from 'expo-secure-store'

/** Prefer device-bound keychain; unavailable after restore onto another device. */
const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
}

/** Native token storage — SecureStore. */
export const authStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value, SECURE_OPTIONS),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
}
