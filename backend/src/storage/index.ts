import type { AppConfig } from '../config/index.js'
import { loadConfig, requireStorageConfig } from '../config/index.js'
import { createStorageService, type StorageService } from './storage.service.js'

export { resolvePublicOrPresignedUrl } from './image-url.js'
export { buildObjectKey, sanitizeOriginalName, storageEnvSegment } from './object-key.js'
export type { HeadObjectResult, StorageService } from './storage.service.js'
export { createStorageService } from './storage.service.js'

let storageSingleton: StorageService | null = null

/** Fail-closed stub when STORAGE_* env is missing (local/dev without R2). */
export function createUnavailableStorage(): StorageService {
  const fail = async () => {
    throw new Error('Storage is not configured (STORAGE_* env vars required)')
  }
  return {
    bucket: 'unconfigured',
    presignPut: fail,
    presignGet: fail,
    headObject: fail,
    putObject: fail,
    deleteObject: async () => undefined,
  }
}

/** Resolved storage, or the fail-closed stub when config has no storage block. */
export function getStorageOrUnavailable(
  config: AppConfig,
  storage?: StorageService,
): StorageService {
  if (storage) return storage
  return config.storage ? getStorageService(config) : createUnavailableStorage()
}

export function getStorageService(config: AppConfig = loadConfig()): StorageService {
  if (!storageSingleton) {
    storageSingleton = createStorageService(requireStorageConfig(config))
  }
  return storageSingleton
}

/** Test / DI hook — reset or inject a mock. */
export function setStorageServiceForTests(service: StorageService | null): void {
  storageSingleton = service
}
